import fs from 'fs/promises';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'suspend.json');

async function load() {
    try {
        await fs.mkdir(path.dirname(FILE), { recursive: true });
        const raw = await fs.readFile(FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

async function save(data) {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function norm(jid = '') {
    return String(jid).split(':')[0];
}

export async function setSuspend(groupId, userId, untilTs) {
    const data = await load();
    if (!data[groupId]) data[groupId] = {};
    data[groupId][norm(userId)] = untilTs;
    await save(data);
}

export async function clearSuspend(groupId, userId) {
    const data = await load();
    if (!data[groupId]) return;
    delete data[groupId][norm(userId)];
    if (!Object.keys(data[groupId]).length) delete data[groupId];
    await save(data);
}

export async function isSuspended(groupId, userId) {
    const data = await load();
    const ts = data?.[groupId]?.[norm(userId)];
    if (!ts) return false;
    if (Date.now() > ts) {
        await clearSuspend(groupId, userId);
        return false;
    }
    return true;
}

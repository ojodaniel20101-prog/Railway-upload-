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

// userId here is already a plain phone number string e.g. "2348012345678"
export async function setSuspend(groupId, userId, untilTs) {
    const data = await load();
    if (!data[groupId]) data[groupId] = {};
    data[groupId][userId] = untilTs;
    await save(data);
}

export async function clearSuspend(groupId, userId) {
    const data = await load();
    if (!data[groupId]) return;
    delete data[groupId][userId];
    if (!Object.keys(data[groupId]).length) delete data[groupId];
    await save(data);
}

export async function isSuspended(groupId, userId) {
    const data = await load();
    const ts = data?.[groupId]?.[userId];
    if (!ts) return false;
    if (Date.now() > ts) {
        await clearSuspend(groupId, userId);
        return false;
    }
    return true;
}

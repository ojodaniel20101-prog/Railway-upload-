import { setSuspend, clearSuspend } from '../../utils/suspendStore.js';
import { resolveTarget } from '../../utils/targetResolver.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

function parseDurationMs(text) {
    const cleaned = String(text || '').trim().toLowerCase();
    const match = cleaned.match(/^(\d+)\s*([a-z]+)?$/i);
    if (!match) return null;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = match[2] || 'm';
    if (/^(s|sec|secs|second|seconds)$/.test(unit)) return n * 1000;
    if (/^(m|min|mins|minute|minutes)$/.test(unit)) return n * 60 * 1000;
    if (/^(h|hr|hrs|hour|hours)$/.test(unit)) return n * 60 * 60 * 1000;
    if (/^(d|day|days)$/.test(unit)) return n * 24 * 60 * 60 * 1000;
    if (/^(w|wk|week|weeks)$/.test(unit)) return n * 7 * 24 * 60 * 60 * 1000;
    return null;
}

export default {
    name: 'suspend',
    aliases: ['tempsilence'],
    category: 'admin',
    description: 'Temporarily delete a user messages in group for specified time',
    usage: 'suspend @user 30m | suspend @user stop',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, msg, args }) {
        const jid = msg.key.remoteJid;

        // Resolve target JID via mention or reply
        let targetJid = resolveTarget(msg);

        // Fallback: extract number from args[0]
        if (!targetJid && args[0]) {
            const num = args[0].replace(/[^0-9]/g, '');
            if (num) targetJid = num + '@s.whatsapp.net';
        }

        if (!targetJid) {
            return await sock.sendMessage(jid, { text: '❌ Mention or reply to a user.' }, { quoted: msg });
        }

        // Always store as plain phone number — matches how messageHandler reads senderNumber
        const targetNumber = normalizeJidToNumber(targetJid, sock);

        if (!targetNumber) {
            return await sock.sendMessage(jid, { text: '❌ Could not resolve user number.' }, { quoted: msg });
        }

        const action = args.slice(1).join(' ').trim().toLowerCase();

        if (!action) {
            return await sock.sendMessage(jid, { text: '❌ Provide a duration. Example: suspend @user 30m' }, { quoted: msg });
        }

        if (action === 'stop') {
            await clearSuspend(jid, targetNumber);
            return await sock.sendMessage(jid, {
                text: `✅ Suspension stopped for @${targetNumber}`,
                mentions: [targetJid]
            }, { quoted: msg });
        }

        const durationMs = parseDurationMs(action);
        if (!durationMs || durationMs < 1_000) {
            return await sock.sendMessage(jid, { text: '❌ Invalid duration. Examples: 30s, 15m, 2h, 1d, 1w.' }, { quoted: msg });
        }

        const until = Date.now() + durationMs;
        await setSuspend(jid, targetNumber, until);

        await sock.sendMessage(jid, {
            text: `✅ Suspended @${targetNumber} for ${action}. Their messages will be deleted until time ends or you run suspend @user stop.`,
            mentions: [targetJid]
        }, { quoted: msg });
    }
};

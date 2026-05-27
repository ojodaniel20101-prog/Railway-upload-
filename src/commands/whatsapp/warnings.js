/**
 * .warnings command — Checks the warning count for a user.
 * Supports: @mention, reply to a message, or self-check.
 */

import { getChatSettings } from '../../services/databaseService.js';
import { resolveTarget } from '../../utils/targetResolver.js';

export default {
  execute: async ({ sock, msg, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    // Try to resolve target, fall back to the sender themselves
    const target = resolveTarget(msg) || msg.key.participant || msg.key.remoteJid;

    const settings = getChatSettings(phoneNumber, jid);
    const count = settings.warnings[target] || 0;
    const maxWarnings = 3;

    let statusEmoji = '🟢';
    if (count >= 2) statusEmoji = '🔴';
    else if (count >= 1) statusEmoji = '🟡';

    await sock.sendMessage(jid, {
      text: `${statusEmoji} *Warning Status*\n\nUser: @${target.split('@')[0]}\nWarnings: ${count}/${maxWarnings}\n${count >= maxWarnings ? '⚠️ User will be kicked on next violation!' : count === 0 ? '✅ Clean record.' : `⚠️ ${maxWarnings - count} warning(s) remaining before kick.`}`,
      mentions: [target]
    });
  }
};

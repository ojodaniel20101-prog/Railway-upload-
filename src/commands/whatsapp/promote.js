/**
 * .promote command — Promotes a user to group admin.
 * Supports: @mention or reply to a message.
 */

import moderationService from '../../services/moderationService.js';
import { resolveAllTargets } from '../../utils/targetResolver.js';

export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const targets = resolveAllTargets(msg);

    if (targets.length === 0) {
      throw new Error('⚠️ Usage: .promote @user  OR  reply to their message with .promote');
    }

    await moderationService.promote(sock, jid, targets);

    const names = targets.map(t => `@${t.split('@')[0]}`).join(', ');
    await sock.sendMessage(jid, {
      text: `⬆️ ${names} has been promoted to admin.`,
      mentions: targets
    });
  }
};

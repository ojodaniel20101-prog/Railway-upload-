/**
 * .warn command — Issues a warning to a user.
 * Supports: @mention or reply to a message.
 * At 3 warnings, the user is automatically kicked.
 */

import moderationService from '../../services/moderationService.js';
import { resolveTarget } from '../../utils/targetResolver.js';

export default {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const target = resolveTarget(msg);

    if (!target) {
      throw new Error('⚠️ Usage: .warn @user  OR  reply to their message with .warn');
    }

    const reason = args.join(' ') || 'No reason specified';
    const warningMessage = await moderationService.warn(sock, jid, target, reason);
    await sock.sendMessage(jid, { text: warningMessage, mentions: [target] });
  }
};

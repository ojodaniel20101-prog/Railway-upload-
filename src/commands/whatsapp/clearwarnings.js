/**
 * .clearwarnings command — Clears all warnings for a user.
 * Supports: @mention or reply to a message.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';
import { resolveTarget } from '../../utils/targetResolver.js';

export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const target = resolveTarget(msg);

    if (!target) {
      throw new Error('⚠️ Usage: .clearwarnings @user  OR  reply to their message with .clearwarnings');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const previousCount = settings.warnings[target] || 0;
    delete settings.warnings[target];
    updateChatSettings(phoneNumber, jid, settings);

    await sock.sendMessage(jid, {
      text: `✅ Cleared ${previousCount} warning(s) for @${target.split('@')[0]}.`,
      mentions: [target]
    });
  }
};

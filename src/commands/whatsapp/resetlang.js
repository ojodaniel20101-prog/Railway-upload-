/**
 * resetlang.js — Reset language back to English (default).
 * ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV
 *
 * Usage: .resetlang
 * Clears the user's language preference and resets menu to English.
 */

import { clearUserLang, clearMenuCache, getPrefixForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

export default {
  name: 'resetlang',
  description: 'Reset bot language back to English (default)',
  category: 'general',
  roleRequired: 'owner',

  execute: async ({ sock, msg, isOwner }) => {
    const jid = msg.key.remoteJid;

    if (!isOwner) {
      return await sock.sendMessage(jid, {
        text: `⛔ *Owner Only Command*\n\nOnly the paired bot owner can use *.resetlang*`
      }, { quoted: msg });
    }

    const userId    = msg.key.participant || msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix    = getPrefixForSession(botNumber);

    // Clear user language preference
    clearUserLang(userId, botNumber);

    // Clear cached menu for English so it rebuilds cleanly
    try { clearMenuCache('en'); } catch (_) {}

    logger.info(`[ResetLang] User ${userId} reset language to English (default)`);

    await sock.sendMessage(jid, {
      text: [
        `✅ *Language Reset to Default*`,
        ``,
        `📍 Language: *English* (default)`,
        `🌐 All bot replies and menu are back to English.`,
        ``,
        `_Use \`${prefix}setlang <code>\` to set a new language anytime._`,
      ].join('\n')
    }, { quoted: msg });

    try { await sock.sendMessage(jid, { react: { text: '🌐', key: msg.key } }); } catch (_) {}
  }
};

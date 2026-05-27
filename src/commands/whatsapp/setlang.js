/**
 * setlang.js — Per-User Language Preference for ZENTRIX MD BY ZENTRIX TECH.
 * Each user sets their own language. Bot replies & menu are translated.
 * Uses popcat.xyz translate API (same as .translate command).
 * Menu is translated once and cached — instant on every .menu after that.
 */

import { getUserLang, setUserLang, clearUserLang, clearMenuCache } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import { getPrefixForSession }  from '../../services/databaseService.js';
import { translateText }        from '../../utils/translator.js';
import logger from '../../utils/logger.js';

// Common languages for the help list
const COMMON_LANGS = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ms', name: 'Malay' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' },
];

export default {
  name: 'setlang',
  description: 'Set your preferred language for bot replies and menu',
  category: 'general',
  roleRequired: 'user',

  execute: async ({ sock, msg, args, isOwner }) => {
    const jid       = msg.key.remoteJid;

    // Paired user (session owner) only — same as levelup
    if (!isOwner) {
      return await sock.sendMessage(jid, {
        text: `⛔ *Owner Only Command*\n\nOnly the paired bot owner can use *.setlang*`
      }, { quoted: msg });
    }

    const userId    = msg.key.participant || msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix    = getPrefixForSession(botNumber);
    const current   = getUserLang(userId, botNumber);
    const input     = args[0]?.toLowerCase()?.trim();

    // No input — show current lang and available options
    if (!input) {
      const langList = COMMON_LANGS.map(l => `│  • \`${l.code}\` — ${l.name}`).join('\n');
      return sock.sendMessage(jid, {
        text: [
          `🌐 *LANGUAGE SETTINGS*`,
          ``,
          `📍 *Your Current Language:* ${current === 'en' ? 'English (default)' : current}`,
          ``,
          `*Usage:*`,
          `  \`${prefix}setlang fr\`     → set French`,
          `  \`${prefix}setlang reset\`  → back to English`,
          ``,
          `*Common Language Codes:*`,
          langList,
          ``,
          `⚠️ Menu will be translated and cached on first use.`,
          `_Each person sets their own language independently._`,
        ].join('\n')
      }, { quoted: msg });
    }

    // Reset to English
    if (input === 'reset' || input === 'en') {
      clearUserLang(userId, botNumber);
      logger.info(`[SetLang] User ${userId} reset language to English`);
      return sock.sendMessage(jid, {
        text: [
          `✅ *Language Reset*`,
          ``,
          `📍 Back to *English* (default)`,
          `_All bot replies will be in English._`,
        ].join('\n')
      }, { quoted: msg });
    }

    // Validate by doing a test translate
    await sock.sendMessage(jid, {
      text: `⏳ Validating language code *${input}*...`
    }, { quoted: msg });

    try {
      const test = await translateText('Hello, language set successfully!', input);

      if (!test || test === 'Hello, language set successfully!') {
        return sock.sendMessage(jid, {
          text: [
            `❌ *Invalid Language Code*`,
            ``,
            `\`${input}\` doesn't seem to be a valid code.`,
            `Try codes like: \`fr\`, \`es\`, \`de\`, \`hi\`, \`ar\``,
            ``,
            `Use \`${prefix}setlang\` to see all supported codes.`,
          ].join('\n')
        }, { quoted: msg });
      }

      // Save language
      setUserLang(userId, botNumber, input);

      // Clear any cached menu for this lang so it gets rebuilt fresh
      clearMenuCache(input);

      logger.info(`[SetLang] User ${userId} set language to ${input}`);

      // Reply in their new language
      const successMsg = await translateText(
        `✅ Language updated! All bot replies will now be in your chosen language.\n\nType .menu to see your translated menu.\nUse .setlang reset to go back to English anytime.`,
        input
      );

      await sock.sendMessage(jid, { text: successMsg }, { quoted: msg });
      try { await sock.sendMessage(jid, { react: { text: '🌐', key: msg.key } }); } catch (_) {}

    } catch (err) {
      logger.error(`[SetLang] Error validating lang ${input}:`, err.message);
      await sock.sendMessage(jid, {
        text: `❌ Could not validate language code \`${input}\`. Try again or check the code.`
      }, { quoted: msg });
    }
  }
};

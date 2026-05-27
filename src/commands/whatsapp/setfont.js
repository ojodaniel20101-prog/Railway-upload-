/**
 * setfont.js — Per-Session Font Style for ZENTRIX MD BY ZENTRIX TECH.
 * Owner-only. Sets the font used in menus and bot text for this session.
 * Persisted to database and survives restarts.
 */

import { getFontForSession, setFontForSession, VALID_FONTS } from '../../services/databaseService.js';
import { normalizeJidToNumber, applyFont } from '../../utils/helpers.js';
import { getPrefixForSession } from '../../services/databaseService.js';
import logger from '../../utils/logger.js';

// Human-readable font labels
const FONT_LABELS = {
  bold:         'Bold',
  italic:       'Italic',
  boldItalic:   'Bold Italic',
  fraktur:      'Fraktur',
  doublestruck: 'Double Struck',
  monospace:    'Monospace',
  smallcaps:    'Small Caps',
};

const PREVIEW_TEXT = 'ZENTRIX MD BY ZENTRIX TECH';

export default {
  name: 'setfont',
  description: 'Set the font style for this bot session menu and text',
  category: 'system',
  roleRequired: 'owner',

  execute: async ({ sock, msg, args }) => {
    const jid       = msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix    = getPrefixForSession(botNumber);
    const current   = getFontForSession(botNumber);

    const input = args[0]?.toLowerCase().trim();

    // No input — show all font options with live previews
    if (!input) {
      const previews = VALID_FONTS.map((f, i) =>
        `  *${i + 1}.* \`${prefix}setfont ${f}\`\n       ${applyFont(PREVIEW_TEXT, f)} — _${FONT_LABELS[f]}_${f === current ? ' ✅' : ''}`
      ).join('\n\n');

      return sock.sendMessage(jid, {
        text: [
          `🎨 *FONT SETTINGS*`,
          ``,
          `📍 *Current Font:* ${FONT_LABELS[current]} — ${applyFont(PREVIEW_TEXT, current)}`,
          ``,
          `*Available Fonts:*`,
          ``,
          previews,
          ``,
          `*Reset to default:*`,
          `  \`${prefix}setfont bold\``,
          ``,
          `_Font applies to menu headers, bot name, and command text._`,
          `_Each bot session has its own independent font._`,
        ].join('\n')
      }, { quoted: msg });
    }

    // Validate font name
    if (!VALID_FONTS.includes(input)) {
      return sock.sendMessage(jid, {
        text: [
          `❌ *Unknown font:* \`${input}\``,
          ``,
          `Available fonts:`,
          VALID_FONTS.map(f => `  • \`${f}\` — ${applyFont(PREVIEW_TEXT, f)}`).join('\n'),
        ].join('\n')
      }, { quoted: msg });
    }

    // Same as current — no-op
    if (input === current) {
      return sock.sendMessage(jid, {
        text: `ℹ️ Font is already set to *${FONT_LABELS[current]}*. No change made.`
      }, { quoted: msg });
    }

    try {
      setFontForSession(botNumber, input);
      logger.info(`[SetFont] Session ${botNumber} font set: "${current}" → "${input}"`);

      await sock.sendMessage(jid, {
        text: [
          `✅ *Font Updated!*`,
          ``,
          `📍 *Old Font:* ${applyFont(PREVIEW_TEXT, current)} — _${FONT_LABELS[current]}_`,
          `🆕 *New Font:* ${applyFont(PREVIEW_TEXT, input)} — _${FONT_LABELS[input]}_`,
          ``,
          `_Menu and bot text will now render in ${FONT_LABELS[input]} style._`,
          `💾 _Saved. Will persist after restart._`,
          `🔗 _Each bot session has its own independent font._`,
        ].join('\n')
      }, { quoted: msg });

      try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

    } catch (error) {
      logger.error('[SetFont] Error saving font:', error.message);
      await sock.sendMessage(jid, {
        text: `❌ *Failed to save font:* ${error.message}`
      }, { quoted: msg });
    }
  }
};

/**
 * about.js — ZENTRIX MD BY ZENTRIX TECH · System Info
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic — emoji-rich, branded.
 */

import logger from '../../utils/logger.js';

const LOGO_URL = 'https://files.catbox.moe/wysjae.jpg';

export default {
  name: 'about',
  description: 'System information and credits.',
  async execute({ bot, msg }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const caption = [
      `⚡🧠 *ZENTRIX MD BY ZENTRIX TECH  ·  SYSTEM INFO* 🧠⚡`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🤖 *Bot:*       ZENTRIX MD BY ZENTRIX TECH`,
      `👨‍💻 *Dev:*       @unknown\\_zx1`,
      `⚡ *Version:*   \`v3.7 Enterprise\``,
      `🔧 *Engine:*    Baileys + node-tg-bot-api`,
      `🔐 *Security:*  Multi-session isolation`,
      `🧠 *AI Module:* Built-in GPT chat engine`,
      `🖥 *Platform:*  Node.js · ESM`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🛰  *MISSION BRIEF*`,
      `_Enterprise-grade WhatsApp fleet_`,
      `_management with military-level_`,
      `_session control & AI integration._`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *Powered by ZENTRIX MD BY ZENTRIX TECH*`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [[
        { text: '🏠 MAIN MENU', callback_data: '/menu'  },
        { text: '📊 STATS',     callback_data: '/stats' },
        { text: '✦ HELP',       callback_data: '/help'  },
      ]],
    };

    try {
      await bot.sendPhoto(chatId, LOGO_URL, {
        caption,
        parse_mode:   'Markdown',
        reply_markup: keyboard,
      });
    } catch (err) {
      logger.error(`[About] Photo failed → ${err.message}`);
      await bot.sendMessage(chatId, caption, {
        parse_mode:   'Markdown',
        reply_markup: keyboard,
      });
    }

    logger.info(`[About] Sent to ${userId}`);
  },
};

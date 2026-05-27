/**
 * getid.js — ZENTRIX MD BY ZENTRIX TECH · Operator ID
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic.
 */

import logger from '../../utils/logger.js';

export default {
  name: 'getid',
  description: 'Returns your Telegram ID.',
  async execute({ bot, msg }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const responseText = [
      `🆔 *YOUR TELEGRAM ID*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `👤 *Name:*      ${msg.from.first_name || 'N/A'}`,
      `📝 *Username:*  @${msg.from.username || 'N/A'}`,
      `🆔 *User ID:*   \`${userId}\``,
      `💬 *Chat ID:*   \`${chatId}\``,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *Powered by ZENTRIX MD BY ZENTRIX TECH*`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [[
        { text: '🏠 MAIN MENU', callback_data: '/menu' },
      ]],
    };

    try {
      await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown', reply_markup: keyboard });
      logger.info(`[GetId] User ${userId} requested their ID.`);
    } catch (error) {
      logger.error(`[GetId] Error: ${error.message}`);
    }
  },
};

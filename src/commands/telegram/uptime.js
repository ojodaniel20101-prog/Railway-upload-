/**
 * uptime.js — ZENTRIX MD BY ZENTRIX TECH · Bot Uptime
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic.
 */

import { getFormattedUptime } from '../../utils/menu.js';
import logger from '../../utils/logger.js';

export default {
  name: 'uptime',
  description: 'Shows formatted system uptime.',
  async execute({ bot, msg }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const uptime = getFormattedUptime();

    const responseText = [
      `⏰ *BOT STATUS*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🚀 *Uptime:*  ${uptime}`,
      `🟢 *Status:*  \`ACTIVE\``,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [[
        { text: '📊 STATS',   callback_data: '/stats' },
        { text: '🏠 MENU',    callback_data: '/menu'  },
      ]],
    };

    try {
      await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown', reply_markup: keyboard });
      logger.info(`[Uptime] User ${userId} requested uptime.`);
    } catch (error) {
      logger.error(`[Uptime] Error: ${error.message}`);
    }
  },
};

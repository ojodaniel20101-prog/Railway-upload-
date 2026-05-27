/**
 * logs.js — ZENTRIX MD BY ZENTRIX TECH · System Event Logs
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic.
 */

import { systemLogs } from '../../services/systemLogs.js';
import logger from '../../utils/logger.js';

export default {
  name: 'logs',
  description: 'Shows last 10 system events.',
  async execute({ bot, msg }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const logs   = systemLogs.getFormattedLogs();

    const responseText = [
      `🗒 *SYSTEM EVENT LOGS*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      logs,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *Powered by ZENTRIX MD BY ZENTRIX TECH*`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [[
        { text: '🔄 REFRESH', callback_data: '/logs'   },
        { text: '📊 STATS',   callback_data: '/stats'  },
        { text: '🏠 MENU',    callback_data: '/menu'   },
      ]],
    };

    try {
      await bot.sendMessage(chatId, responseText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
      logger.info(`[Logs] User ${userId} requested system logs.`);
    } catch (error) {
      logger.error(`[Logs] Error: ${error.message}`);
    }
  },
};

/**
 * system.js — ZENTRIX MD BY ZENTRIX TECH · Deep System Diagnostics
 * Authorization: Admin Only
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic.
 */

import { adminService }       from '../../services/adminService.js';
import { getSystemDiagnostics } from '../../utils/menu.js';
import logger from '../../utils/logger.js';

export default {
  name: 'system',
  description: 'Deep system diagnostics (Admin Only).',
  async execute({ bot, msg }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // 1. Admin Authorization Check
    const isAuthorized = await adminService.checkAdmin(bot, msg);
    if (!isAuthorized) return;

    const diagnosticsText = getSystemDiagnostics();

    const keyboard = {
      inline_keyboard: [[
        { text: '🔄 REFRESH', callback_data: '/system' },
        { text: '📊 STATS',   callback_data: '/stats'  },
        { text: '🏠 MENU',    callback_data: '/menu'   },
      ]],
    };

    try {
      await bot.sendMessage(chatId, diagnosticsText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
      logger.info(`[System] Admin ${userId} requested deep diagnostics.`);
    } catch (error) {
      logger.error(`[System] Error sending diagnostics to ${userId}:`, error);
    }
  },
};

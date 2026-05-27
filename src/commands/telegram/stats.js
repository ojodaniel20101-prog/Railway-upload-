/**
 * stats.js — ZENTRIX MD BY ZENTRIX TECH · System Telemetry
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic — emoji-rich, bold readout.
 */

import os from 'os';
import { adminService }       from '../../services/adminService.js';
import { userStorage }        from '../../services/userStorage.js';
import { sessionManager }     from '../../core/sessionManager.js';
import { getFormattedUptime } from '../../utils/menu.js';
import logger from '../../utils/logger.js';

function bar(percent, len = 12) {
  const filled = Math.round((percent / 100) * len);
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

function buildStatsText(userId) {
  const isAdmin  = adminService.isAdmin(userId);
  const uptime   = getFormattedUptime();
  const mem      = process.memoryUsage();
  const memMB    = (mem.rss / 1024 / 1024).toFixed(1);
  const heapMB   = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const heapTot  = (mem.heapTotal / 1024 / 1024).toFixed(1);
  const heapPct  = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  const cpuLoad  = os.loadavg()[0].toFixed(2);
  const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
  const freeMem  = (os.freemem() / 1024 / 1024).toFixed(0);
  const ramPct   = Math.round(((totalMem - freeMem) / totalMem) * 100);

  const lines = [
    `⚡ *BOT STATUS*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `⏰  *UPTIME*       ${uptime}`,
    `🟢  *Status:*     \`ACTIVE\``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🧠  *MEMORY*`,
    `       RSS:    \`${memMB} MB\``,
    `       Heap:   \`${heapMB} / ${heapTot} MB\``,
    `       \`${bar(heapPct)}\` ${heapPct}%`,
    ``,
    `💻  *SYSTEM RAM*`,
    `       \`${bar(ramPct)}\` ${ramPct}%`,
    `       \`${freeMem} MB free / ${totalMem} MB total\``,
    ``,
    `📈  *CPU LOAD*     \`${cpuLoad}\``,
    `🖥  *PLATFORM*     \`${process.platform}\``,
    `🔩  *NODE.JS*      \`${process.version}\``,
    `💾  *MEMORY*       \`${memMB} MB\``,
  ];

  if (isAdmin) {
    const sessions = Array.from(sessionManager.sessions.keys()).length;
    const tgUsers  = userStorage.getUserCount();
    lines.push(
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📡  *SESSIONS*     \`${sessions} active\``,
      `👥  *TG USERS*     \`${tgUsers} registered\``,
    );
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `_▸ ${new Date().toUTCString()}_`,
  );

  return lines.join('\n');
}

export default {
  name: 'stats',
  description: 'Displays live system telemetry.',
  async execute({ bot, msg }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const text     = buildStatsText(userId);
    const keyboard = {
      inline_keyboard: [[
        { text: '🔄 REFRESH',  callback_data: '/stats'  },
        { text: '🏠 MENU',     callback_data: '/menu'   },
        { text: '⏱ UPTIME',    callback_data: '/uptime' },
      ]],
    };

    try {
      await bot.sendMessage(chatId, text, {
        parse_mode:   'Markdown',
        reply_markup: keyboard,
      });
      logger.info(`[Stats] Sent to ${userId}`);
    } catch (err) {
      logger.error(`[Stats] Error: ${err.message}`);
    }
  },
};

/**
 * help.js — ZENTRIX MD BY ZENTRIX TECH · Command Index
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic — emoji-rich, bold categories.
 */

import { adminService } from '../../services/adminService.js';
import logger from '../../utils/logger.js';

const CATEGORIES = {
  '🛰  SESSIONS': {
    commands: [
      { name: '/connect <number>', desc: 'Pair a WhatsApp account'  },
      { name: '/sessions',         desc: 'View active sessions'     },
      { name: '/delsession <num>', desc: 'Remove a session'         },
    ],
  },
  '📊  DIAGNOSTICS': {
    commands: [
      { name: '/stats',  desc: 'System & session metrics' },
      { name: '/uptime', desc: 'Bot uptime'               },
      { name: '/getid',  desc: 'Your Telegram ID'         },
      { name: '/ping',   desc: 'Bot speed'                },
      { name: '/logs',   desc: 'Recent activity logs'     },
    ],
  },
  '📘  GENERAL': {
    commands: [
      { name: '/help',    desc: 'All commands'    },
      { name: '/about',   desc: 'System info'    },
      { name: '/menu',    desc: 'Main dashboard' },
      { name: '/premium', desc: 'Premium status' },
    ],
  },
  '👑  ADMIN': {
    adminOnly: true,
    commands: [
      { name: '/broadcast <msg>', desc: 'Push message to all users' },
      { name: '/system',          desc: 'Deep system diagnostics'   },
    ],
  },
};

export default {
  name: 'help',
  description: 'Lists all available commands.',
  async execute({ bot, msg }) {
    const chatId  = msg.chat.id;
    const userId  = msg.from.id;
    const isAdmin = adminService.isAdmin(userId);

    const lines = [
      `🧠⚡ *ZENTRIX MD BY ZENTRIX TECH COMMANDS*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
    ];

    for (const [cat, data] of Object.entries(CATEGORIES)) {
      if (data.adminOnly && !isAdmin) continue;
      lines.push(`*${cat}*`);
      for (const cmd of data.commands) {
        lines.push(`  ┣  \`${cmd.name}\``);
        lines.push(`  ┗  _${cmd.desc}_`);
      }
      lines.push(``);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`💡 Need help? Contact @unknown\\_zx1`);

    const keyboard = {
      inline_keyboard: [[
        { text: '🏠 MAIN MENU', callback_data: '/menu'  },
        { text: 'ℹ️ ABOUT',     callback_data: '/about' },
        { text: '▸ STATS',      callback_data: '/stats' },
      ]],
    };

    try {
      await bot.sendMessage(chatId, lines.join('\n'), {
        parse_mode:   'Markdown',
        reply_markup: keyboard,
      });
      logger.info(`[Help] Sent to ${userId}`);
    } catch (err) {
      logger.error(`[Help] Error: ${err.message}`);
    }
  },
};

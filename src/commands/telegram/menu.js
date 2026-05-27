/**
 * menu.js — ZENTRIX MD BY ZENTRIX TECH · Main Control Dashboard
 * Style: ZENTRIX MD BY ZENTRIX TECH — cinematic, dark-ops, premium feel.
 */

import { sessionManager }     from '../../core/sessionManager.js';
import { userStorage }        from '../../services/userStorage.js';
import { adminService }       from '../../services/adminService.js';
import { getFormattedUptime } from '../../utils/menu.js';
import logger from '../../utils/logger.js';

const BANNER_URL = 'https://files.catbox.moe/wysjae.jpg';

const STATUS_LINES = [
  '🟢 `ALL SYSTEMS NOMINAL`',
  '🟢 `CORE ONLINE · READY`',
  '🟢 `STANDING BY · ARMED`',
  '🟢 `UPLINK ESTABLISHED`',
];

function getStatusLine() {
  return STATUS_LINES[Math.floor(Date.now() / 60000) % STATUS_LINES.length];
}

function buildMainKeyboard(isAdmin) {
  const rows = [
    [
      { text: '⚡ PAIR DEVICE',  callback_data: 'prompt_connect' },
      { text: '👤 ACCOUNT INFO', callback_data: 'account_info'  },
    ],
    [
      { text: '📡 MY SESSIONS',  callback_data: '/sessions'      },
      { text: '💎 PREMIUM',      callback_data: 'premium_status' },
    ],
    [
      { text: '🛠 STATS',        callback_data: '/stats'         },
      { text: '⏱ UPTIME',        callback_data: '/uptime'        },
      { text: '🆔 MY ID',        callback_data: '/getid'         },
    ],
    [
      { text: '📖 HELP',         callback_data: '/help'          },
      { text: 'ℹ️ ABOUT',        callback_data: '/about'         },
    ],
    [
      { text: '📢 CHANNEL',      url: 'https://t.me/zentrixmd'    },
      { text: '💬 SUPPORT GC',   url: 'https://t.me/zentrix_md_gc' },
    ],
  ];

  if (isAdmin) {
    rows.push([
      { text: '📣 BROADCAST', callback_data: 'prompt_broadcast' },
      { text: '⚙️ SYSTEM',    callback_data: '/system'          },
      { text: '🗒 LOGS',      callback_data: '/logs'            },
    ]);
  }

  return { inline_keyboard: rows };
}

function buildCaption({ firstName, roleTag, uptime, activeSessions, userId }) {
  const statusLine = getStatusLine();
  const hour = new Date().getUTCHours();
  const greeting = hour < 12 ? '🌅 Good morning' : hour < 18 ? '☀️ Good afternoon' : '🌙 Good evening';

  return [
    `╔═══════════════════════╗`,
    `   ⚡ *Z E N T R I X  M D* ⚡`,
    `╚═══════════════════════╝`,
    ``,
    `${greeting}, *${firstName}!*`,
    ``,
    `┌──────────────────────┐`,
    `│ 🤖 *Bot:*   ZENTRIX MD BY ZENTRIX TECH       │`,
    `│ 👨‍💻 *Dev:*   @unknown\\_zx1    │`,
    `│ 🔖 *Build:* \`v3.7 ULTRA\`    │`,
    `│ 🎖 *Role:*  ${roleTag}`,
    `└──────────────────────┘`,
    ``,
    `📊 *LIVE TELEMETRY*`,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `  ⏱  *Uptime* ——— ${uptime}`,
    `  📡  *Sessions* — \`${activeSessions} active\``,
    `  🆔  *Your ID* — \`${userId}\``,
    `  ${statusLine}`,
    ``,
    `▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄`,
    `_▸ Select an operation below_`,
  ].join('\n');
}

export default {
  name: 'menu',
  description: 'Displays the main control dashboard.',
  async execute({ bot, msg }) {
    const chatId     = msg.chat.id;
    const userId     = msg.from.id;
    const firstName  = msg.from.first_name || 'Operator';
    const isAdmin    = adminService.isAdmin(userId);

    await userStorage.saveUser(msg.from);

    const activeSessions = Array.from(sessionManager.sessions.keys()).length;
    const uptime         = getFormattedUptime();
    const roleTag        = isAdmin ? '👑 ADMIN' : '◈ USER';
    const caption        = buildCaption({ firstName, roleTag, uptime, activeSessions, userId });
    const keyboard       = buildMainKeyboard(isAdmin);

    try {
      await bot.sendPhoto(chatId, BANNER_URL, { caption, parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (err) {
      logger.error(`[Menu] Photo failed → ${err.message}`);
      await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    logger.info(`[Menu] Dashboard → ${userId}`);
  },
};

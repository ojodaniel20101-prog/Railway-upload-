/**
 * sessions.js — ZENTRIX MD BY ZENTRIX TECH · Active Session Registry
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic — emoji-rich, bold.
 */

import { sessionManager } from '../../core/sessionManager.js';
import { adminService }   from '../../services/adminService.js';
import logger from '../../utils/logger.js';

export default {
  name: 'sessions',
  description: 'Lists all connected WhatsApp accounts.',
  async execute({ bot, msg }) {
    const chatId  = msg.chat.id;
    const userId  = msg.from.id;
    const isAdmin = adminService.isAdmin(userId);

    const allSessions  = Array.from(sessionManager.sessions.entries());
    const userSessions = allSessions.filter(([_, s]) =>
      isAdmin ? true : s.telegramChatId === chatId
    );

    // ── No sessions ────────────────────────────────────
    if (userSessions.length === 0) {
      await bot.sendMessage(chatId,
        [
          `📡 *SESSION STATUS*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `❌ No sessions connected yet.`,
          ``,
          `  ▸ Use /connect to link a device.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[
            { text: '📱 CONNECT NOW', callback_data: 'prompt_connect' },
            { text: '🏠 MAIN MENU',   callback_data: '/menu'          },
          ]]},
        }
      );
      return;
    }

    // ── Build list ─────────────────────────────────────
    const lines = [
      `📡 *SESSION STATUS*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Connected: ${userSessions.length}*`,
      ``,
    ];

    const buttons = [];

    for (const [phone, session] of userSessions) {
      const isActive = sessionManager.isSessionActive(phone);
      const dot      = isActive ? '🟢' : '🔴';
      const status   = isActive ? 'LIVE' : 'OFFLINE';
      const ageMs    = Date.now() - new Date(session.createdAt).getTime();
      const ageH     = Math.floor(ageMs / 3_600_000);
      const ageM     = Math.floor((ageMs % 3_600_000) / 60_000);

      lines.push(`${dot}  📱 \`${phone}\``);
      lines.push(`       ⏰ Uptime: \`${ageH}h ${ageM}m\`   Status: *${status}*`);
      lines.push(``);

      buttons.push([{
        text:          `🚫 DISCONNECT  +${phone}`,
        callback_data: `disconnect_${phone}`,
      }]);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

    buttons.push([
      { text: '📱 CONNECT NEW', callback_data: 'prompt_connect' },
      { text: '🔄 REFRESH',     callback_data: '/sessions'      },
      { text: '🏠 MENU',        callback_data: '/menu'          },
    ]);

    try {
      await bot.sendMessage(chatId, lines.join('\n'), {
        parse_mode:   'Markdown',
        reply_markup: { inline_keyboard: buttons },
      });
      logger.info(`[Sessions] Sent to ${userId} — ${userSessions.length} sessions`);
    } catch (err) {
      logger.error(`[Sessions] Error: ${err.message}`);
    }
  },
};

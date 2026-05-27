/**
 * disconnect.js — ZENTRIX MD BY ZENTRIX TECH · Session Termination Protocol
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic — confirm gate preserved, emoji-rich.
 */

import { sessionManager } from '../../core/sessionManager.js';
import { adminService }   from '../../services/adminService.js';
import logger from '../../utils/logger.js';

const NAV_KB = {
  inline_keyboard: [[
    { text: '📡 SESSIONS', callback_data: '/sessions' },
    { text: '🏠 MENU',     callback_data: '/menu'     },
  ]],
};

export default {
  name: 'disconnect',
  description: 'Force-terminate a WhatsApp session.',
  async execute({ bot, msg, args }) {
    const chatId  = msg.chat.id;
    const userId  = msg.from.id;
    const isAdmin = adminService.isAdmin(userId);

    const phoneNumber = (args[0] || '').trim().replace(/^\+/, '');

    // ── No number ──────────────────────────────────────
    if (!phoneNumber) {
      await bot.sendMessage(chatId,
        [
          `🚫 *REMOVE SESSION*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `⚠️ Specify the number to disconnect:`,
          ``,
          `  \`/delsession 234712345678\``,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
      return;
    }

    // ── Session not found ──────────────────────────────
    const session = sessionManager.getSession(phoneNumber);
    if (!session) {
      await bot.sendMessage(chatId,
        [
          `❌ *SESSION NOT FOUND*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `No active session for \`+${phoneNumber}\``,
          ``,
          `  ▸ Use /sessions to view connected devices.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
      return;
    }

    // ── Unauthorized ───────────────────────────────────
    if (!isAdmin && session.telegramChatId !== chatId) {
      logger.warn(`[SECURITY] User ${userId} tried to disconnect ${phoneNumber} — DENIED`);
      await bot.sendMessage(chatId,
        `🚫 *ACCESS DENIED*\n\nYou are not authorized to remove this session.`,
        { parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
      return;
    }

    // ── Confirmation gate ──────────────────────────────
    await bot.sendMessage(chatId,
      [
        `⚠️ *CONFIRM REMOVAL*`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `This will permanently remove the session for:`,
        ``,
        `  📞  \`+${phoneNumber}\``,
        ``,
        `  ▸ All linked automation will stop`,
        `  ▸ This cannot be undone without re-pairing`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━`,
        `_▸ Confirm to proceed_`,
      ].join('\n'),
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[
          { text: '✅ CONFIRM DISCONNECT', callback_data: `confirm_disconnect_${phoneNumber}` },
          { text: '✕ CANCEL',              callback_data: '/sessions'                          },
        ]]},
      }
    );
  },
};

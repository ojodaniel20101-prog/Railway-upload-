/**
 * connect.js — ZENTRIX MD BY ZENTRIX TECH · Session Pairing Protocol
 * Pairing logic fully preserved. Style: ZENTRIX MD BY ZENTRIX TECH aesthetic.
 */

import { sessionManager }     from '../../core/sessionManager.js';
import { validatePhoneNumber } from '../../utils/validator.js';
import { formatPairingCode }   from '../../utils/helpers.js';
import { userStorage }         from '../../services/userStorage.js';
import logger from '../../utils/logger.js';

const NAV_KB = {
  inline_keyboard: [[
    { text: '📡 MY SESSIONS', callback_data: '/sessions' },
    { text: '🏠 MAIN MENU',   callback_data: '/menu'     },
  ]],
};

export default {
  name: 'connect',
  description: 'Pair a WhatsApp account via pairing code.',
  async execute({ bot, msg, args }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    await userStorage.saveUser(msg.from);

    const phoneNumber = (args[0] || '').trim();

    // ── No number provided ──────────────────────────
    if (!phoneNumber) {
      await bot.sendMessage(chatId,
        [
          `📱 *PAIR DEVICE*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `⚠️ Please provide your number with country code:`,
          ``,
          `  \`/connect 234xxxxxxxxx\``,
          ``,
          `📌 *Rules:*`,
          `  ▸ No \`+\` prefix`,
          `  ▸ No spaces`,
          `  ▸ Digits only`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
      return;
    }

    // ── Validate ─────────────────────────────────────
    const { valid, reason } = validatePhoneNumber(phoneNumber);
    if (!valid) {
      await bot.sendMessage(chatId,
        [
          `❌ *INVALID NUMBER*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `  ${reason}`,
          ``,
          `💡 Example: \`/connect 234712345678\``,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
      return;
    }

    // ── Already active ────────────────────────────────
    if (sessionManager.isSessionActive(phoneNumber)) {
      await bot.sendMessage(chatId,
        [
          `✅ *ALREADY CONNECTED*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `📞 \`+${phoneNumber}\` is already live.`,
          ``,
          `  ▸ Use /sessions to manage it.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
      return;
    }

    // ── Session limit check ───────────────────────────
    const totalSessions = sessionManager.getAllSessions().length;
    if (totalSessions >= 50) {
      await bot.sendMessage(chatId,
        [
          `❌ *SESSION LIMIT REACHED*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `⚠️ Maximum of *50 sessions* has been reached.`,
          ``,
          `  ▸ Please disconnect an existing session first.`,
          `  ▸ Use /sessions to manage active sessions.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
      return;
    }

    // ── Generating code ───────────────────────────────
    const waitMsg = await bot.sendMessage(chatId,
      `⏳ *Initiating pairing for* \`+${phoneNumber}\`*…*\n\n🧠⚡ ZENTRIX MD BY ZENTRIX TECH DEVICE LINK PROTOCOL ⚡🧠`,
      { parse_mode: 'Markdown' }
    );

    try {
      const result = await sessionManager.createSession(phoneNumber, chatId);

      if (result.success && result.pairingCode) {
        const code = formatPairingCode(result.pairingCode);

        await bot.editMessageText(
          [
            `🔑 *Your Pairing Code for* \`${phoneNumber}\`:`,
            ``,
            `\`${code}\``,
            ``,
            `🧠⚡ ZENTRIX MD BY ZENTRIX TECH DEVICE LINK PROTOCOL ⚡🧠`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━`,
            `*HOW TO LINK:*`,
            ``,
            `1️⃣ Open WhatsApp`,
            `2️⃣ Go to Settings → Linked Devices`,
            `3️⃣ Tap *"Link a Device"* → Enter Code`,
            ``,
            `> Tap the code to copy it.`,
            ``,
            `⚠️ _Code expires in 60 seconds_`,
            `━━━━━━━━━━━━━━━━━━━━━`,
          ].join('\n'),
          {
            chat_id:      chatId,
            message_id:   waitMsg.message_id,
            parse_mode:   'Markdown',
            reply_markup: NAV_KB,
          }
        );
        logger.info(`[Connect] Pairing code issued → ${phoneNumber} (user: ${userId})`);
      } else {
        await bot.editMessageText(
          [
            `❌ *SESSION FAILED*`,
            `━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `${result.message || 'Could not create session. Please retry.'}`,
            ``,
            `💡 Contact @unknown\\_zx1 if the issue persists.`,
            `━━━━━━━━━━━━━━━━━━━━━`,
          ].join('\n'),
          { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: 'Markdown', reply_markup: NAV_KB }
        );
      }
    } catch (err) {
      logger.error(`[Connect] Error for ${phoneNumber}:`, err);
      await bot.editMessageText(
        [
          `❌ *CRITICAL ERROR*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `\`${err.message || 'Check server logs.'}\``,
          ``,
          `💡 Contact @unknown\\_zx1 for support.`,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: 'Markdown', reply_markup: NAV_KB }
      );
    }
  },
};

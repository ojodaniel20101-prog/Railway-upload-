/**
 * telegramHandler.js — Central dispatcher for Telegram updates.
 * - All button taps EDIT the existing message (no new messages)
 * - Button-driven connect flow (no typing required for simple actions)
 * - Full automation: uptime, stats, sessions, account, premium via buttons
 */

import logger from '../utils/logger.js';
import { userStorage }   from '../services/userStorage.js';
import { commandRouter } from './commandRouter.js';
import { sessionManager } from '../core/sessionManager.js';
import { adminService }   from '../services/adminService.js';
import { getFormattedUptime } from '../utils/menu.js';
import os from 'os';

// ── Helpers ──────────────────────────────────────────────────────────────────

const BANNER_URL = 'https://i.ibb.co/9ksGqGXy/6d14e5d20a3c.jpg';

const NAV_BACK = (extra = []) => ({
  inline_keyboard: [
    ...extra,
    [{ text: '🏠 MAIN MENU', callback_data: '/menu' }],
  ],
});

/**
 * Edit the message that triggered the button tap.
 * Falls back to sendMessage if edit fails (e.g. photo messages).
 */
async function editOrSend(bot, msg, text, keyboard) {
  const chatId    = msg.chat.id;
  const messageId = msg.message_id;
  const opts      = { parse_mode: 'Markdown', reply_markup: keyboard };

  // Try caption edit first (photo messages), then text edit, then send
  try {
    await bot.editMessageCaption(text, { chat_id: chatId, message_id: messageId, ...opts });
    return;
  } catch (_) {}
  try {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...opts });
    return;
  } catch (_) {}
  await bot.sendMessage(chatId, text, opts);
}

// ── Menu builder (reused for /menu button and back navigation) ────────────────

function buildMenuCaption({ firstName, roleTag, uptime, activeSessions, userId }) {
  const STATUS_LINES = [
    '🟢 `ALL SYSTEMS NOMINAL`',
    '🟢 `CORE ONLINE · READY`',
    '🟢 `STANDING BY · ARMED`',
    '🟢 `UPLINK ESTABLISHED`',
  ];
  const statusLine = STATUS_LINES[Math.floor(Date.now() / 60000) % STATUS_LINES.length];
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
    `│ 🤖 *Bot:*   ZENTRIX MD       │`,
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

function buildMenuKeyboard(isAdmin) {
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
      { text: '📢 CHANNEL',      url: 'https://t.me/zentrix_tech'    },
      { text: '💬 SUPPORT GC',   url: 'https://t.me/zentrix_tech_gc' },
    ],
    [
      { text: '📡 VIEW WA CHANNEL', url: 'https://whatsapp.com/channel/0029VbCjCq80LKZ4i4iWHq22' },
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

// ── Special callback handler ─────────────────────────────────────────────────

async function handleSpecialCallback(bot, msg, data) {
  const chatId  = msg.chat.id;
  const userId  = msg.from.id;
  const isAdmin = adminService.isAdmin(userId);

  // ── /menu — rebuild main dashboard in-place ──────────────────────────────
  if (data === '/menu') {
    const firstName      = msg.from.first_name || 'Operator';
    const activeSessions = Array.from(sessionManager.sessions.keys()).length;
    const uptime         = getFormattedUptime();
    const roleTag        = isAdmin ? '👑 ADMIN' : '◈ USER';
    const caption        = buildMenuCaption({ firstName, roleTag, uptime, activeSessions, userId });
    const keyboard       = buildMenuKeyboard(isAdmin);

    try {
      await bot.editMessageMedia(
        { type: 'photo', media: BANNER_URL, caption, parse_mode: 'Markdown' },
        { chat_id: chatId, message_id: msg.message_id, reply_markup: keyboard }
      );
    } catch (_) {
      await editOrSend(bot, msg, caption, keyboard);
    }
    return true;
  }

  // ── prompt_connect — show number input UI ───────────────────────────────
  if (data === 'prompt_connect') {
    const text = [
      `⚡ *PAIR DEVICE*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `📲 Enter your number with country code:`,
      ``,
      `  \`/connect 234xxxxxxxxx\``,
      ``,
      `📌 *Rules:*`,
      `  ▸ No \`+\` prefix`,
      `  ▸ No spaces`,
      `  ▸ Digits only`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `_Type the command above to pair your device_`,
    ].join('\n');

    await editOrSend(bot, msg, text, NAV_BACK([[
      { text: '📡 MY SESSIONS', callback_data: '/sessions' },
    ]]));
    return true;
  }

  // ── prompt_broadcast ─────────────────────────────────────────────────────
  if (data === 'prompt_broadcast') {
    if (!isAdmin) {
      await editOrSend(bot, msg, `❌ *Admin only.*`, NAV_BACK());
      return true;
    }
    const text = [
      `📣 *BROADCAST*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Send your message using:`,
      ``,
      `  \`/broadcast Your message here\``,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');
    await editOrSend(bot, msg, text, NAV_BACK());
    return true;
  }

  // ── account_info ─────────────────────────────────────────────────────────
  if (data === 'account_info') {
    const from = msg.from;
    const joinDate = (() => {
      try { return new Date(((from.id / 4194304) + 1420070400) * 1000).toDateString(); }
      catch { return 'Unknown'; }
    })();
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'N/A';
    const username    = from.username ? `@${from.username}` : 'No username set';
    const profileLink = from.username ? `https://t.me/${from.username}` : 'N/A';

    const text = [
      `👤 *ACCOUNT INFO*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🆔 *User ID:*      \`${from.id}\``,
      `💬 *Chat ID:*      \`${chatId}\``,
      `👤 *Username:*     ${username}`,
      `📛 *Display Name:* ${displayName}`,
      `🔗 *Profile:*      ${profileLink}`,
      `📅 *Est. Joined:*  ${joinDate}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `🎖 *Role:* ${isAdmin ? '👑 ADMIN' : '◈ USER'}`,
      `📡 *Sessions:* \`${(sessionManager.sessions?.size || 0)} active\``,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    await editOrSend(bot, msg, text, NAV_BACK());
    return true;
  }

  // ── premium_status ────────────────────────────────────────────────────────
  if (data === 'premium_status') {
    const text = [
      `💎 *PREMIUM STATUS*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `❌ *Status:* Inactive`,
      ``,
      `💡 Contact @unknown\\_zx1 to upgrade!`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✨ *Premium Perks:*`,
      `  ▸ Unlimited sessions`,
      `  ▸ Priority support`,
      `  ▸ Exclusive features`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    await editOrSend(bot, msg, text, NAV_BACK([[
      { text: '💬 Contact Dev', url: 'https://t.me/unknown_zx1' },
    ]]));
    return true;
  }

  // ── disconnect_<phone> — confirm gate ────────────────────────────────────
  if (data.startsWith('disconnect_') && !data.startsWith('confirm_disconnect_')) {
    const phone   = data.replace('disconnect_', '');
    const session = sessionManager.getSession(phone);

    if (!session) {
      await editOrSend(bot, msg, `❌ Session not found for \`+${phone}\``, NAV_BACK([[
        { text: '📡 SESSIONS', callback_data: '/sessions' },
      ]]));
      return true;
    }
    if (!isAdmin && session.telegramChatId !== chatId) {
      await editOrSend(bot, msg, `🚫 *ACCESS DENIED*\n\nNot authorized to remove this session.`, NAV_BACK());
      return true;
    }

    const text = [
      `⚠️ *CONFIRM REMOVAL*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `This will permanently remove:`,
      ``,
      `  📞  \`+${phone}\``,
      ``,
      `  ▸ All automation will stop`,
      `  ▸ Cannot be undone without re-pairing`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `_▸ Confirm to proceed_`,
    ].join('\n');

    await editOrSend(bot, msg, text, {
      inline_keyboard: [[
        { text: '✅ CONFIRM',  callback_data: `confirm_disconnect_${phone}` },
        { text: '✕ CANCEL',   callback_data: '/sessions'                    },
      ]],
    });
    return true;
  }

  // ── confirm_disconnect_<phone> ────────────────────────────────────────────
  if (data.startsWith('confirm_disconnect_')) {
    const phone   = data.replace('confirm_disconnect_', '');
    const session = sessionManager.getSession(phone);

    if (!session) {
      await editOrSend(bot, msg, `❌ Session \`+${phone}\` not found.`, NAV_BACK([[
        { text: '📡 SESSIONS', callback_data: '/sessions' },
      ]]));
      return true;
    }
    if (!isAdmin && session.telegramChatId !== chatId) {
      await editOrSend(bot, msg, `🚫 *ACCESS DENIED*`, NAV_BACK());
      return true;
    }

    try {
      await sessionManager.deleteSession(phone, false);
      const text = [
        `✅ *SESSION REMOVED*`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `📞 \`+${phone}\` has been disconnected.`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━`,
      ].join('\n');
      await editOrSend(bot, msg, text, NAV_BACK([[
        { text: '📡 MY SESSIONS', callback_data: '/sessions' },
      ]]));
      logger.info(`[TelegramHandler] Session ${phone} disconnected by ${userId}`);
    } catch (err) {
      await editOrSend(bot, msg, `❌ *Error:* \`${err.message}\``, NAV_BACK());
    }
    return true;
  }

  return false;
}

// ── Slash-command via button — execute and edit in-place ─────────────────────

async function executeCommandAndEdit(bot, msg, commandName, args = []) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Commands that need a "send new message" flow (e.g. connect with args)
  // Everything else: we inject editOrSend into the bot proxy
  const proxyBot = new Proxy(bot, {
    get(target, prop) {
      if (prop === 'sendMessage') {
        return (cid, text, opts = {}) => {
          if (cid === chatId) return editOrSend(target, msg, text, opts.reply_markup);
          return target.sendMessage(cid, text, opts);
        };
      }
      if (prop === 'sendPhoto') {
        return (cid, photo, opts = {}) => {
          if (cid === chatId) return editOrSend(target, msg, opts.caption || '', opts.reply_markup);
          return target.sendPhoto(cid, photo, opts);
        };
      }
      return target[prop];
    },
  });

  try {
    logger.telegram(`Button-exec: /${commandName}`, 'EXEC');
    await commandRouter.execute('telegram', commandName.toLowerCase(), {
      bot: proxyBot,
      msg,
      args,
      chatId,
      commandRouter,
    });
  } catch (err) {
    logger.error(`Button-exec /${commandName} failed: ${err.message}`, 'TG');
    await editOrSend(bot, msg,
      `❌ *Error*\n\n\`${err.message || 'Unknown error.'}\``,
      NAV_BACK()
    );
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function handleTelegramMessage(bot, msg, callbackQueryId = null) {
  const chatId    = msg.chat.id;
  const userId    = msg.from.id;
  const username  = msg.from.username || 'unknown';
  const firstName = msg.from.first_name || 'User';
  const text      = msg.text || '';
  const isGroup   = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const isChannel = msg.chat.type === 'channel';

  logger.message({
    direction: 'IN',
    platform:  'TG',
    user:      `${firstName} (@${username})`,
    content:   text,
    context:   isGroup ? 'GROUP' : isChannel ? 'CHANNEL' : 'DM',
    groupName: isGroup ? msg.chat.title : '',
    type:      'text',
  });

  try { await userStorage.saveUser(msg.from); } catch (err) {
    logger.error(`Failed to register user ${userId}`, err);
  }

  // Answer callback immediately to clear the Telegram spinner
  if (callbackQueryId) {
    try { await bot.answerCallbackQuery(callbackQueryId); } catch (_) {}
  }

  if (!text) return;

  // ── Callback button tap ──────────────────────────────────────────────────
  if (callbackQueryId) {
    // 1. Try special non-command callbacks first
    if (!text.startsWith('/')) {
      const handled = await handleSpecialCallback(bot, msg, text);
      if (handled) return;
      // Unknown special callback — ignore
      return;
    }

    // 2. Special callbacks that look like slash commands (/menu, /sessions etc)
    const handled = await handleSpecialCallback(bot, msg, text);
    if (handled) return;

    // 3. Route slash-command via button — edit in-place
    const rawCmd = text.slice(1).trim();
    const [commandName, ...args] = rawCmd.split(/ +/);
    await executeCommandAndEdit(bot, msg, commandName, args);
    return;
  }

  // ── Manual text command ──────────────────────────────────────────────────
  if (text.startsWith('/')) {
    const rawCmd = text.slice(1).trim();
    const [commandName, ...args] = rawCmd.split(/ +/);

    try {
      logger.telegram(`Executing: /${commandName}`, 'EXEC');
      await commandRouter.execute('telegram', commandName.toLowerCase(), {
        bot,
        msg,
        args,
        chatId,
        commandRouter,
      });
    } catch (err) {
      logger.error(`Command /${commandName} failed: ${err.message}`, 'TG');
      try {
        await bot.sendMessage(chatId,
          `❌ *Error*\n\n\`${err.message || 'Unknown error.'}\``,
          { parse_mode: 'Markdown' }
        );
      } catch (_) {}
    }
  }
}

// ── Centralized error handler ────────────────────────────────────────────────

export function handleTelegramError(error) {
  const desc = error.description || error.message || 'No description';
  if (desc.includes('message is not modified')) return;
  logger.error(`Telegram API Error [${error.code || 'UNKNOWN'}]: ${desc}`, 'TELEGRAM');
}
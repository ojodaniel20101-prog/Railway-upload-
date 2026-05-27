/**
 * broadcast.js — ZENTRIX MD BY ZENTRIX TECH · Global Announcement
 * Authorization: Admin Only
 * Style: ZENTRIX MD BY ZENTRIX TECH aesthetic.
 */

import { adminService } from '../../services/adminService.js';
import { userStorage }  from '../../services/userStorage.js';
import logger from '../../utils/logger.js';

export default {
  name: 'broadcast',
  description: 'Broadcasts a message to all registered Telegram users.',
  async execute({ bot, msg, args }) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // 1. Admin Authorization Check
    const isAuthorized = await adminService.checkAdmin(bot, msg);
    if (!isAuthorized) return;

    // 2. Validate Message Presence
    const broadcastMessage = args.join(' ');
    if (!broadcastMessage) {
      await bot.sendMessage(chatId,
        [
          `📣 *BROADCAST*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `⚠️ Please provide a message to broadcast.`,
          ``,
          `Usage: \`/broadcast Your message here\``,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // 3. Retrieve All Registered Users
    const allUserIds = userStorage.getAllUserIds();
    if (allUserIds.length === 0) {
      await bot.sendMessage(chatId, '⚠️ No registered users found to broadcast to.');
      return;
    }

    await bot.sendMessage(chatId,
      `📣 *Starting broadcast to ${allUserIds.length} users...*`,
      { parse_mode: 'Markdown' }
    );

    // 4. Delivery Engine
    const results = await Promise.allSettled(
      allUserIds.map(targetId =>
        bot.sendMessage(targetId,
          [
            `📢 *GLOBAL ANNOUNCEMENT*`,
            `━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            broadcastMessage,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━`,
            `⚡ *Powered by ZENTRIX MD BY ZENTRIX TECH*`,
          ].join('\n'),
          { parse_mode: 'Markdown' }
        )
      )
    );

    // 5. Results
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount    = results.filter(r => r.status === 'rejected').length;

    await bot.sendMessage(chatId,
      [
        `📢 *BROADCAST COMPLETE*`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `✅ *Delivered:* ${successCount}`,
        `❌ *Failed:*    ${failCount}`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━`,
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );

    logger.info(`[Broadcast] Admin ${userId} sent to ${allUserIds.length} users. Success: ${successCount}, Fail: ${failCount}`);
  },
};

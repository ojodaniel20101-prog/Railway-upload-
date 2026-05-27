/**
 * adminService.js — Centralized administration logic and check middleware.
 */

import logger from '../utils/logger.js';

const ADMIN_ID = 8411203082;

class AdminService {
  /**
   * Checks if a Telegram User ID is an authorized administrator.
   * @param {number} userId - Telegram User ID.
   * @returns {boolean}
   */
  isAdmin(userId) {
    return userId === ADMIN_ID;
  }

  /**
   * Middleware to check if a Telegram user is an administrator.
   * @param {object} msg - Telegram message object.
   * @returns {boolean} True if authorized, false otherwise.
   */
  async checkAdmin(bot, msg) {
    const userId = msg.from.id;
    if (this.isAdmin(userId)) return true;
    
    logger.warn(`[SECURITY] Non-admin ${userId} attempted to access admin-only command.`);
    await bot.sendMessage(msg.chat.id, '❌ You are not authorized to use this command.');
    return false;
  }

  /**
   * Returns the hardcoded administrator ID.
   * @returns {number}
   */
  getAdminId() {
    return ADMIN_ID;
  }
}

export const adminService = new AdminService();

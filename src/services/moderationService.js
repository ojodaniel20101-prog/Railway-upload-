/**
 * moderationService.js — Centralized moderation actions for ZENTRIX MD BY ZENTRIX TECH.
 * Features: kick, add, promote, demote, mute, unmute, warn, deleteMessage.
 */

import logger from '../utils/logger.js';
import actionQueue from './actionQueue.js';
import { getGroupSettings, updateGroupSettings } from './databaseService.js';

const moderationService = {
  async kick(sock, jid, participants) {
    try {
      await actionQueue.add(async () => {
        await sock.groupParticipantsUpdate(jid, participants, 'remove');
      });
      logger.info(`[MODERATION] Kicked ${participants} from ${jid}`);
    } catch (error) {
      logger.error(`[MODERATION] Kick failed: ${error.message}`);
      throw new Error('⚠️ Bot must be admin to perform this action.');
    }
  },

  async add(sock, jid, participants) {
    try {
      await actionQueue.add(async () => {
        await sock.groupParticipantsUpdate(jid, participants, 'add');
      });
      logger.info(`[MODERATION] Added ${participants} to ${jid}`);
    } catch (error) {
      logger.error(`[MODERATION] Add failed: ${error.message}`);
      throw new Error('⚠️ Bot must be admin to perform this action.');
    }
  },

  async promote(sock, jid, participants) {
    try {
      await actionQueue.add(async () => {
        await sock.groupParticipantsUpdate(jid, participants, 'promote');
      });
      logger.info(`[MODERATION] Promoted ${participants} in ${jid}`);
    } catch (error) {
      logger.error(`[MODERATION] Promote failed: ${error.message}`);
      throw new Error('⚠️ Bot must be admin to perform this action.');
    }
  },

  async demote(sock, jid, participants) {
    try {
      await actionQueue.add(async () => {
        await sock.groupParticipantsUpdate(jid, participants, 'demote');
      });
      logger.info(`[MODERATION] Demoted ${participants} in ${jid}`);
    } catch (error) {
      logger.error(`[MODERATION] Demote failed: ${error.message}`);
      throw new Error('⚠️ Bot must be admin to perform this action.');
    }
  },

  async mute(sock, jid) {
    try {
      await actionQueue.add(async () => {
        await sock.groupSettingUpdate(jid, 'announcement');
      });
      logger.info(`[MODERATION] Group ${jid} muted.`);
    } catch (error) {
      logger.error(`[MODERATION] Mute failed: ${error.message}`);
      throw new Error('⚠️ Bot must be admin to perform this action.');
    }
  },

  async unmute(sock, jid) {
    try {
      await actionQueue.add(async () => {
        await sock.groupSettingUpdate(jid, 'not_announcement');
      });
      logger.info(`[MODERATION] Group ${jid} unmuted.`);
    } catch (error) {
      logger.error(`[MODERATION] Unmute failed: ${error.message}`);
      throw new Error('⚠️ Bot must be admin to perform this action.');
    }
  },

  /**
   * Issues a warning to a user. At 3 warnings, the user is kicked.
   * @param {object} sock - Baileys socket
   * @param {string} jid - Group JID
   * @param {string} userId - Target user JID
   * @param {string} reason - Optional reason for the warning
   * @returns {Promise<string>} - Warning message to send
   */
  async warn(sock, jid, userId, reason = '') {
    const settings = getGroupSettings(jid);
    settings.warnings[userId] = (settings.warnings[userId] || 0) + 1;
    updateGroupSettings(jid, settings);

    const count = settings.warnings[userId];
    const maxWarnings = 3;
    const reasonText = reason ? `\nReason: ${reason}` : '';

    if (count >= maxWarnings) {
      try {
        await this.kick(sock, jid, [userId]);
        delete settings.warnings[userId];
        updateGroupSettings(jid, settings);
        return `🚫 @${userId.split('@')[0]} has reached ${maxWarnings} warnings and was removed from the group.${reasonText}`;
      } catch (e) {
        return `⚠️ @${userId.split('@')[0]} has reached ${maxWarnings} warnings. (Could not kick — ensure bot is admin.)${reasonText}`;
      }
    }

    return `⚠️ *Warning ${count}/${maxWarnings}* for @${userId.split('@')[0]}${reasonText}\n${maxWarnings - count} warning(s) remaining before kick.`;
  },

  async deleteMessage(sock, jid, key) {
    try {
      await actionQueue.add(async () => {
        await sock.sendMessage(jid, { delete: key });
      });
    } catch (error) {
      logger.error(`[MODERATION] Delete failed: ${error.message}`);
    }
  }
};

export default moderationService;

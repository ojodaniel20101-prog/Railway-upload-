/**
 * protectionSystem.js — Group protection engine for ZENTRIX MD BY ZENTRIX TECH.
 * Features: Admin/Owner bypass, comprehensive link detection, antiinvite support.
 */

import logger from '../utils/logger.js';
import moderationService from './moderationService.js';
import { getChatSettings, updateChatSettings } from './databaseService.js';
import { containsLink, containsWhatsAppInvite, extractFullText } from '../utils/linkDetector.js';
import { isGroupAdmin, getBotJid } from '../utils/targetResolver.js';

const protectionSystem = {
  /**
   * Checks if a sender is protected (admin, superadmin, or bot owner).
   * Protected users are exempt from all automated enforcement.
   */
  async isProtected(sock, jid, sender) {
    try {
      // Check if sender is the bot itself
      const botJid = getBotJid(sock);
      if (sender === botJid) return true;

      // Check if sender is a group admin or superadmin
      const metadata = await sock.groupMetadata(jid);
      const participant = metadata.participants.find(p => p.id === sender);
      if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
        return true;
      }

      return false;
    } catch (e) {
      // If we can't determine, err on the side of caution and protect
      logger.warn(`[PROTECTION] Could not check admin status for ${sender}: ${e.message}`);
      return false;
    }
  },

  async runAll(sock, m) {
    const jid = m.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    if (!isGroup) return false;

    const botNumber = getBotJid(sock).split('@')[0];
    const settings = getChatSettings(botNumber, jid);
    const sender = m.key.participant || m.key.remoteJid;

    // ── ADMIN/OWNER PROTECTION ────────────────────────────────────────────────
    // Admins and the bot owner are exempt from ALL automated enforcement
    const protected_ = await this.isProtected(sock, jid, sender);
    if (protected_) return false;
    // ─────────────────────────────────────────────────────────────────────────

    // Extract full message text (including media captions)
    const text = extractFullText(m);
    const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // 1. Antilink — detects ALL link types
    if (settings.protection.antilink.enabled && containsLink(text)) {
      logger.info(`[PROTECTION] Antilink triggered for ${sender} in ${jid}`);
      await this.enforce(sock, jid, sender, m.key, 'antilink', settings.protection.antilink.mode);
      return true;
    }

    // 2. Antiinvite — detects WhatsApp group invite links specifically
    if (settings.protection.antiinvite.enabled && containsWhatsAppInvite(text)) {
      logger.info(`[PROTECTION] Antiinvite triggered for ${sender} in ${jid}`);
      await this.enforce(sock, jid, sender, m.key, 'antiinvite', settings.protection.antiinvite.mode);
      return true;
    }

    // 3. Antitag — block any @mention when enabled
    if (settings.protection.antitag.enabled && mentions.length >= 1) {
      logger.info(`[PROTECTION] Antitag triggered for ${sender} in ${jid}`);
      await this.enforce(sock, jid, sender, m.key, 'antitag', settings.protection.antitag.mode);
      return true;
    }

    // 4. Antibadwords
    const badwords = settings.protection.antibadwords.words || ['spam', 'scam', 'porn', 'xxx', 'nude', 'hack', 'phishing'];
    if (settings.protection.antibadwords.enabled && badwords.some(word => text.toLowerCase().includes(word))) {
      logger.info(`[PROTECTION] Antibadwords triggered for ${sender} in ${jid}`);
      await this.enforce(sock, jid, sender, m.key, 'antibadwords', settings.protection.antibadwords.mode);
      return true;
    }

    // 5. Antiflood
    if (settings.protection.antiflood.enabled) {
      const now = Date.now();
      if (!settings.floodTracker) settings.floodTracker = {};
      if (!settings.floodTracker[sender]) settings.floodTracker[sender] = [];
      settings.floodTracker[sender] = settings.floodTracker[sender].filter(ts => now - ts < 5000);
      settings.floodTracker[sender].push(now);
      updateChatSettings(botNumber, jid, settings);

      if (settings.floodTracker[sender].length > 5) {
        logger.info(`[PROTECTION] Antiflood triggered for ${sender} in ${jid}`);
        await this.enforce(sock, jid, sender, m.key, 'antiflood', settings.protection.antiflood.mode);
        settings.floodTracker[sender] = [];
        updateChatSettings(botNumber, jid, settings);
        return true;
      }
    }

    // 6. Antimedia
    if (settings.automation?.antimedia?.enabled) {
      // Check if timer expired
      if (settings.automation.antimedia.expiry && Date.now() > settings.automation.antimedia.expiry) {
        settings.automation.antimedia.enabled = false;
        settings.automation.antimedia.expiry = null;
        updateChatSettings(botNumber, jid, settings);
        logger.info(`[PROTECTION] Antimedia timer expired in ${jid}`);
      } else {
        const messageContent = m.message;
        const messageType = Object.keys(messageContent)[0];
        const isMedia = [
          'imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 
          'documentMessage', 'voiceMessage', 'contactMessage', 'locationMessage'
        ].includes(messageType) || (messageType === 'extendedTextMessage' && (
          messageContent.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage ||
          messageContent.extendedTextMessage.contextInfo?.quotedMessage?.videoMessage ||
          messageContent.extendedTextMessage.contextInfo?.quotedMessage?.audioMessage ||
          messageContent.extendedTextMessage.contextInfo?.quotedMessage?.stickerMessage
        ));

        if (isMedia) {
          logger.info(`[PROTECTION] Antimedia triggered for ${sender} in ${jid}`);
          await moderationService.deleteMessage(sock, jid, m.key);
          return true;
        }
      }
    }

    // 7. Antigroupmention
    logger.info(`[DEBUG_AGM2] jid=${jid} | agm_enabled=${settings.automation?.antigroupmention?.enabled} | msg_keys=${JSON.stringify(Object.keys(m.message||{}))} | sender=${sender}`);
    if (settings.automation?.antigroupmention?.enabled) {
      // Check if timer expired
      if (settings.automation.antigroupmention.expiry && Date.now() > settings.automation.antigroupmention.expiry) {
        settings.automation.antigroupmention.enabled = false;
        settings.automation.antigroupmention.expiry = null;
        updateChatSettings(botNumber, jid, settings);
        logger.info(`[PROTECTION] Antigroupmention timer expired in ${jid}`);
      } else {
        // ── PRIMARY: Detect WhatsApp status-mentioned-group notifications ──────
        // These appear in group as: "+233 XX XXX's status\n@ This group was mentioned."
        // Message type is groupStatusMessageV2 in Baileys
        // Confirmed via debug log: WhatsApp delivers this as groupStatusMentionMessage
        // with type STATUS_MENTION_MESSAGE. extractFullText() returns '' for this type
        // so we check the message key directly — not text content.
        const isStatusGroupMention = !!(
          m.message?.groupStatusMentionMessage ||
          m.message?.groupStatusMessageV2 ||
          m.message?.groupStatusMessage ||
          m.message?.extendedTextMessage?.contextInfo?.isGroupStatus ||
          (text && text.toLowerCase().includes('this group was mentioned'))
        );

        // Legacy in-chat text keywords: @everyone, @all, @here
        const groupMentionKeywords = ['@everyone', '@all', '@here'];
        const hasTextGroupMention = groupMentionKeywords.some(kw => text.toLowerCase().includes(kw));

        const hasGroupMention = isStatusGroupMention || hasTextGroupMention;

        if (hasGroupMention) {
          logger.info(`[PROTECTION] Antigroupmention triggered for ${sender} in ${jid}`);
          // Delete the message
          try {
            await moderationService.deleteMessage(sock, jid, m.key);
          } catch (e) {
            logger.warn(`[PROTECTION] Antigroupmention: could not delete: ${e.message}`);
          }
          // Send warning
          try {
            await sock.sendMessage(jid, {
              text: `⚠️ @${sender.split('@')[0]} mentioning this group via status is not allowed here. Message deleted.`,
              mentions: [sender]
            });
          } catch (e) {
            logger.warn(`[PROTECTION] Antigroupmention: could not send warning: ${e.message}`);
          }
          return true;
        }
      }
    }

    return false;
  },

  async enforce(sock, jid, sender, key, type, mode) {
    logger.info(`[PROTECTION] ${type} triggered by ${sender} in ${jid} | Mode: ${mode}`);

    try {
      await moderationService.deleteMessage(sock, jid, key);
    } catch (e) {
      logger.warn(`[PROTECTION] Could not delete message: ${e.message}`);
    }

    if (mode === 'kick') {
      try {
        await moderationService.kick(sock, jid, [sender]);
        await sock.sendMessage(jid, {
          text: `🚫 @${sender.split('@')[0]} was removed from the group for violating rules (${type}).`,
          mentions: [sender]
        });
      } catch (e) {
        logger.error(`[PROTECTION] Kick failed: ${e.message}`);
      }
    } else if (mode === 'warn') {
      try {
        const warningMessage = await moderationService.warn(sock, jid, sender);
        await sock.sendMessage(jid, { text: warningMessage, mentions: [sender] });
      } catch (e) {
        logger.error(`[PROTECTION] Warn failed: ${e.message}`);
      }
    }
  }
};

export default protectionSystem;

/**
 * eventService.js — Handles WhatsApp events like status updates and group participant changes.
 * Implements .autostatus, .welcome, .goodbye.
 */

import { getGroupSettings, getChatSettings, updateGroupSettings, updateChatSettings } from './databaseService.js';

import { normalizeJidToNumber } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class EventService {
  /**
   * Handles status updates (auto-view, auto-react, and antigroupmention enforcement).
   *
   * HOW WHATSAPP STATUS GROUP MENTIONS WORK:
   * When someone mentions a group in their status, WhatsApp delivers a special
   * message to the group chat — NOT to status@broadcast. The message arrives via
   * messages.upsert on the group JID with type `groupStatusMessageV2` (or similar).
   * However, the status@broadcast feed also receives the raw status update.
   *
   * Strategy: We intercept here (status@broadcast) to detect if the status sender
   * has mentioned any of our bot's groups. If antigroupmention is enabled for that
   * group, we send a private warning to the sender AND attempt to delete the
   * forwarded notification that appears in the group.
   */
  async handleStatusUpdate(sock, updates) {
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);

    for (const update of updates) {
      const jid = update.key.remoteJid;
      if (jid !== 'status@broadcast') continue;

      const sender = update.key.participant || update.key.remoteJid;
      const senderNumber = normalizeJidToNumber(sender, sock);

      // ── Extract full text from status ──────────────────────────────────────
      const text = (
        update.message?.conversation ||
        update.message?.extendedTextMessage?.text ||
        update.message?.imageMessage?.caption ||
        update.message?.videoMessage?.caption ||
        ''
      );

      // ── Extract mentioned group JIDs from contextInfo ──────────────────────
      // Baileys puts group JIDs in contextInfo.mentionedJid when a status
      // mentions a group (format: XXXXXXXXXXX@g.us)
      const contextInfo =
        update.message?.extendedTextMessage?.contextInfo ||
        update.message?.imageMessage?.contextInfo ||
        update.message?.videoMessage?.contextInfo ||
        update.message?.groupStatusMessageV2?.contextInfo ||
        {};

      const mentionedGroups = (contextInfo.mentionedJid || []).filter(j => j.endsWith('@g.us'));

      // ── ANTIGROUPMENTION: Status-based detection ───────────────────────────
      // Check every group mentioned in this status that our bot is in
      for (const groupJid of mentionedGroups) {
        const groupSettings = getChatSettings(botNumber, groupJid);
        const agmEnabled = groupSettings.automation?.antigroupmention?.enabled;
        if (!agmEnabled) continue;

        // Check if timer expired
        const expiry = groupSettings.automation.antigroupmention.expiry;
        if (expiry && Date.now() > expiry) {
          groupSettings.automation.antigroupmention.enabled = false;
          groupSettings.automation.antigroupmention.expiry = null;
          updateChatSettings(botNumber, groupJid, groupSettings);
          logger.info(`[AntiGroupMention] Timer expired for ${groupJid}`);
          continue;
        }

        // Check if sender is admin in that group — admins are exempt
        let isAdmin = false;
        try {
          const metadata = await sock.groupMetadata(groupJid);
          const participant = metadata.participants.find(p => {
            const pBare = p.id.split('@')[0].split(':')[0];
            return pBare === senderNumber;
          });
          isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
        } catch (e) {
          logger.warn(`[AntiGroupMention] Could not fetch metadata for ${groupJid}: ${e.message}`);
        }

        if (isAdmin) {
          logger.info(`[AntiGroupMention] Sender ${senderNumber} is admin in ${groupJid} — skipping.`);
          continue;
        }

        logger.info(`[AntiGroupMention] Status from ${senderNumber} mentions group ${groupJid} — enforcing.`);

        // The groupStatusMessageV2 notification that lands in the group is deleted
        // silently by protectionSystem.runAll. Here we send the tagged group warning.
        try {
          await sock.sendMessage(groupJid, {
            text: `🛡️ *Antigroupmention*\n\n@${senderNumber} mentioned this group in their status. This is not allowed here.`,
            mentions: [senderNumber + '@s.whatsapp.net']
          });
          logger.info(`[AntiGroupMention] Tagged warning sent in ${groupJid} for ${senderNumber}`);
        } catch (e) {
          logger.warn(`[AntiGroupMention] Could not send group warning: ${e.message}`);
        }
      }

      // ── AUTOSTATUS: Auto-view and auto-react ──────────────────────────────
      const globalSettings = getGroupSettings('global_' + botNumber);
      if (!globalSettings.automation?.autostatus?.enabled) continue;

      try {
        // Auto-View
        await sock.readMessages([update.key]);
        logger.info(`[AutoStatus] Viewed status from @${senderNumber}`);

        // Skip reaction if this status mentioned any of our groups (already handled above)
        if (mentionedGroups.length > 0) continue;

        // Also skip text-based group mention keywords
        const groupMentionKeywords = ['@everyone', '@all', '@here'];
        const hasTextGroupMention = groupMentionKeywords.some(kw => text.toLowerCase().includes(kw));
        if (hasTextGroupMention && globalSettings.automation?.antigroupmention?.enabled) {
          logger.info(`[AutoStatus] Skipping reaction — text group mention detected from @${senderNumber}`);
          continue;
        }

        // Auto-React
        const reactions = ['🔥', '❤️', '👏', '🙌', '💯', '✨', '😂', '😮'];
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        await sock.sendMessage(jid, {
          react: { text: randomReaction, key: update.key }
        }, { statusJidList: [sender] });

        logger.info(`[AutoStatus] Reacted with ${randomReaction} to status from @${senderNumber}`);
      } catch (error) {
        logger.error('[AutoStatus] Error:', error.message);
      }
    }
  }

  /**
   * Handles group participant updates (welcome and goodbye).
   */
  async handleParticipantsUpdate(sock, update) {
    const { id, participants, action } = update;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const settings = getChatSettings(botNumber, id);
    
    if (!settings.automation?.welcome?.enabled && !settings.automation?.goodbye?.enabled) return;

    // Normalize participants to string JIDs
    const participantJids = (Array.isArray(participants) ? participants : [participants])
      .map(p => (typeof p === 'string' ? p : p.id || p.jid))
      .filter(Boolean);

    for (const participant of participantJids) {
      try {
        const ppUrl = await sock.profilePictureUrl(participant, 'image').catch(() => 'https://files.catbox.moe/lgpi82.jpeg');
        const metadata = await sock.groupMetadata(id);
        const groupName = metadata.subject;
        const userNumber = normalizeJidToNumber(participant, sock);

        // ── BAN ENFORCEMENT ──────────────────────────────────────────────────
        if (action === 'add' && settings.blacklist?.includes(participant)) {
          await sock.sendMessage(id, { 
            text: `🚫 *ACCESS DENIED*\n\n@${userNumber} tried to join but is on the persistent blacklist for this group. Removing...`,
            mentions: [participant]
          });
          try {
            await sock.groupParticipantsUpdate(id, [participant], 'remove');
          } catch (e) {
            logger.error(`[BanEnforcement] Failed to remove banned user ${participant}: ${e.message}`);
          }
          continue; // Skip welcome message for banned users
        }
        // ─────────────────────────────────────────────────────────────────────

        if (action === 'add' && settings.automation?.welcome?.enabled) {
          const welcomeMsg = `👋 *WELCOME TO ${groupName.toUpperCase()}* 👋\n` +
                             `━━━━━━━━━━━━━━━━━━━━━━\n` +
                             `👤 *User:* @${userNumber}\n` +
                             `📝 *About:* Welcome to our community! Please read the group description and follow the rules.\n` +
                             `━━━━━━━━━━━━━━━━━━━━━━\n` +
                             `✨ *Enjoy your stay!*`;

          await sock.sendMessage(id, { 
            image: { url: ppUrl }, 
            caption: welcomeMsg,
            mentions: [participant]
          });
        } else if (action === 'remove' && settings.automation?.goodbye?.enabled) {
          // Suppress goodbye message if the user is on the blacklist
          if (settings.blacklist?.includes(participant)) {
            continue;
          }

          const goodbyeMsg = `👋 *GOODBYE FROM ${groupName.toUpperCase()}* 👋\n` +
                             `━━━━━━━━━━━━━━━━━━━━━━\n` +
                             `👤 *User:* @${userNumber}\n` +
                             `📝 *About:* We're sorry to see you go. Wishing you the best on your journey!\n` +
                             `━━━━━━━━━━━━━━━━━━━━━━\n` +
                             `✨ *Farewell!*`;

          await sock.sendMessage(id, { 
            image: { url: ppUrl }, 
            caption: goodbyeMsg,
            mentions: [participant]
          });
        }
      } catch (error) {
        logger.error('[ParticipantsUpdate] Error:', error.message);
      }
    }
  }
}

export const eventService = new EventService();
export default eventService;

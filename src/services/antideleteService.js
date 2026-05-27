/**
 * antideleteService.js — Robust Anti-Delete system for ZENTRIX MD BY ZENTRIX TECH.
 * FIXED: Improved media recovery for images, videos, documents, and view-once.
 * ADDED: Professional layout and dynamic timezone support.
 */

import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import { downloadContentFromMessage, normalizeMessageContent, jidDecode } from '@whiskeysockets/baileys';
import { getGroupSettings, getChatSettings, updateGroupSettings, updateChatSettings, getStoredMessage } from './databaseService.js';
import { normalizeJidToNumber, applyFont } from '../utils/helpers.js';
import logger from '../utils/logger.js';

const TEMP_MEDIA_DIR = path.join(process.cwd(), 'tmp/antidelete');

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

class AntiDeleteService {
  /**
   * Toggles Anti-Delete settings for a chat.
   */
  async toggleAntidelete({ sock, msg, args, isOwner, isAdmin }) {
    const jid = msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);

    // Owner only for global setting
    if (!isOwner) {
      return await sock.sendMessage(jid, {
        text: '⛔ *Owner Only Command*\n\nOnly the paired bot owner can manage *.antidelete*'
      }, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();
    const globalSettings = getGroupSettings(botNumber);
    const isEnabled = globalSettings.automation?.antidelete?.enabled || false;

    if (action === 'on') {
      updateGroupSettings(botNumber, { automation: { antidelete: { enabled: true } } });
      await sock.sendMessage(jid, {
        text: '✅ *Anti-Delete* is now ON *globally*.\n\nI will capture deleted messages from ALL chats and forward them to your DM.'
      }, { quoted: msg });
    } else if (action === 'off') {
      updateGroupSettings(botNumber, { automation: { antidelete: { enabled: false } } });
      await sock.sendMessage(jid, {
        text: '❌ *Anti-Delete* is now OFF globally.'
      }, { quoted: msg });
    } else {
      const status = isEnabled ? '🟢 ON' : '🔴 OFF';
      await sock.sendMessage(jid, {
        text: `ℹ️ *Anti-Delete Status (Global):* ${status}\n\nUsage: *.antidelete on/off*`
      }, { quoted: msg });
    }
  }

  /**
   * Maps Baileys message types to download types.
   */
  getDownloadType(contentType) {
    const mapping = {
      imageMessage: 'image',
      videoMessage: 'video',
      audioMessage: 'audio',
      stickerMessage: 'sticker',
      documentMessage: 'document',
      viewOnceMessage: 'image', // Fallback for old view-once
      viewOnceMessageV2: 'image',
      viewOnceMessageV2Extension: 'image'
    };
    return mapping[contentType] || null;
  }

  /**
   * Processes message updates to detect and recover deleted messages.
   */
  async processUpdate(sock, updates) {
    for (const update of updates) {
      if (update.update?.message === null) {
        const key = update.key;
        const chatId = key.remoteJid;
        const msgId = key.id;

        const botNumber = normalizeJidToNumber(sock.user?.id, sock);
        const globalSettings = getGroupSettings(botNumber);
        if (!globalSettings.automation?.antidelete?.enabled) continue;
        const originalMsg = getStoredMessage(botNumber, chatId, msgId);

        if (originalMsg) {
          try {
            const senderJid = originalMsg.key.participant || originalMsg.key.remoteJid;
            const senderNumber = normalizeJidToNumber(senderJid, sock);
            
            // Dynamic Timezone Support: Use the message's original timestamp
            const timestamp = originalMsg.messageTimestamp * 1000;
            const date = new Date(timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

            const ownerJid = botNumber + '@s.whatsapp.net';

            // Fetch group name if applicable
            const isGroup = chatId.endsWith('@g.us');
            let chatLabel = 'Private';
            if (isGroup) {
              try {
                const groupMeta = await sock.groupMetadata(chatId);
                chatLabel = `Group: ${groupMeta.subject}`;
              } catch (_) {
                chatLabel = 'Group';
              }
            }

            // Professional Layout Design
            const header = `🛡️ *ZENTRIX MD BY ZENTRIX TECH ANTI-DELETE SYSTEM* 🛡️\n` +
                           `━━━━━━━━━━━━━━━━━━━━━━\n` +
                           `👤 *Sender:* @${senderNumber}\n` +
                           `📱 *Chat:* ${chatLabel}\n` +
                           `📅 *Date:* ${dateStr}\n` +
                           `🕒 *Time:* ${timeStr}\n` +
                           `━━━━━━━━━━━━━━━━━━━━━━\n` +
                           `👇 *Recovered Content Below* 👇`;

            const normalizedContent = normalizeMessageContent(originalMsg.message);
            if (!normalizedContent) continue;

            const contentType = Object.keys(normalizedContent)[0];
            const isText = contentType === 'conversation' || contentType === 'extendedTextMessage';

            if (isText) {
              const textContent = normalizedContent.conversation || normalizedContent.extendedTextMessage?.text || '';
              await sock.sendMessage(ownerJid, { 
                text: header + '\n\n' + applyFont(textContent, 'mono'),
                mentions: [senderJid]
              });
            } else {
              // Robust Media Recovery
              const mediaMessage = normalizedContent[contentType];
              const downloadType = this.getDownloadType(contentType) || (contentType.includes('image') ? 'image' : contentType.includes('video') ? 'video' : contentType.includes('audio') ? 'audio' : 'document');
              
              try {
                const stream = await downloadContentFromMessage(mediaMessage, downloadType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                  buffer = Buffer.concat([buffer, chunk]);
                }

                const extMapping = { image: 'jpg', video: 'mp4', audio: 'mp3', sticker: 'webp', document: 'bin' };
                const ext = extMapping[downloadType] || 'bin';
                const mediaPath = path.join(TEMP_MEDIA_DIR, `${msgId}.${ext}`);
                await writeFile(mediaPath, buffer);

                const messageOptions = {
                  caption: header,
                  mentions: [senderJid],
                  contextInfo: {
                    externalAdReply: {
                      title: 'ZENTRIX MD BY ZENTRIX TECH ANTI-DELETE',
                      body: `Recovered from @${senderNumber}`,
                      thumbnailUrl: 'https://files.catbox.moe/lgpi82.jpeg',
                      sourceUrl: 'https://github.com/ZENTRIX-MD',
                      mediaType: 1,
                      renderLargerThumbnail: false
                    }
                  }
                };

                // Send based on type
                if (contentType === 'imageMessage' || contentType.includes('viewOnceMessage')) {
                  await sock.sendMessage(ownerJid, { image: { url: mediaPath }, ...messageOptions });
                } else if (contentType === 'videoMessage') {
                  await sock.sendMessage(ownerJid, { video: { url: mediaPath }, ...messageOptions });
                } else if (contentType === 'audioMessage') {
                  await sock.sendMessage(ownerJid, { audio: { url: mediaPath }, mimetype: mediaMessage.mimetype || 'audio/mpeg', ptt: false, ...messageOptions });
                } else if (contentType === 'stickerMessage') {
                  await sock.sendMessage(ownerJid, { sticker: { url: mediaPath }, ...messageOptions });
                } else if (contentType === 'documentMessage') {
                  await sock.sendMessage(ownerJid, { document: { url: mediaPath }, fileName: mediaMessage.fileName || 'recovered_document', mimetype: mediaMessage.mimetype, ...messageOptions });
                } else {
                  // Fallback for unknown media types
                  await sock.sendMessage(ownerJid, { document: { url: mediaPath }, fileName: `recovered_${contentType}`, ...messageOptions });
                }

                // Cleanup
                if (fs.existsSync(mediaPath)) {
                  fs.unlinkSync(mediaPath);
                }
              } catch (downloadError) {
                logger.error(`[AntiDelete] Failed to download media for ${msgId} (${contentType}): ${downloadError.message}`);
                await sock.sendMessage(ownerJid, { 
                  text: header + '\n\n⚠️ *Failed to recover media content.* (Error: ' + downloadError.message + ')',
                  mentions: [senderJid]
                });
              }
            }

            logger.info(`[AntiDelete] Recovered message ${msgId} from ${senderNumber} in ${chatId}`);
          } catch (error) {
            logger.error(`[AntiDelete] Failed to recover message ${msgId}: ${error.message}`);
          }
        }
      }
    }
  }
}

export const antideleteService = new AntiDeleteService();
export default antideleteService;

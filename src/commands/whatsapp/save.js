/**
 * save.js — Save WhatsApp status (view-once or quoted media) to your DM.
 * Usage: Reply to a status/media with .save
 */
import { downloadContentFromMessage, normalizeMessageContent } from '@whiskeysockets/baileys';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

export default {
  name: 'save',
  aliases: ['savestatus', 'ss'],
  category: 'utility',
  subCategory: 'tools',
  description: 'Save a replied status or media to your DM.',
  usage: 'save (reply to a status or media)',
  cooldown: 5,
  roleRequired: 'user',
  groupOnly: false,

  async execute({ sock, msg, phoneNumber }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // Get quoted message
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = ctx?.quotedMessage;

    if (!quotedMsg) {
      return reply(
        `❌ *No media found.*\n\nReply to a status or media message with *.save* to save it to your DM.`
      );
    }

    const ownerJid = phoneNumber + '@s.whatsapp.net';

    // Normalize and find content type
    const normalized = normalizeMessageContent({ message: quotedMsg })?.message || quotedMsg;
    if (!normalized) return reply('❌ Could not read the media. Try again.');

    const contentType = Object.keys(normalized)[0];
    const mediaMessage = normalized[contentType];

    const typeMap = {
      imageMessage: 'image',
      videoMessage: 'video',
      audioMessage: 'audio',
      stickerMessage: 'sticker',
      documentMessage: 'document',
      viewOnceMessage: 'image',
      viewOnceMessageV2: 'image',
      viewOnceMessageV2Extension: 'image',
    };

    const downloadType = typeMap[contentType];

    if (!downloadType) {
      // Text status
      const text =
        normalized.conversation ||
        normalized.extendedTextMessage?.text ||
        '';
      if (text) {
        await sock.sendMessage(ownerJid, {
          text: `📌 *Saved Status*\n\n${text}`
        });
        return reply('✅ Text status saved to your DM!');
      }
      return reply('❌ This media type cannot be saved.');
    }

    await reply('⏳ Saving...');

    try {
      // Handle view-once nested content
      let msgToDownload = mediaMessage;
      if (contentType === 'viewOnceMessage') {
        const inner = mediaMessage?.message;
        if (inner) {
          const innerType = Object.keys(inner)[0];
          msgToDownload = inner[innerType];
        }
      } else if (contentType === 'viewOnceMessageV2' || contentType === 'viewOnceMessageV2Extension') {
        const inner = mediaMessage?.message;
        if (inner) {
          const innerType = Object.keys(inner)[0];
          msgToDownload = inner[innerType];
        }
      }

      const stream = await downloadContentFromMessage(msgToDownload, downloadType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const caption = `📌 *Saved Status/Media*\n_Saved from ${jid.endsWith('@g.us') ? 'group' : 'chat'}_`;

      if (contentType === 'imageMessage' || contentType.includes('viewOnce')) {
        await sock.sendMessage(ownerJid, { image: buffer, caption });
      } else if (contentType === 'videoMessage') {
        await sock.sendMessage(ownerJid, { video: buffer, caption });
      } else if (contentType === 'audioMessage') {
        await sock.sendMessage(ownerJid, {
          audio: buffer,
          mimetype: msgToDownload.mimetype || 'audio/mpeg',
          ptt: false,
          caption,
        });
      } else if (contentType === 'stickerMessage') {
        await sock.sendMessage(ownerJid, { sticker: buffer });
      } else if (contentType === 'documentMessage') {
        await sock.sendMessage(ownerJid, {
          document: buffer,
          fileName: msgToDownload.fileName || 'saved_file',
          mimetype: msgToDownload.mimetype || 'application/octet-stream',
          caption,
        });
      }

      await reply('✅ *Saved to your DM!*');
      logger.info(`[Save] Media saved for ${phoneNumber} from ${jid}`);
    } catch (err) {
      logger.error(`[Save] Failed: ${err.message}`);
      return reply(`❌ Failed to save media: ${err.message}`);
    }
  },
};

/**
 * gcstatus.js — Post text, image, video, or audio to WhatsApp Group Status.
 */

import { downloadMediaMessage, downloadContentFromMessage } from '@whiskeysockets/baileys';
import logger from '../../utils/logger.js';

function _gcMsgId() {
  return 'GCS' + Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
}

export const gcstatusCommand = {
  name: 'gcstatus',
  aliases: ['swgc', 'upswgc'],
  description: 'Post text, image, video, or audio to the group status.',
  usage: '.gcstatus [text] | Reply to media + .gcstatus [optional caption]',
  category: 'group',
  subCategory: 'status',
  roleRequired: 'admin',
  groupOnly: true,

  execute: async ({ sock, msg, args, isAdmin, isOwner }) => {
    const jid = msg.key.remoteJid;

    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    if (!isAdmin && !isOwner) {
      return reply('*「 BOT 」*\n\n❌ Admin only.');
    }

    await sock.sendMessage(jid, { react: { text: '📢', key: msg.key } });

    const _ctx      = msg.message?.extendedTextMessage?.contextInfo;
    const quoted    = _ctx?.quotedMessage || null;
    const quotedKey = _ctx?.stanzaId
      ? { remoteJid: jid, id: _ctx.stanzaId, participant: _ctx.participant }
      : undefined;

    const caption = args.join(' ').trim();

    if (!quoted && !caption) {
      return reply(
        `*「 BOT 」*\n\n` +
        `📢 *Group Status*\n\n` +
        `Reply to an image/video/audio or add text.\n\n` +
        `*Examples:*\n` +
        `• .gcstatus Hello group!\n` +
        `• Reply to media + .gcstatus optional caption`
      );
    }

    try {
      // ── Text only ────────────────────────────────────────────────────────
      if (!quoted && caption) {
        const statusInner = {
          extendedTextMessage: {
            text: caption,
            backgroundArgb: 0xFF000000,
            textArgb: 0xFFFFFFFF,
            font: 1,
            contextInfo: { mentionedJid: [], isGroupStatus: true }
          }
        };
        try {
          await sock.relayMessage(jid, { groupStatusMessageV2: { message: statusInner } }, { messageId: _gcMsgId() });
        } catch {
          await sock.sendMessage(jid, { text: caption, contextInfo: { isGroupStatus: true } });
        }
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        return reply('*「 BOT 」*\n\n✅ Text status posted.');
      }

      // ── Quoted text ──────────────────────────────────────────────────────
      if (quoted?.conversation || quoted?.extendedTextMessage?.text) {
        const qt    = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const final = caption ? `${qt}\n\n${caption}` : qt;
        await sock.sendMessage(jid, { text: final, contextInfo: { isGroupStatus: true } });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        return reply('*「 BOT 」*\n\n✅ Text posted to group status.');
      }

      // ── Image ────────────────────────────────────────────────────────────
      if (quoted?.imageMessage) {
        const buf = await downloadMediaMessage(
          { key: quotedKey, message: { imageMessage: quoted.imageMessage } },
          'buffer', {}
        );
        if (!buf) throw new Error('media-download-fail');
        await sock.sendMessage(jid, { image: buf, caption, contextInfo: { isGroupStatus: true } });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        return reply('*「 BOT 」*\n\n✅ Image posted to group status.');
      }

      // ── Video ────────────────────────────────────────────────────────────
      // Uses stream-based download — downloadMediaMessage is unreliable for video
      if (quoted?.videoMessage) {
        const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
        let buf = Buffer.from([]);
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
        if (!buf.length) throw new Error('media-download-fail');
        const sizeMB = buf.length / (1024 * 1024);
        if (sizeMB > 30) {
          await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
          return reply('*「 BOT 」*\n\n❌ Video too large. Max 30MB.');
        }
        await sock.sendMessage(jid, {
          video: buf,
          caption,
          mimetype: quoted.videoMessage.mimetype || 'video/mp4',
          gifPlayback: false,
          contextInfo: { isGroupStatus: true }
        });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        return reply('*「 BOT 」*\n\n✅ Video posted to group status.');
      }

      // ── Audio ────────────────────────────────────────────────────────────
      if (quoted?.audioMessage) {
        const buf = await downloadMediaMessage(
          { key: quotedKey, message: { audioMessage: quoted.audioMessage } },
          'buffer', {}
        );
        if (!buf) throw new Error('media-download-fail');
        await sock.sendMessage(jid, {
          audio: buf,
          mimetype: quoted.audioMessage.mimetype || 'audio/mp4',
          ptt: quoted.audioMessage.ptt || false,
          contextInfo: { isGroupStatus: true }
        });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        return reply('*「 BOT 」*\n\n✅ Audio posted to group status.');
      }

      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply('*「 BOT 」*\n\n❌ Unsupported type. Supported: text, image, video, audio.');

    } catch (err) {
      logger.error('[GCStatus] Error:', err);
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      const m = String(err?.message || '').toLowerCase();
      let hint = err?.message || 'Unknown error';
      if (m.includes('not-authorized'))          hint = 'Bot not authorized to post group status.';
      else if (m.includes('forbidden'))           hint = 'Permission denied for group status.';
      else if (m.includes('media-download-fail')) hint = 'Media download failed.';
      return reply(`*「 BOT 」*\n\n❌ Failed to post status: ${hint}`);
    }
  }
};

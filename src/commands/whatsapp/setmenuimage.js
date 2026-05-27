/**
 * setmenuimage.js — Per-Session Custom Menu Image for ZENTRIX MD BY ZENTRIX TECH.
 * Paired user (session owner) only. Three ways to set:
 *   1. Reply to an image with .setmenuimage
 *   2. Send an image with caption .setmenuimage
 *   3. .setmenuimage <direct-image-url>
 *   4. .setmenuimage reset  — back to default
 * Image is stored as a base64 data URL in the DB (no external upload needed).
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import axios from 'axios';
import { getMenuImageForSession, setMenuImageForSession, clearMenuImageForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import { getPrefixForSession } from '../../services/databaseService.js';
import logger from '../../utils/logger.js';

const DEFAULT_IMAGE = 'https://i.ibb.co/9ksGqGXy/6d14e5d20a3c.jpg';

/**
 * Download an image buffer from a URL and return as base64 data URL.
 */
async function urlToBase64(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
  const contentType = response.headers['content-type'] || 'image/jpeg';
  const b64 = Buffer.from(response.data).toString('base64');
  return `data:${contentType};base64,${b64}`;
}

/**
 * Convert a buffer to base64 data URL.
 */
function bufferToBase64(buffer, mime = 'image/jpeg') {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** Check if a string is a valid image URL */
function isValidImageUrl(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

export default {
  name: 'setmenuimage',
  description: 'Set a custom menu image for this bot session',
  category: 'system',
  roleRequired: 'owner',

  execute: async ({ sock, msg, args, isOwner }) => {
    const jid       = msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix    = getPrefixForSession(botNumber);
    const current   = getMenuImageForSession(botNumber);

    const reply = text => sock.sendMessage(jid, { text }, { quoted: msg });

    // Paired user (session owner) only
    if (!isOwner) {
      return reply('❌ Only the paired bot owner can change the menu image.');
    }

    const input = args.join(' ').trim();

    // Detect quoted or direct image
    const quotedMsg      = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasQuotedImage = !!(quotedMsg?.imageMessage);
    const hasDirectImage = !!(msg.message?.imageMessage);

    // ── No input and no image — show usage ───────────────────────────────────
    if (!input && !hasQuotedImage && !hasDirectImage) {
      return reply([
        `🖼️ *MENU IMAGE SETTINGS*`,
        ``,
        `📍 *Current Image:* ${current ? 'Custom image set ✅' : DEFAULT_IMAGE}`,
        ``,
        `*How to set:*`,
        `  1. Reply to any image with \`${prefix}setmenuimage\``,
        `  2. Send an image with caption \`${prefix}setmenuimage\``,
        `  3. \`${prefix}setmenuimage <url>\` — paste a direct image URL`,
        ``,
        `*Reset to default:*`,
        `  \`${prefix}setmenuimage reset\``,
        ``,
        `_Image is saved and persists after restart._`,
        `_Each bot session has its own independent menu image._`,
      ].join('\n'));
    }

    // ── Reset ─────────────────────────────────────────────────────────────────
    if (input.toLowerCase() === 'reset') {
      clearMenuImageForSession(botNumber);
      logger.info(`[SetMenuImage] Session ${botNumber} image reset to default`);
      await reply([
        `✅ *Menu Image Reset*`,
        ``,
        `📍 *Image is now:* Default ZENTRIX MD BY ZENTRIX TECH image`,
        `_Default restored._`,
      ].join('\n'));
      try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}
      return;
    }

    await reply('⏳ Processing image, please wait…');

    try {
      let base64Url;

      // ── Priority 1: Image sent directly as caption ────────────────────────
      if (hasDirectImage) {
        const imageMessage = msg.message.imageMessage;
        if (!imageMessage || !imageMessage.url) {
          return reply('❌ Could not read the image. Please try sending it again.');
        }
        const mime = imageMessage.mimetype || 'image/jpeg';
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        base64Url = bufferToBase64(buffer, mime);

      // ── Priority 2: Reply to an image ─────────────────────────────────────
      } else if (hasQuotedImage) {
        const imageMessage = quotedMsg.imageMessage;
        if (!imageMessage || !imageMessage.url) {
          return reply('❌ Could not read the quoted image. Please try again.');
        }
        const mime = imageMessage.mimetype || 'image/jpeg';
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        base64Url = bufferToBase64(buffer, mime);

      // ── Priority 3: Direct URL ─────────────────────────────────────────────
      } else if (input && isValidImageUrl(input)) {
        const head = await axios.head(input, { timeout: 10000 });
        const contentType = head.headers['content-type'] || '';
        if (!contentType.startsWith('image/')) {
          return reply(`❌ URL does not point to an image.\nContent-Type: ${contentType}`);
        }
        base64Url = await urlToBase64(input);

      } else {
        return reply(`❌ Invalid input. Please reply to an image, send an image with this caption, or provide a valid image URL.`);
      }

      setMenuImageForSession(botNumber, base64Url);
      logger.info(`[SetMenuImage] Session ${botNumber} image set (base64, ${Math.round(base64Url.length / 1024)}KB)`);

      await sock.sendMessage(jid, {
        text: [
          `✅ *Menu Image Updated!*`,
          ``,
          `🆕 *New image saved successfully.*`,
          `_This will now show on your .menu command._`,
          ``,
          `💾 _Saved as base64 — no external upload needed._`,
          `🔗 _Each bot session has its own independent image._`,
        ].join('\n')
      }, { quoted: msg });

      try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

    } catch (error) {
      logger.error('[SetMenuImage] Error:', error.message);
      await reply(`❌ *Failed to set menu image:* ${error.message}`);
    }
  }
};

/**
 * nanobana.js — Nano-Banana AI Multi-Engine for ZENTRIX MD BY ZENTRIX TECH.
 * Author: Omegatech
 * Version: 5.0 (Collector Mode)
 *
 * 📡 OFFICIAL CHANNELS:
 * WhatsApp: https://whatsapp.com/channel/0029Vb785rSBlHpWSitPY61i
 * Telegram: https://t.me/+OrLFsvjjlVM2ZjRk
 *
 * Commands:
 *   .nano <prompt>              → Text-to-image generation
 *   .nano [reply to image]      → AI image editing
 *   .nanopro [reply to image]   → Add image to collector session
 *   .nanopro done <prompt>      → Blend collected images with prompt
 */

import axios from 'axios';
import FormData from 'form-data';
import logger from '../../utils/logger.js';

// ── Per-user collector sessions (in-memory) ───────────────────────────────────
const bananaSession = {};

// ── Media uploader ────────────────────────────────────────────────────────────

async function uploadMedia(sock, msg) {
  try {
    // Support quoted messages or direct image messages
    const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message;

    // Detect the image payload across common message types
    const imageMsg =
      q?.imageMessage ||
      q?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
      null;

    if (!imageMsg) return null;

    // Download media via Baileys
    const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
    const buffer = await downloadMediaMessage(
      { message: { imageMessage: imageMsg }, key: msg.key },
      'buffer',
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );

    if (!buffer || buffer.length === 0) return null;

    const form = new FormData();
    form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    form.append('type', 'permanent');

    const res = await axios.post('https://tmp.malvryx.dev/upload', form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    return res.data?.cdnUrl || res.data?.directUrl || null;
  } catch (e) {
    logger.warn('[NanoBanana] uploadMedia failed:', e.message);
    return null;
  }
}

// ── Poll helper — waits for task result ──────────────────────────────────────

async function pollResult(taskId, maxAttempts = 25, intervalMs = 5000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const { data } = await axios.get(
      `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`,
      { timeout: 15000 }
    );
    if (data.status === 'completed' && data.image_url) return data.image_url;
    if (data.status === 'failed') throw new Error('Server reported generation failure.');
  }
  throw new Error('Generation timed out after polling.');
}

// ── nano command ──────────────────────────────────────────────────────────────

export const nanoCommand = {
  name: 'nano',
  description: 'AI image generation & editing. Send a prompt to generate, or reply to an image to edit it.',
  usage: '.nano <prompt>  |  reply to image: .nano <instruction>',
  category: 'ai',
  subCategory: 'image generation',
  roleRequired: 'user',
  groupOnly: false,
  emoji: '🍌',

  execute: async ({ sock, msg, args }) => {
    const jid    = msg.key.remoteJid;
    const prompt = args.join(' ').trim();

    const reply  = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const react  = (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });

    const imageUrl = await uploadMedia(sock, msg);

    // ── Mode A: Image editing (image + prompt) ────────────────────────────────
    if (imageUrl) {
      if (!prompt) {
        return reply(
          `⚠️ *Instruction Required*\n\nReply to an image with a description of the edit.\n` +
          `Example: \`.nano make it look like a zombie\``
        );
      }

      await react('🎨');
      try {
        const { data: init } = await axios.get(
          `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2` +
          `?prompt=${encodeURIComponent(prompt)}&image=${encodeURIComponent(imageUrl)}`,
          { timeout: 20000 }
        );

        if (!init?.task_id) throw new Error('API did not return a task ID.');

        const resultUrl = await pollResult(init.task_id, 20);

        await sock.sendMessage(jid, {
          image: { url: resultUrl },
          caption:
            `✨ *NANO EDIT SUCCESS*\n\n` +
            `📝 *Prompt:* ${prompt}\n` +
            `🚀 *Engine:* Omegatech API`,
        }, { quoted: msg });

        await react('✅');
      } catch (e) {
        logger.error('[NanoBanana] nano edit error:', e.message);
        await react('❌');
        await reply(`❌ *Image edit failed*\n\nReason: ${e.message}`);
      }
      return;
    }

    // ── Mode B: Text-to-image generation ─────────────────────────────────────
    if (!prompt) {
      return reply(
        `⚠️ *Input Required*\n\n` +
        `*Generate image:* \`.nano <prompt>\`\n` +
        `*Edit image:*     Reply to an image with \`.nano <instruction>\`\n` +
        `*Blend images:*   Use \`.nanopro\``
      );
    }

    await react('⏳');
    try {
      const { data } = await axios.get(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro` +
        `?prompt=${encodeURIComponent(prompt)}`,
        { timeout: 60000 }
      );

      if (!data?.image) throw new Error('No image returned by API.');

      await sock.sendMessage(jid, {
        image: { url: data.image },
        caption:
          `🍌 *NANO PRO GENERATION*\n\n` +
          `📝 *Prompt:* ${prompt}\n` +
          `🚀 *Engine:* Omegatech API`,
      }, { quoted: msg });

      await react('✅');
    } catch (e) {
      logger.error('[NanoBanana] nano generate error:', e.message);
      await react('❌');
      await reply(`❌ *Generation failed*\n\nReason: ${e.message}`);
    }
  },
};

// ── nanopro command ───────────────────────────────────────────────────────────

export const nanoProCommand = {
  name: 'nanopro',
  description: 'Collector mode: gather up to 4 images then blend them with a prompt.',
  usage: '.nanopro  (reply to image)  |  .nanopro done <prompt>',
  category: 'ai',
  subCategory: 'image generation',
  roleRequired: 'user',
  groupOnly: false,
  emoji: '🍌',

  execute: async ({ sock, msg, args }) => {
    const jid    = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    const text   = args.join(' ').trim();

    const reply  = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const react  = (e) => sock.sendMessage(jid, { react: { text: e, key: msg.key } });

    // Init session for this user if needed
    if (!bananaSession[userId]) bananaSession[userId] = { images: [] };

    // ── Sub-command: done ─────────────────────────────────────────────────────
    if (text.toLowerCase().startsWith('done')) {
      const session     = bananaSession[userId];
      const finalPrompt = text.replace(/^done\s*/i, '').trim();

      if (session.images.length < 2) {
        return reply(
          `⚠️ *Nano-Banana Pro*\n\n` +
          `Please add at least *2 images* before finishing.\n` +
          `Current count: ${session.images.length}/4`
        );
      }
      if (!finalPrompt) {
        return reply(
          `⚠️ *Prompt Required*\n\n` +
          `Usage: \`.nanopro done <your prompt>\`\n` +
          `Example: \`.nanopro done make them all look cyberpunk\``
        );
      }

      await react('🕒');
      try {
        let apiUrl =
          `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3` +
          `?prompt=${encodeURIComponent(finalPrompt)}`;

        session.images.forEach((url, i) => {
          apiUrl += `&image${i + 1}=${encodeURIComponent(url)}`;
        });

        const { data: initRes } = await axios.get(apiUrl, { timeout: 20000 });
        if (!initRes?.success) throw new Error('API failed to initiate blend.');

        const resultUrl = await pollResult(initRes.task_id, 25);

        await sock.sendMessage(jid, {
          image: { url: resultUrl },
          caption:
            `🍌 *NANO-BANANA PRO SUCCESS*\n\n` +
            `🖼️ *Images Blended:* ${session.images.length}\n` +
            `📝 *Prompt:* ${finalPrompt}\n` +
            `🚀 *Source:* Omegatech API`,
        }, { quoted: msg });

        await react('✅');
      } catch (e) {
        logger.error('[NanoBanana] nanopro blend error:', e.message);
        await react('❌');
        await reply(`❌ *Blend failed*\n\nReason: ${e.message}`);
      } finally {
        delete bananaSession[userId];
      }
      return;
    }

    // ── Sub-command: collect image ────────────────────────────────────────────
    const link = await uploadMedia(sock, msg);

    if (!link) {
      return reply(
        `📸 *Collector Mode*\n\n` +
        `Reply to an image with *.nanopro* to add it to your list.\n\n` +
        `Current: *${bananaSession[userId].images.length}/4*\n` +
        `When ready: \`.nanopro done <your prompt>\``
      );
    }

    if (bananaSession[userId].images.length >= 4) {
      return reply(
        `❌ *Limit Reached*\n\n` +
        `Maximum of 4 images allowed per session.\n` +
        `Finish with: \`.nanopro done <prompt>\``
      );
    }

    bananaSession[userId].images.push(link);
    const count = bananaSession[userId].images.length;

    await react('📥');
    await reply(
      `✅ *Image ${count}/4 Added*\n\n` +
      `${count < 2 ? `Add at least ${2 - count} more image(s).` : `You can finish now or add more.`}\n\n` +
      `To finish: \`.nanopro done <your prompt>\`\n` +
      `To cancel: just stop sending — session auto-clears on restart.`
    );
  },
};

/**
 * channelReactor.js — WhatsApp Channel Reactor for ZENTRIX MD BY ZENTRIX TECH.
 * Author: Omegatech
 * Version: 1.1 (Updated Bypass)
 *
 * 📡 OFFICIAL CHANNELS:
 * WhatsApp: https://whatsapp.com/channel/0029Vb785rSBlHpWSitPY61i
 * Telegram: https://t.me/+OrLFsvjjlVM2ZjRk
 *
 * Commands:
 *   .rch <link> <emoji1,emoji2,...>    → React to a WhatsApp channel post
 *   .reactch <link> <emoji1,emoji2,...>
 */

import axios from 'axios';
import logger from '../../utils/logger.js';

const BACKEND_URL  = 'https://back.asitha.top/api';
const SITEKEY      = '6LemKk8sAAAAAH5PB3f1EspbMlXjtwv5C8tiMHSm';
const CAPTCHA_URL  = 'https://back.asitha.top/api';

// ── JWT tokens (rotate here when they expire) ─────────────────────────────────
const USER_JWT  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NTZmMzhjOTllNGEzOTVlOWM0ZTc3NSIsImlhdCI6MTc3NjQ0ODg1OCwiZXhwIjoxNzc3MDUzNjU4fQ.JiKqtKv4cMDJYCi_Ua8LxFKrfciRXVV736mo_Rtq3U8';
const MINE_JWT  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2M0MTI5Nzk2ZDk0OGZiYjAxY2M2OSIsImlhdCI6MTc3NjQ2MTMwOCwiZXhwIjoxNzc3MDY2MTA4fQ.j8NfQcgeuzJRd2gsUdVefSuLIEaIlhAmnsjPckjN9Nc';

async function runReactor(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const reply  = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
  const react  = (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });

  if (!args[0]) {
    return reply(
      `⚡ *WhatsApp Channel Reactor*\n\n` +
      `Usage: .rch <link> <emoji1,emoji2>\n\n` +
      `Example:\n.rch https://whatsapp.com/channel/0029Vb785rSBlHpWSitPY61i/585 😭,🔥`
    );
  }

  const postLink  = args[0];
  const reactsRaw = args.slice(1).join(' ').trim();

  if (!postLink.includes('whatsapp.com/channel/')) {
    return reply('❌ Invalid WhatsApp channel link.');
  }
  if (!reactsRaw) {
    return reply('❌ No emojis provided.\n\nExample: .rch <link> 😭,🔥,❤️');
  }

  const emojis = reactsRaw.split(',').map(e => e.trim()).filter(Boolean);
  if (emojis.length === 0) return reply('❌ No valid emojis found.');
  if (emojis.length > 4)   return reply('❌ Max 4 emojis allowed per reaction.');

  await react('🕒');

  try {
    // Step 1 — Get reCAPTCHA v3 bypass token
    const { data: captchaData } = await axios.get(
      'https://omegatech-api.dixonomega.tech/api/tools/recaptcha-v3',
      {
        params: {
          sitekey:        SITEKEY,
          url:            CAPTCHA_URL,
          use_enterprise: 'false',
        },
        timeout: 20000,
      }
    );

    if (!captchaData?.success || !captchaData?.token) {
      throw new Error('reCAPTCHA bypass failed — no token returned.');
    }

    // Step 2 — Exchange captcha token for temp API key
    const { data: tempKeyData } = await axios.post(
      `${BACKEND_URL}/user/get-temp-token`,
      { recaptcha_token: captchaData.token },
      {
        headers: {
          Authorization:  `Bearer ${USER_JWT}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (!tempKeyData?.token) {
      throw new Error('Failed to obtain temp API key from backend.');
    }

    // Step 3 — Send reactions
    await axios.post(
      `${BACKEND_URL}/channel/react-to-post?apiKey=${tempKeyData.token}`,
      { post_link: postLink, reacts: emojis.join(',') },
      {
        headers: {
          Authorization:  `Bearer ${MINE_JWT}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    await react('✅');
    await reply(
      `🔥 *Reactions Sent Successfully!*\n\n` +
      `📎 *Post:* ${postLink}\n` +
      `😀 *Emojis:* ${emojis.join('  ')}`
    );

  } catch (e) {
    logger.error('[ChannelReactor] Error:', e.message);
    await react('❌');
    await reply(`❌ *Failed:* ${e.response?.data?.message || e.message}`);
  }
}

// ── Exports (both aliases map to same handler) ────────────────────────────────

export const rchCommand = {
  name: 'rch',
  description: 'React to a WhatsApp channel post with up to 4 emojis.',
  usage: '.rch <channel_post_link> <emoji1,emoji2,...>',
  category: 'tools',
  subCategory: 'utility',
  roleRequired: 'user',
  groupOnly: false,
  emoji: '⚡',
  execute: async ({ sock, msg, args }) => runReactor(sock, msg, args),
};

export const reactchCommand = {
  name: 'reactch',
  description: 'React to a WhatsApp channel post (alias for .rch).',
  usage: '.reactch <channel_post_link> <emoji1,emoji2,...>',
  category: 'tools',
  subCategory: 'utility',
  roleRequired: 'user',
  groupOnly: false,
  emoji: '⚡',
  execute: async ({ sock, msg, args }) => runReactor(sock, msg, args),
};

/**
 * nsfwCommands.js — NSFW commands for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.prexzyvilla.site/nsfw/<endpoint>
 *
 * ⚠️  FOR 18+ GROUPS ONLY — Enable with .nsfw on in your group.
 *
 * Strategy: API returns raw image/video binary.
 *   - Images → send as image buffer
 *   - GIFs   → download, convert to mp4, send with gifPlayback=true
 *   - Videos → send as video buffer
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import logger from '../../utils/logger.js';

const BASE_URL = 'https://apis.prexzyvilla.site/nsfw';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches media from the NSFW API and returns { buffer, contentType }
 */
async function fetchNsfwMedia(endpoint) {
  const url = `${BASE_URL}/${endpoint}`;
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  const contentType = response.headers['content-type'] || '';
  return { buffer: Buffer.from(response.data), contentType };
}

/**
 * Converts a GIF buffer to MP4 via ffmpeg and returns the mp4 buffer.
 */
async function gifToMp4(gifBuffer, tag) {
  const tmp = `/tmp/nsfw_${tag}_${Date.now()}`;
  const gifPath = `${tmp}.gif`;
  const mp4Path = `${tmp}.mp4`;

  fs.writeFileSync(gifPath, gifBuffer);

  await new Promise((resolve, reject) => {
    exec(
      `ffmpeg -y -i ${gifPath} -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -movflags faststart -pix_fmt yuv420p ${mp4Path}`,
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  const mp4Buffer = fs.readFileSync(mp4Path);
  fs.unlinkSync(gifPath);
  fs.unlinkSync(mp4Path);
  return mp4Buffer;
}

/**
 * Core NSFW media sender.
 * Detects content-type and sends image, gif, or video accordingly.
 */
async function sendNsfwMedia(sock, msg, endpoint, label) {
  const jid = msg.key.remoteJid;

  await sock.sendMessage(jid, { react: { text: '🔞', key: msg.key } });

  try {
    const { buffer, contentType } = await fetchNsfwMedia(endpoint);

    // ── JSON error from API ──
    if (contentType.includes('application/json')) {
      const err = JSON.parse(buffer.toString('utf-8'));
      throw new Error(err.message || err.error || 'API returned an error.');
    }

    const caption = `🔞 *${label}*\n\n_Powered by ZENTRIX MD BY ZENTRIX TECH_`;

    if (contentType.includes('gif')) {
      // GIF → convert to MP4 for WhatsApp
      const mp4 = await gifToMp4(buffer, endpoint);
      await sock.sendMessage(jid, {
        video: mp4,
        gifPlayback: true,
        caption,
      }, { quoted: msg });

    } else if (contentType.includes('video')) {
      await sock.sendMessage(jid, {
        video: buffer,
        caption,
      }, { quoted: msg });

    } else {
      // Default: treat as image (jpeg/png/webp)
      await sock.sendMessage(jid, {
        image: buffer,
        caption,
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    logger.error(`[NSFWCommand] ${endpoint} error:`, error.message);
    await sock.sendMessage(jid, {
      text: `❌ *${label} failed*\n\nReason: ${error.message}`,
    }, { quoted: msg });
    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
  }
}

// ── Command factory ───────────────────────────────────────────────────────────

const nsfw = (endpoint, label) => ({
  execute: async ({ sock, msg }) => sendNsfwMedia(sock, msg, endpoint, label),
});

// ── Exports ───────────────────────────────────────────────────────────────────

// Export names follow the pattern: <cmdName>Command
// CommandRouter strips "Command" suffix → cmdName must match registry name exactly.

export const nsfwassCommand        = nsfw('ass',        'Ass');
export const nsfw69Command         = nsfw('sixtynine',  '69');
export const nsfwpussyCommand      = nsfw('pussy',      'Pussy');
export const nsfwdickCommand       = nsfw('dick',       'Dick');
export const nsfwanalCommand       = nsfw('anal',       'Anal');
export const nsfwboobsCommand      = nsfw('boobs',      'Boobs');
export const nsfwbdsmCommand       = nsfw('bdsm',       'BDSM');
export const nsfwblackCommand      = nsfw('black',      'Black');
export const nsfwbottomlessCommand = nsfw('bottomless', 'Bottomless');
export const nsfwcollaredCommand   = nsfw('collared',   'Collared');
export const nsfwcumCommand        = nsfw('cum',        'Cum');
export const nsfwcumslutsCommand   = nsfw('cumsluts',   'Cumsluts');
export const nsfwdpCommand         = nsfw('dp',         'DP');
export const nsfwdomCommand        = nsfw('dom',        'Domination');
export const nsfwextremeCommand    = nsfw('extreme',    'Extreme');
export const nsfwfeetCommand       = nsfw('feet',       'Feet');
export const nsfwfingerCommand     = nsfw('finger',     'Finger');
export const nsfwfuckCommand       = nsfw('fuck',       'Fuck');
export const nsfwfutaCommand       = nsfw('futa',       'Futa');
export const nsfwgayCommand        = nsfw('gay',        'Gay');
export const nsfwgifCommand        = nsfw('gif',        'NSFW GIF');
export const nsfwgroupCommand      = nsfw('group',      'Group');
export const nsfwhentaiCommand     = nsfw('hentai',     'Hentai');
export const nsfwkissCommand       = nsfw('kiss',       'Kiss');
export const nsfwlickCommand       = nsfw('lick',       'Lick');
export const nsfwpeggedCommand     = nsfw('pegged',     'Pegged');
export const nsfwphgifCommand      = nsfw('phgif',      'PornHub GIF');
export const nsfwpuffiesCommand    = nsfw('puffies',    'Puffies');
export const nsfwrealCommand       = nsfw('real',       'Real');
export const nsfwsuckCommand       = nsfw('suck',       'Suck');
export const nsfwtattooCommand     = nsfw('tattoo',     'Tattoo');
export const nsfwtinyCommand       = nsfw('tiny',       'Tiny');
export const nsfwtoysCommand       = nsfw('toys',       'Toys');

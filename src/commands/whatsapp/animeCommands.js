/**
 * animeCommands.js — Anime GIF commands for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.prexzyvilla.site/anime/<endpoint>
 *
 * FIXED (confirmed from API screenshot):
 *   The endpoint returns the RAW image/gif binary directly — NOT a JSON wrapper.
 *   Content-Type will be image/gif or image/png.
 *   Strategy: download as arraybuffer, send as video with gifPlayback=true (WhatsApp
 *   doesn't support GIF natively — video+gifPlayback is the correct approach).
 */
import axios from 'axios';
import fs from 'fs';
import { exec } from 'child_process';
import logger from '../../utils/logger.js';
import { resolveTarget } from '../../utils/targetResolver.js';
import { execSync } from 'child_process';

try {
  execSync('ffmpeg -version');
  console.log('✅ FFmpeg installed');
} catch {
  console.error('❌ FFmpeg not found');
}

async function sendAnimeGif(sock, msg, endpoint, actionText) {
  const jid = msg.key.remoteJid;
  const target = resolveTarget(msg);

  await sock.sendMessage(jid, { react: { text: '🎬', key: msg.key } });

  try {
    const apiUrl = `https://apis.prexzyvilla.site/anime/${endpoint}`;

    // 📥 Download GIF
    const gifPath = `/tmp/${endpoint}.gif`;
    const mp4Path = `/tmp/${endpoint}.mp4`;

    const response = await axios.get(apiUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(gifPath);

    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 🎥 Convert GIF → MP4
    await new Promise((resolve, reject) => {
  exec(
    `ffmpeg -y -i ${gifPath} -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -movflags faststart -pix_fmt yuv420p ${mp4Path}`,
    (err) => {
      if (err) return reject(err);
      resolve();
    }
  );
});

    // 🧠 Caption
    let caption = `✨ *Anime ${actionText}*`;
    if (target) {
      const senderName = msg.pushName || 'User';
      caption = `✨ *${senderName}* ${actionText.toLowerCase()}s *@${target.split('@')[0]}*!`;
    }

    // 🚀 Send as real WhatsApp GIF
    await sock.sendMessage(jid, {
      video: fs.readFileSync(mp4Path),
      gifPlayback: true,
      caption,
      mentions: target ? [target] : []
    }, { quoted: msg });

    // 🧹 Cleanup
    fs.unlinkSync(gifPath);
    fs.unlinkSync(mp4Path);

    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    logger.error(`[AnimeCommand] ${endpoint} error:`, error.message);

    await sock.sendMessage(jid, {
      text: `❌ Anime ${actionText} failed: ${error.message}`
    }, { quoted: msg });
  }
}

// ── Exported commands ────────────────────────────────────────────────────────
export const hugCommand    = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'hug',    'Hug') };
export const slapCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'slap',   'Slap') };
export const patCommand    = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'pat',    'Pat') };
export const cryCommand    = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'cry',    'Cry') };
export const killCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'kill',   'Kill') };
export const biteCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'bite',   'Bite') };
export const yeetCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'yeet',   'Yeet') };
export const bullyCommand  = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'bully',  'Bully') };
export const bonkCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'bonk',   'Bonk') };
export const winkCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'wink',   'Wink') };
export const pokeCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'poke',   'Poke') };
export const nomCommand    = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'nom',    'Nom') };
export const smileCommand  = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'smile',  'Smile') };
export const waveCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'wave',   'Wave') };
export const awooCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'awoo',   'Awoo') };
export const blushCommand  = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'blush',  'Blush') };
export const smugCommand   = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'smug',   'Smug') };
export const glompCommand  = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'glomp',  'Glomp') };
export const happyCommand  = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'happy',  'Happy') };
export const danceCommand  = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'dance',  'Dance') };
export const cringeCommand = { execute: async ({ sock, msg }) => sendAnimeGif(sock, msg, 'cringe', 'Cringe') };
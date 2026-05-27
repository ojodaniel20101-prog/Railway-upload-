/**
 * downloaders.js — Media downloader commands for ZENTRIX MD BY ZENTRIX TECH.
 * FIXED: Correct response field mapping per prexzyvilla API endpoint.
 *
 * Confirmed response shapes (tested):
 *   ytdownload → { status, statusCode, download_url, filename, type, format, quality, duration }
 *   spotify    → { status, data: { download, title, artist, duration, thumbnail } }
 *   AIO        → { status, data: { medias:[{url,type}], title, source } }
 *   instagram  → { status, data: { url } }  or  { status, url }
 *   facebook   → { status, data: { hd, sd } }  or  { status, url }
 *   twitter    → { status, data: { url } }  or  { status, url }
 *   capcut     → { status, data: { videoUrl } }  or  { status, url }
 *   pinterest  → { status, data: { url } }  or  { status, url }
 *   All others → try flat fields first (url, download_url) then nested data.*
 */

import axios from 'axios';
import logger from '../../utils/logger.js';
import { downloadContentFromMessage, normalizeMessageContent } from '@whiskeysockets/baileys';
import { normalizeJidToNumber } from '../../utils/helpers.js';

/**
 * Extracts the downloadable media URL from the API response.
 * Tries the most specific known field for each platform first,
 * then falls back through a chain of common field names.
 */
function resolveMediaUrl(data, platformName) {
  // ── Platform-specific mappings ──────────────────────────────────────────
  switch (platformName) {
    case 'YouTube':
      // Confirmed: { status, statusCode, download_url, filename, quality, format, duration }
      return data.download_url || data.url || data.data?.url || data.data?.download_url;

    case 'Spotify':
      // { status, data: { download, title, artist } }
      return data.data?.download || data.data?.url || data.download || data.url;

    case 'AIO':
      // Flat structure: { status, medias:[{url,type,quality}], title, source }
      // Nested structure: { status, data: { medias:[{url,type,quality}], title, source } }
      const medias = data.medias || data.data?.medias;
      return (
        medias?.find(m => m.type === 'video')?.url ||
        medias?.[0]?.url ||
        data.url ||
        data.data?.url
      );

    case 'Instagram':
      // { status, data: { url } } or { status, url }
      return data.data?.url || data.data?.video || data.url || data.download_url;

    case 'Facebook':
      // { status, data: { hd, sd, url } }
      return data.data?.hd || data.data?.sd || data.data?.url || data.url || data.download_url;

    case 'Twitter':
      // { status, data: { url, video } }
      return data.data?.url || data.data?.video || data.url || data.download_url;

    case 'Capcut':
      // { status, data: { videoUrl, url } }
      return data.data?.videoUrl || data.data?.url || data.videoUrl || data.url || data.download_url;

    case 'Pinterest':
      // { status, data: { url, image, video } }
      return data.data?.url || data.data?.image || data.data?.video || data.url || data.download_url;

    case 'Threads':
      return data.data?.url || data.data?.video || data.url || data.download_url;

    case 'Douyin':
    case 'RedNote':
      return data.data?.url || data.data?.video || data.url || data.download_url;

    case 'DoodsStream':
      return data.data?.url || data.data?.link || data.url || data.download_url;

    case 'MediaFire':
    case 'Sfile':
    case 'Terabox':
      // File downloads — usually { status, data: { url, download } } or flat
      return data.data?.url || data.data?.download || data.data?.direct || data.url || data.download_url || data.download;

    case 'Soundcloud':
      return data.data?.url || data.data?.download || data.url || data.download_url;

    default:
      // Universal fallback chain — flat fields first, then nested
      return (
        data.download_url ||
        data.url ||
        data.data?.url ||
        data.data?.download_url ||
        data.data?.download ||
        data.data?.video ||
        data.data?.videoUrl ||
        data.data?.hd ||
        data.data?.sd ||
        null
      );
  }
}

/**
 * Builds a rich caption based on platform and response data.
 */
function buildCaption(data, platformName) {
  switch (platformName) {
    case 'YouTube':
      return (
        `✅ *YOUTUBE DOWNLOADED*\n` +
        `🎬 *File:* ${data.filename || 'video.mp4'}\n` +
        `📐 *Quality:* ${data.quality || 'HD'} | *Format:* ${data.format || 'mp4'}\n` +
        `⏱ *Duration:* ${data.duration ? Math.floor(data.duration / 60) + 'm ' + (data.duration % 60) + 's' : 'N/A'}\n\n` +
        `⚡ Powered by ZENTRIX_MD`
      );
    case 'Spotify':
      return `🎵 *${data.data?.title || 'Track'}*\n👤 *Artist:* ${data.data?.artist || 'Unknown'}\n\n⚡ Powered by ZENTRIX_MD`;
    case 'AIO':
      const title = data.title || data.data?.title || 'Media';
      const source = data.source || data.data?.source || data.platform || 'Unknown';
      return `✅ *${title}*\n👤 *Source:* ${source}\n\n⚡ Powered by ZENTRIX_MD`;
    default:
      return `✅ *${platformName.toUpperCase()} DOWNLOADED*\n\n⚡ Powered by ZENTRIX_MD`;
  }
}

/**
 * Core download handler.
 */
async function handleDownload(sock, msg, url, apiEndpoint, platformName, type = 'video') {
  const jid = msg.key.remoteJid;
  if (!url) throw new Error(`Usage: .${platformName.toLowerCase()} <url>`);

  await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

  try {
    const { data } = await axios.get(`${apiEndpoint}${encodeURIComponent(url)}`, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    // Accept status:true OR statusCode:200 (prexzy uses both)
    const ok = data.status === true || data.statusCode === 200 || data.success === true;
    if (!ok) {
      throw new Error(data.message || data.error || `${platformName} API returned an error.`);
    }

    const mediaUrl = resolveMediaUrl(data, platformName);
    if (!mediaUrl) {
      throw new Error(`No downloadable URL found in the ${platformName} API response.`);
    }

    const caption = buildCaption(data, platformName);

    if (type === 'audio') {
      await sock.sendMessage(jid, {
        audio: { url: mediaUrl },
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: msg });
    } else if (type === 'document') {
      await sock.sendMessage(jid, {
        document: { url: mediaUrl },
        mimetype: 'application/octet-stream',
        fileName: `${platformName.toLowerCase()}_file`,
        caption
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, {
        video: { url: mediaUrl },
        caption
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    logger.error(`[Downloader] ${platformName} error:`, error.message);
    await sock.sendMessage(jid, { text: `❌ ${platformName} download failed: ${error.message}` });
    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
  }
}

// ── Exported commands ────────────────────────────────────────────────────────
export const ytdownloadCommand = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/ytdownload?url=', 'YouTube', 'video') };
export const aioCommand        = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/aio?url=', 'AIO', 'video') };
export const capcutCommand     = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/capcut?url=', 'Capcut', 'video') };
export const doodsCommand      = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/doods?url=', 'DoodsStream', 'video') };
export const douyinCommand     = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/douyin?url=', 'Douyin', 'video') };
export const mediafireCommand  = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/mediafire?url=', 'MediaFire', 'document') };
export const pinterestCommand  = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/pinterest?url=', 'Pinterest', 'video') };
export const rednoteCommand    = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/rednote?url=', 'RedNote', 'video') };
export const sfileCommand      = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/sfile?url=', 'Sfile', 'document') };
export const soundcloudCommand = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/soundcloud?url=', 'Soundcloud', 'audio') };
export const spotifyCommand    = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/spotify?url=', 'Spotify', 'audio') };
export const teraboxCommand    = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/terabox?url=', 'Terabox', 'video') };
export const threadsCommand    = { execute: async ({ sock, msg, args }) => handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/threads?url=', 'Threads', 'video') };

// ── TikTok (primary: tikwm.com, fallback: AIO) ───────────────────────────────
export const tiktokCommand = {
  execute: async ({ sock, msg, args }) => {
    const url = args[0];
    if (!url) throw new Error('Usage: .tiktok <url>');
    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 20000 });
      if (data?.data?.play) {
        await sock.sendMessage(msg.key.remoteJid, {
          video: { url: data.data.play },
          caption: `✅ *TIKTOK DOWNLOADED*\n👤 *Author:* ${data.data.author?.nickname || 'Unknown'}\n📝 *Title:* ${data.data.title || ''}\n\n⚡ Powered by ZENTRIX_MD`
        }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      } else {
        throw new Error('Primary TikTok API returned no media.');
      }
    } catch (e) {
      logger.warn(`[TikTok] Primary failed (${e.message}), trying AIO fallback`);
      await handleDownload(sock, msg, url, 'https://apis.prexzyvilla.site/download/aio?url=', 'TikTok', 'video');
    }
  }
};

// ── Instagram ─────────────────────────────────────────────────────────────────
export const instagramCommand = {
  execute: async ({ sock, msg, args }) =>
    handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/ig2?url=', 'Instagram', 'video')
};

// ── Facebook ──────────────────────────────────────────────────────────────────
export const facebookCommand = {
  execute: async ({ sock, msg, args }) =>
    handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/facebook?url=', 'Facebook', 'video')
};

// ── Twitter/X ─────────────────────────────────────────────────────────────────
export const twitterCommand = {
  execute: async ({ sock, msg, args }) =>
    handleDownload(sock, msg, args[0], 'https://apis.prexzyvilla.site/download/twitter?url=', 'Twitter', 'video')
};

// ── View Once bypass ──────────────────────────────────────────────────────────
export const vvCommand = {
  name: 'vv',
  execute: async ({ sock, msg }) => {
    try {
      const chatId = msg.key.remoteJid;
      const m = msg.message;
      const quoted =
        m?.extendedTextMessage?.contextInfo?.quotedMessage ||
        m?.stickerMessage?.contextInfo?.quotedMessage ||
        m?.imageMessage?.contextInfo?.quotedMessage ||
        m?.videoMessage?.contextInfo?.quotedMessage;
      const normalized = normalizeMessageContent(quoted || m);
      if (!normalized || (!normalized.imageMessage && !normalized.videoMessage)) {
        throw new Error('Please reply to a *view once* image or video!');
      }
      const mediaType = normalized.imageMessage ? 'image' : 'video';
      const mediaMessage = normalized[`${mediaType}Message`];
      const caption = mediaMessage.caption || '';
      await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });
      const stream = await downloadContentFromMessage(mediaMessage, mediaType);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      await sock.sendMessage(chatId, {
        [mediaType]: buffer,
        caption: `*ZENTRIX_MD VV Bypass*\n\n${caption ? `*Caption:* ${caption}` : ''}`,
      }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ VV Bypass failed: ${e.message}` });
    }
  }
};

export const vv2Command = {
  name: 'vv2',
  execute: async ({ sock, msg }) => {
    try {
      const chatId = msg.key.remoteJid;
      const botNumber = normalizeJidToNumber(sock.user?.id, sock);
      const ownerJid = botNumber + '@s.whatsapp.net';
      
      const m = msg.message;
      const quoted =
        m?.extendedTextMessage?.contextInfo?.quotedMessage ||
        m?.stickerMessage?.contextInfo?.quotedMessage ||
        m?.imageMessage?.contextInfo?.quotedMessage ||
        m?.videoMessage?.contextInfo?.quotedMessage;
      const normalized = normalizeMessageContent(quoted || m);
      if (!normalized || (!normalized.imageMessage && !normalized.videoMessage)) {
        throw new Error('Please reply to a *view once* image or video!');
      }
      const mediaType = normalized.imageMessage ? 'image' : 'video';
      const mediaMessage = normalized[`${mediaType}Message`];
      const caption = mediaMessage.caption || '';
      
      await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });
      const stream = await downloadContentFromMessage(mediaMessage, mediaType);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      
      await sock.sendMessage(ownerJid, {
        [mediaType]: buffer,
        caption: `*ZENTRIX_MD VV2 (Private Capture)*\n\n*From:* ${chatId}\n*Sender:* ${normalizeJidToNumber(msg.key.participant || chatId, sock)}\n${caption ? `*Caption:* ${caption}` : ''}`,
      });
      
      await sock.sendMessage(chatId, { text: '✅ Media captured and sent to your private DM.' }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ VV2 Bypass failed: ${e.message}` });
    }
  }
};

// ─── .play — YouTube Search + Download (Audio/Video) ─────────────────────────

import yts from 'yt-search';

const playSession = {}; // userId → search results

async function processYtDownload(sock, msg, url, isVideo) {
  const jid   = msg.key.remoteJid;
  const react = (e) => sock.sendMessage(jid, { react: { text: e, key: msg.key } });

  await react('📥');
  try {
    const quality = isVideo ? '720p' : '320K';
    const type    = isVideo ? 'mp4'  : 'mp3';
    const apiUrl  = `https://my-api-rzmb.onrender.com/api/download/yt-dl?url=${encodeURIComponent(url)}&type=${type}&quality=${quality}`;

    const { data } = await axios.get(apiUrl, { timeout: 60000 });
    if (!data.success || !data.downloadUrl) throw new Error(data.message || 'No download URL found.');

    const caption = `✅ *DOWNLOAD SUCCESS*\n\n📌 *Title:* ${data.title}\n⏳ *Duration:* ${data.duration}\n⚙️ *Quality:* ${quality}\n\n_ZENTRIX MD BY ZENTRIX TECH_`;

    if (isVideo) {
      await sock.sendMessage(jid, {
        video: { url: data.downloadUrl },
        caption,
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, {
        audio: { url: data.downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${data.title}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: data.title,
            body: `Duration: ${data.duration}`,
            thumbnailUrl: data.thumbnail,
            sourceUrl: url,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: msg });
    }
    await react('✅');
  } catch (e) {
    await react('❌');
    await sock.sendMessage(jid, {
      text: `❌ *Download Error:*\n${e.response?.data?.message || e.message}`,
    }, { quoted: msg });
  }
}

export const playCommand = {
  name: 'play',
  aliases: ['ytmp3'],
  description: 'Search and download YouTube audio.',
  category: 'media',
  subCategory: 'downloader',
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    const text = args.join(' ').trim();
    const react = (e) => sock.sendMessage(jid, { react: { text: e, key: msg.key } });

    if (!text) {
      return sock.sendMessage(jid, { text: '🎵 Usage: .play <song name>' }, { quoted: msg });
    }

    await react('🎧');

    try {
      const response = await axios.get(
        `https://apis.davidcyril.name.ng/play?query=${encodeURIComponent(text)}&apikey=`,
        { timeout: 60000 }
      );

      const data = response.data;

      if (!data.status || !data.result?.download_url) {
        throw new Error('No audio download link received');
      }

      const audioResponse = await axios.get(data.result.download_url, {
        responseType: 'arraybuffer',
        timeout: 120000,
      });

      await sock.sendMessage(jid, {
        audio: Buffer.from(audioResponse.data),
        mimetype: 'audio/mpeg',
        fileName: `${data.result.title}.mp3`,
        contextInfo: {
          externalAdReply: {
            thumbnailUrl: data.result.thumbnail,
            title: data.result.title,
            body: `⏱️ ${data.result.duration}`,
            sourceUrl: data.result.video_url,
            renderLargerThumbnail: true,
            mediaType: 1,
          },
        },
      }, { quoted: msg });

      await react('✅');
    } catch (error) {
      await react('❌');
      await sock.sendMessage(jid, {
        text: `❌ Could not find or download: *${text}*`
      }, { quoted: msg });
    }
  }
};

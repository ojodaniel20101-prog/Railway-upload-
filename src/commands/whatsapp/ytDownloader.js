/**
 * ytDownloader.js — YouTube downloader using yt-dlp (system process).
 * PHASE 4: Replaces external API with local yt-dlp execution.
 *
 * Requirements (install on server/Termux):
 *   pkg install yt-dlp ffmpeg   (Termux)
 *   pip install -U yt-dlp       (Linux/VPS)
 *
 * Commands:
 *   .ytmp4 <url or search query>  — Download YouTube video as MP4
 *   .ytmp3 <url or search query>  — Download YouTube audio as MP3
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Temp directory for downloads
const TMP_DIR = path.join(process.cwd(), 'tmp', 'ytdl');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// WhatsApp file size limit: 2 GB
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

// Download timeout: 5 minutes
const DOWNLOAD_TIMEOUT = 5 * 60 * 1000;

/**
 * Checks if a string is a URL.
 */
function isURL(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Sanitizes a filename to remove unsafe characters.
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, '').replace(/\s+/g, '_').slice(0, 100);
}

/**
 * Searches YouTube for a query and returns the first video URL.
 * Uses yt-dlp's built-in search (ytsearch:).
 */
async function searchYouTube(query) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--get-url',
      '--no-playlist',
      '--quiet',
      `ytsearch1:${query}`
    ]);
    let url = '';
    ytdlp.stdout.on('data', (data) => { url += data.toString(); });
    ytdlp.stderr.on('data', (data) => { logger.warn(`[YT-DLP Search] ${data.toString().trim()}`); });
    ytdlp.on('close', (code) => {
      const trimmed = url.trim();
      if (code === 0 && trimmed) {
        resolve(trimmed.split('\n')[0]);
      } else {
        reject(new Error(`No results found for: ${query}`));
      }
    });
    ytdlp.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('yt-dlp is not installed. Run: pip install -U yt-dlp'));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Downloads a YouTube video/audio using yt-dlp.
 *
 * @param {string} videoUrl - The YouTube URL to download.
 * @param {'video'|'audio'} type - Whether to download video or audio.
 * @returns {Promise<string>} - Path to the downloaded file.
 */
async function downloadWithYtDlp(videoUrl, type) {
  return new Promise((resolve, reject) => {
    const timestamp  = Date.now();
    const outputTemplate = path.join(TMP_DIR, `zt_${timestamp}_%(title)s.%(ext)s`);

    let ytdlpArgs;
    if (type === 'audio') {
      ytdlpArgs = [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--no-playlist',
        '--no-warnings',
        '-o', outputTemplate,
        videoUrl
      ];
    } else {
      ytdlpArgs = [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--no-playlist',
        '--no-warnings',
        '-o', outputTemplate,
        videoUrl
      ];
    }

    logger.info(`[YT-DLP] Starting ${type} download: ${videoUrl}`);
    const ytdlp = spawn('yt-dlp', ytdlpArgs);

    let stderr = '';
    ytdlp.stderr.on('data', (data) => { stderr += data.toString(); });

    // Timeout protection
    const timeout = setTimeout(() => {
      ytdlp.kill('SIGTERM');
      reject(new Error('Download timed out after 5 minutes.'));
    }, DOWNLOAD_TIMEOUT);

    ytdlp.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        const errMsg = stderr.trim().split('\n').pop() || 'yt-dlp download failed.';
        return reject(new Error(errMsg));
      }
      // Find the downloaded file
      const ext = type === 'audio' ? '.mp3' : '.mp4';
      const files = fs.readdirSync(TMP_DIR)
        .filter(f => f.startsWith(`zt_${timestamp}_`) && f.endsWith(ext))
        .map(f => path.join(TMP_DIR, f));
      if (files.length === 0) {
        return reject(new Error('Download completed but output file not found.'));
      }
      resolve(files[0]);
    });

    ytdlp.on('error', (err) => {
      clearTimeout(timeout);
      if (err.code === 'ENOENT') {
        reject(new Error('yt-dlp is not installed. Install it with: pip install -U yt-dlp'));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Core handler for both .ytmp4 and .ytmp3 commands.
 */
async function handleYtDownload(sock, msg, args, type) {
  const jid = msg.key.remoteJid;
  const input = args.join(' ').trim();

  if (!input) {
    const usage = type === 'audio'
      ? '⚠️ Usage: .ytmp3 <YouTube URL or search query>'
      : '⚠️ Usage: .ytmp4 <YouTube URL or search query>';
    throw new Error(usage);
  }

  await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

  let videoUrl;
  let filePath;

  try {
    // Step 1: Resolve URL or search
    if (isURL(input)) {
      videoUrl = input;
    } else {
      await sock.sendMessage(jid, {
        text: `🔍 Searching YouTube for: *${input}*...`
      }, { quoted: msg });
      videoUrl = await searchYouTube(input);
    }

    logger.info(`[YT-DLP] Resolved URL: ${videoUrl}`);

    // Step 2: Download using yt-dlp (WAIT for completion — MANDATORY)
    await sock.sendMessage(jid, {
      text: `📥 Downloading ${type === 'audio' ? 'audio' : 'video'}... Please wait.`
    }, { quoted: msg });

    filePath = await downloadWithYtDlp(videoUrl, type);

    // Step 3: File size validation
    const stats    = fs.statSync(filePath);
    const fileSize = stats.size;

    if (fileSize > MAX_FILE_SIZE) {
      fs.unlinkSync(filePath);
      throw new Error(`File too large (${(fileSize / 1024 / 1024).toFixed(1)} MB). WhatsApp limit is 2 GB.`);
    }

    logger.info(`[YT-DLP] File ready: ${filePath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

    // Step 4: Send using STREAM (NOT BUFFER — prevents RAM crashes)
    const fileName = path.basename(filePath);
    if (type === 'audio') {
      await sock.sendMessage(jid, {
        audio: fs.createReadStream(filePath),
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: fileName
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, {
        video: fs.createReadStream(filePath),
        mimetype: 'video/mp4',
        fileName: fileName,
        caption: `🎬 *${fileName.replace(/^zt_\d+_/, '').replace(/_/g, ' ').replace('.mp4', '')}*\n\n_Downloaded via ZENTRIX_MD_`
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    logger.error(`[YT-DLP] ${type} download error:`, error.message);
    await sock.sendMessage(jid, {
      text: `❌ YouTube download failed: ${error.message}`
    }, { quoted: msg });
    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
  } finally {
    // Step 5: Cleanup — always delete temp file
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  }
}

// ── Exported commands ────────────────────────────────────────────────────────

export const ytmp4Command = {
  name: 'ytmp4',
  execute: async ({ sock, msg, args }) => handleYtDownload(sock, msg, args, 'video')
};

export const ytmp3Command = {
  name: 'ytmp3',
  execute: async ({ sock, msg, args }) => handleYtDownload(sock, msg, args, 'audio')
};

export default ytmp4Command;

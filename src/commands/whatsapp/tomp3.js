/**
 * tomp3.js — Convert replied audio/video to MP3
 * ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV
 *
 * Usage: .tomp3 (reply to any audio or video message)
 * Aliases: .mp3, .toaudio
 */

import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { fileTypeFromBuffer } from 'file-type';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function streamToBuffer(stream) {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      resolve(Buffer.concat(chunks));
    } catch (error) {
      reject(error);
    }
  });
}

function getMessageNode(rawMessage = {}) {
  const msg =
    rawMessage?.ephemeralMessage?.message ||
    rawMessage?.viewOnceMessage?.message ||
    rawMessage?.viewOnceMessageV2?.message ||
    rawMessage;
  return msg || {};
}

function extractMediaSource(message) {
  const quotedRaw = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  const quoted = getMessageNode(quotedRaw);
  const direct = getMessageNode(message?.message || {});
  const src = quotedRaw ? quoted : direct;

  if (src.audioMessage) return { media: src.audioMessage, type: 'audio' };
  if (src.videoMessage) return { media: src.videoMessage, type: 'video' };
  if (src.documentMessage) {
    const mime = String(src.documentMessage.mimetype || '').toLowerCase();
    if (mime.startsWith('audio/')) return { media: src.documentMessage, type: 'document' };
    if (mime.startsWith('video/')) return { media: src.documentMessage, type: 'document', isVideo: true };
  }

  return null;
}

function inferExt(fileType, mime = '', isVideo = false) {
  if (fileType?.ext) return fileType.ext;
  const m = String(mime || '').toLowerCase();
  if (m.includes('ogg'))              return 'ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav'))              return 'wav';
  if (m.includes('aac'))              return 'aac';
  if (m.includes('webm'))             return 'webm';
  if (m.includes('mp4'))              return isVideo ? 'mp4' : 'm4a';
  return isVideo ? 'mp4' : 'ogg';
}

function convertToMp3(inputBuffer, ext, isVideo = false) {
  return new Promise((resolve, reject) => {
    const ts = Date.now();
    const inputPath  = path.join(TEMP_DIR, `tomp3_in_${ts}.${ext}`);
    const outputPath = path.join(TEMP_DIR, `tomp3_out_${ts}.mp3`);

    fs.writeFileSync(inputPath, inputBuffer);

    let cmd = ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .format('mp3');

    if (isVideo) cmd = cmd.noVideo();

    cmd
      .on('error', (err) => {
        [inputPath, outputPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
        reject(err);
      })
      .on('end', () => {
        const out = fs.readFileSync(outputPath);
        [inputPath, outputPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
        resolve(out);
      })
      .save(outputPath);
  });
}

// ── Command Handler ────────────────────────────────────────────────────────────

const tomp3Handler = {
  name: 'tomp3',
  description: 'Convert replied audio/video to MP3',
  category: 'media',

  async execute({ sock, msg, phoneNumber }) {
    const jid    = msg.key.remoteJid;
    const prefix = '.';

    const src = extractMediaSource(msg);
    if (!src) {
      return sock.sendMessage(jid, {
        text: `❌ Reply to an audio or video message.\nExample: *${prefix}tomp3*`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: '🎵', key: msg.key } });

      const stream   = await downloadContentFromMessage(src.media, src.type);
      const input    = await streamToBuffer(stream);
      const fileType = await fileTypeFromBuffer(input);
      const isVideo  = src.type === 'video' || src.isVideo;
      const ext      = inferExt(fileType, src.media?.mimetype, isVideo);
      const out      = await convertToMp3(input, ext, isVideo);

      await sock.sendMessage(jid, {
        audio: out,
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      await sock.sendMessage(jid, {
        text: `❌ Failed to convert: ${error.message}`
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
  }
};

// Default export + named aliases so all three commands auto-register
export default tomp3Handler;

export const mp3Command = {
  name: 'mp3',
  description: 'Convert replied audio/video to MP3 (alias)',
  category: 'media',
  execute: tomp3Handler.execute
};

export const toaudioCommand = {
  name: 'toaudio',
  description: 'Convert replied audio/video to MP3 (alias)',
  category: 'media',
  execute: tomp3Handler.execute
};

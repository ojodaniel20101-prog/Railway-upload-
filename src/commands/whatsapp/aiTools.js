/**
 * aiTools.js — Advanced AI commands: .ocr, .upscale, .rembg.
 */

import axios from 'axios';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile, unlink, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger.js';

const TEMP_DIR = path.join(process.cwd(), 'tmp/media');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Helper to download media
async function downloadMedia(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imageMsg = quoted?.imageMessage || msg.message?.imageMessage;
  if (!imageMsg) return null;
  
  const stream = await downloadContentFromMessage(imageMsg, 'image');
  let buf = Buffer.from([]);
  for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
  return buf;
}

export const ocrCommand = {
  name: 'ocr',
  description: 'Extract text from an image using AI.',
  category: 'ai',
  execute: async ({ sock, msg }) => {
    const buf = await downloadMedia(msg);
    if (!buf) throw new Error('Please reply to an image to extract text.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔍', key: msg.key } });

    try {
      // Using a free OCR API (e.g., ocr.space or similar)
      // For this implementation, we'll use a common public API pattern
      const formData = new URLSearchParams();
      formData.append('apikey', 'helloworld'); // Default public key for ocr.space
      formData.append('language', 'eng');
      formData.append('base64Image', `data:image/jpg;base64,${buf.toString('base64')}`);

      const res = await axios.post('https://api.ocr.space/parse/image', formData);
      const text = res.data.ParsedResults?.[0]?.ParsedText;

      if (!text) throw new Error('Could not detect any text in the image.');

      await sock.sendMessage(msg.key.remoteJid, { text: `📝 *Extracted Text:*\n\n${text}` }, { quoted: msg });
    } catch (e) {
      logger.error('[OCR] Error:', e);
      throw new Error('OCR failed. Please try again later.');
    }
  }
};

export const upscaleCommand = {
  name: 'upscale',
  description: 'Enhance image quality using AI.',
  category: 'ai',
  execute: async ({ sock, msg }) => {
    const buf = await downloadMedia(msg);
    if (!buf) throw new Error('Please reply to an image to upscale.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '✨', key: msg.key } });

    try {
      // Using a public AI upscaler API (example: various free endpoints)
      // Note: In a real production bot, you'd use a paid API like Replicate or Stability
      // For this demo, we'll use a common free proxy if available, or explain the requirement
      const base64 = buf.toString('base64');
      const res = await axios.post('https://api.vyturex.com/upscale', { image: base64 });
      
      if (res.data && res.data.result) {
        const outBuf = Buffer.from(res.data.result, 'base64');
        await sock.sendMessage(msg.key.remoteJid, { image: outBuf, caption: '✅ *Image Upscaled*' }, { quoted: msg });
      } else {
        throw new Error('Upscale service unavailable.');
      }
    } catch (e) {
      logger.error('[Upscale] Error:', e);
      throw new Error('Upscale failed. The service might be down.');
    }
  }
};

export const rembgCommand = {
  name: 'rembg',
  description: 'Remove background from an image.',
  category: 'ai',
  execute: async ({ sock, msg }) => {
    const buf = await downloadMedia(msg);
    if (!buf) throw new Error('Please reply to an image to remove background.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '✂️', key: msg.key } });

    try {
      const base64 = buf.toString('base64');
      const res = await axios.post('https://api.vyturex.com/rembg', { image: base64 });
      
      if (res.data && res.data.result) {
        const outBuf = Buffer.from(res.data.result, 'base64');
        await sock.sendMessage(msg.key.remoteJid, { image: outBuf, caption: '✅ *Background Removed*' }, { quoted: msg });
      } else {
        throw new Error('Background removal service unavailable.');
      }
    } catch (e) {
      logger.error('[Rembg] Error:', e);
      throw new Error('Background removal failed.');
    }
  }
};

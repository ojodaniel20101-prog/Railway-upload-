/**
 * mediaCommands.js — Media processing commands for ZENTRIX MD BY ZENTRIX TECH.
 * Implements .imageblur, .sticker.
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execPromise = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), 'tmp/media');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const imageblurCommand = {
  name: 'imageblur',
  description: 'Apply a blur effect to an image.',
  usage: '.imageblur [reply to image]',
  category: 'media',
  execute: async ({ sock, msg }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMsg = quoted?.imageMessage || msg.message?.imageMessage;

    if (!imageMsg) throw new Error('Please reply to an image or send an image with the command.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    const stream = await downloadContentFromMessage(imageMsg, 'image');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const inputPath = path.join(TEMP_DIR, `${msg.key.id}_in.jpg`);
    const outputPath = path.join(TEMP_DIR, `${msg.key.id}_out.jpg`);

    await writeFile(inputPath, buffer);

    try {
      // Use ImageMagick (pre-installed in most environments or can be installed)
      // If not available, we can use a JS library, but shell is faster in sandbox
      await execPromise(`convert ${inputPath} -blur 0x8 ${outputPath}`);
      
      await sock.sendMessage(msg.key.remoteJid, { 
        image: { url: outputPath }, 
        caption: '✨ *Image Blurred Successfully*' 
      }, { quoted: msg });

      await unlink(inputPath);
      await unlink(outputPath);
    } catch (error) {
      logger.error('[ImageBlur] Error:', error);
      throw new Error('Failed to blur image. Ensure ImageMagick is installed.');
    }
  }
};

export const stickerCommand = {
  name: 'sticker',
  description: 'Convert an image or video to a sticker.',
  usage: '.sticker [reply to image/video]',
  category: 'media',
  execute: async ({ sock, msg }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMsg = quoted?.imageMessage || msg.message?.imageMessage || quoted?.videoMessage || msg.message?.videoMessage;

    if (!mediaMsg) throw new Error('Please reply to an image or video to create a sticker.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🎨', key: msg.key } });

    const isVideo = !!(quoted?.videoMessage || msg.message?.videoMessage);
    const mediaType = isVideo ? 'video' : 'image';
    const stream = await downloadContentFromMessage(mediaMsg, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const inputPath = path.join(TEMP_DIR, `${msg.key.id}_in.${isVideo ? 'mp4' : 'jpg'}`);
    const outputPath = path.join(TEMP_DIR, `${msg.key.id}_out.webp`);

    await writeFile(inputPath, buffer);

    try {
      if (isVideo) {
        // Convert video to animated sticker (WebP) using ffmpeg
        await execPromise(`ffmpeg -i ${inputPath} -vcodec libwebp -filter:v "fps=fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0" -lossless 1 -loop 0 -preset default -an -vsync 0 -s 512:512 ${outputPath}`);
      } else {
        // Convert image to sticker (WebP) using ImageMagick
        await execPromise(`convert ${inputPath} -resize 512x512 -background transparent -gravity center -extent 512x512 ${outputPath}`);
      }

      await sock.sendMessage(msg.key.remoteJid, { sticker: { url: outputPath } }, { quoted: msg });

      await unlink(inputPath);
      await unlink(outputPath);
    } catch (error) {
      logger.error('[StickerCommand] Error:', error);
      throw new Error('Failed to create sticker. Ensure ffmpeg and ImageMagick are installed.');
    }
  }
};

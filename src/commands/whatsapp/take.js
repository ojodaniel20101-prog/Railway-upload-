/**
 * .take command — Change sticker metadata (pack name and author).
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile, unlink, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execPromise = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), 'tmp/media');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export default {
  name: 'take',
  description: 'Change sticker metadata (pack name and author).',
  usage: '.take [packname|author]',
  category: 'media',
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const stickerMsg = quoted?.stickerMessage || msg.message?.stickerMessage;

    if (!stickerMsg) throw new Error('Please reply to a sticker to use the .take command.');

    // Default metadata as requested
    let packName = 'ZENTRIX TECH';
    let authorName = 'unknown dev';

    // Allow user to override via args: .take MyPack|MyAuthor
    if (args.length > 0) {
      const input = args.join(' ');
      if (input.includes('|')) {
        [packName, authorName] = input.split('|').map(s => s.trim());
      } else {
        packName = input;
      }
    }

    await sock.sendMessage(jid, { react: { text: '📸', key: msg.key } });

    const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const id = `${msg.key.id}_${Date.now()}`;
    const inPath = path.join(TEMP_DIR, `${id}_in.webp`);
    const outPath = path.join(TEMP_DIR, `${id}_out.webp`);

    await writeFile(inPath, buffer);

    try {
      // We use ffmpeg to ensure it's a valid webp and then send with metadata
      // Baileys handles the metadata injection if we provide packname/author in sendMessage
      await execPromise(`ffmpeg -y -i "${inPath}" -vcodec libwebp -lossless 1 -qscale 75 "${outPath}"`);

      const stickerBuf = await readFile(outPath);

      await sock.sendMessage(jid, {
        sticker: stickerBuf,
        packname: packName,
        author: authorName,
        categories: ['🔥'],
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      logger.error('[TakeCommand] Error:', error);
      throw new Error('Failed to modify sticker metadata.');
    } finally {
      try { await unlink(inPath); } catch (_) {}
      try { await unlink(outPath); } catch (_) {}
    }
  }
};

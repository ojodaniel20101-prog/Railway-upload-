/**
 * utilityCommands.js — ZENTRIX MD BY ZENTRIX TECH
 * Commands: .s (sticker alias), .toimg, .calendar, .qimgcreate
 * Created by ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV
 */

import axios from 'axios';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile, unlink, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execPromise = promisify(exec);
const TEMP_DIR    = path.join(process.cwd(), 'tmp/media');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─── Channel wrapper (meta-preview style, same as rgetfile) ───────────────────
const BOT_JID           = '867051314767696@bot';
const NEWSLETTER_JID    = '120363421055682094@newsletter';
const NEWSLETTER_NAME   = "ZENTRIX MD BY ZENTRIX TECH";
const NEWSLETTER_MSG_ID = 281;

function withChannelContext(payload) {
  return {
    ...payload,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid:    NEWSLETTER_JID,
        serverMessageId:  NEWSLETTER_MSG_ID,
        newsletterName:   NEWSLETTER_NAME,
      },
    },
  };
}

// ─── Helper: download media from quoted or current message ────────────────────
async function downloadMedia(msg, types = ['image', 'video', 'sticker']) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  for (const type of types) {
    const baileyType = type === 'sticker' ? 'sticker' : type;
    const mediaMsg =
      quoted?.[`${type}Message`] ||
      msg.message?.[`${type}Message`];
    if (mediaMsg) {
      const stream = await downloadContentFromMessage(mediaMsg, baileyType);
      let buf = Buffer.from([]);
      for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
      return { buf, type, mediaMsg };
    }
  }
  return null;
}

// ─── .s / .sticker — Convert image/video to sticker ──────────────────────────
export const sCommand = {
  name: 's',
  execute: async ({ sock, msg, args }) => {
    const jid    = msg.key.remoteJid;
    const packName  = args.join(' ') || 'ZENTRIX MD BY ZENTRIX TECH';
    const authorName = 'Forged by UNKNOWN DEV';

    const media = await downloadMedia(msg, ['image', 'video', 'gif']);
    if (!media) throw new Error('Please reply to or send an image/video with .s to convert it to a sticker.');

    await sock.sendMessage(jid, { react: { text: '🎨', key: msg.key } });

    const id      = `${msg.key.id}_${Date.now()}`;
    const ext     = media.type === 'video' ? 'mp4' : 'jpg';
    const inPath  = path.join(TEMP_DIR, `${id}_in.${ext}`);
    const outPath = path.join(TEMP_DIR, `${id}_out.webp`);

    await writeFile(inPath, media.buf);

    try {
      if (media.type === 'video') {
        // Animated sticker — max 6s, 512px, with pack metadata
        await execPromise(
          `ffmpeg -y -i "${inPath}" -t 6 ` +
          `-vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" ` +
          `-vcodec libwebp -lossless 0 -qscale 50 -loop 0 -an -vsync 0 "${outPath}"`
        );
      } else {
        // Static sticker with transparency preserved
        await execPromise(
          `ffmpeg -y -i "${inPath}" ` +
          `-vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" ` +
          `-vcodec libwebp -lossless 0 -qscale 75 "${outPath}"`
        );
      }

      const stickerBuf = await readFile(outPath);

      await sock.sendMessage(jid, {
        sticker: stickerBuf,
        // Pack info embedded via EXIF — fallback gracefully if unsupported
        ...(packName ? {
          packname:   packName,
          author:     authorName,
          categories: ['🔥'],
        } : {})
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } finally {
      try { await unlink(inPath);  } catch (_) {}
      try { await unlink(outPath); } catch (_) {}
    }
  }
};

// ─── .toimg — Convert sticker/WebP to image ───────────────────────────────────
export const toimgCommand = {
  name: 'toimg',
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;

    // Accept sticker or image (webp)
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const stickerMsg = quoted?.stickerMessage || msg.message?.stickerMessage;
    const imageMsg   = quoted?.imageMessage   || msg.message?.imageMessage;
    const mediaMsg   = stickerMsg || imageMsg;

    if (!mediaMsg) throw new Error('Please reply to a sticker or image with .toimg');

    await sock.sendMessage(jid, { react: { text: '🖼️', key: msg.key } });

    const mediaType = stickerMsg ? 'sticker' : 'image';
    const stream    = await downloadContentFromMessage(mediaMsg, mediaType);
    let buf = Buffer.from([]);
    for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);

    const id      = `${msg.key.id}_${Date.now()}`;
    const inPath  = path.join(TEMP_DIR, `${id}_in.webp`);
    const outPath = path.join(TEMP_DIR, `${id}_out.png`);

    await writeFile(inPath, buf);

    try {
      // Convert WebP → PNG using ffmpeg
      await execPromise(`ffmpeg -y -i "${inPath}" "${outPath}"`);

      const imgBuf = await readFile(outPath);

      await sock.sendMessage(jid, {
        image:   imgBuf,
        caption: '🖼️ *Sticker → Image*\n_ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_',
        mimetype: 'image/png',
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } finally {
      try { await unlink(inPath);  } catch (_) {}
      try { await unlink(outPath); } catch (_) {}
    }
  }
};

// ─── .calendar — Show calendar with channel meta-preview style ────────────────
export const calendarCommand = {
  name: 'calendar',
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;

    // Parse optional month/year from args: .calendar 6 2025 or .calendar (current)
    const now     = new Date();
    let month     = now.getMonth();       // 0-indexed
    let year      = now.getFullYear();

    if (args[0] && !isNaN(args[0])) {
      month = parseInt(args[0]) - 1;      // user passes 1-12
      if (args[1] && !isNaN(args[1])) year = parseInt(args[1]);
    }

    month = Math.max(0, Math.min(11, month));

    const MONTHS = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    const firstDay    = new Date(year, month, 1).getDay();   // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate   = now.getFullYear() === year && now.getMonth() === month
                        ? now.getDate()
                        : -1;

    // Build grid
    const header = `📅 *${MONTHS[month].toUpperCase()} ${year}*`;
    const divider = '─────────────────────';
    const dayRow  = DAYS.join('  ');

    let grid  = '';
    let cells = Array(firstDay).fill('  ');

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d === todayDate ? `*${String(d).padStart(2)}*` : String(d).padStart(2));
    }

    // pad to full weeks
    while (cells.length % 7 !== 0) cells.push('  ');

    for (let i = 0; i < cells.length; i += 7) {
      grid += cells.slice(i, i + 7).join('  ') + '\n';
    }

    const prevMonth = month === 0 ? `Dec ${year - 1}` : `${MONTHS[month - 1].slice(0, 3)} ${year}`;
    const nextMonth = month === 11 ? `Jan ${year + 1}` : `${MONTHS[month + 1].slice(0, 3)} ${year}`;

    const text =
      `${header}\n${divider}\n` +
      `${dayRow}\n${divider}\n` +
      `${grid}${divider}\n` +
      `◀ ${prevMonth}  •  ${nextMonth} ▶\n\n` +
      `${todayDate > 0 ? `📍 Today: *${todayDate} ${MONTHS[month]} ${year}*\n` : ''}` +
      `💡 _Usage: .calendar [month] [year]_\n` +
      `> _ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`;

    // Send with newsletter/channel meta-preview wrapper (same as rgetfile)
    await sock.relayMessage(
      jid,
      {
        extendedTextMessage: {
          text,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid:   NEWSLETTER_JID,
              serverMessageId: NEWSLETTER_MSG_ID,
              newsletterName:  NEWSLETTER_NAME,
            },
          },
        },
      },
      {}
    );
  }
};

// ─── .qimgcreate — AI Image Generation (Qwen) ────────────────────────────────
const QWEN_COMMON_SIZES = ['512x512', '768x768', '1024x1024', '512x768', '768x1024'];

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function truncate(txt, lim = 320) {
  txt = String(txt || '').replace(/\s+/g, ' ').trim();
  return txt.length > lim ? txt.slice(0, lim - 3) + '...' : txt;
}

function channelMsg(payload) {
  return {
    ...payload,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid:   NEWSLETTER_JID,
        serverMessageId: NEWSLETTER_MSG_ID,
        newsletterName:  NEWSLETTER_NAME,
      },
    },
  };
}

export const qimgcreateCommand = {
  name: 'qimgcreate',
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid       = msg.key.remoteJid;
    const reply     = (payload) =>
      sock.sendMessage(jid, channelMsg(payload), { quoted: msg });

    // Load API keys from environment
    const keyRaw = process.env.QIMGEDIT_KEYS || '';
    const keys   = keyRaw.split(',').map(k => k.trim()).filter(k => k.length > 20);

    if (!keys.length) {
      return reply({
        text:
          `*🖼️ QIMGCREATE*\n─────────────────────\n` +
          `❌ *No Qwen API keys set.*\n` +
          `Set env var: \`QIMGEDIT_KEYS=key1,key2\`\n` +
          `─────────────────────\n> _ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
      });
    }

    // Parse input: .qimgcreate a photo of a cat -size 512x512
    let promptInput = args.join(' ').trim();
    let size        = '1024x1024';

    const sizeMatch = promptInput.match(/-size\s+(\d{3,4}x\d{3,4})\b/i);
    if (sizeMatch) {
      const reqSize = sizeMatch[1];
      if (!QWEN_COMMON_SIZES.includes(reqSize)) {
        return reply({
          text:
            `*❌ QIMGCREATE — INVALID SIZE*\n─────────────────────\n` +
            `Valid sizes: \`${QWEN_COMMON_SIZES.join('` `')}\`\n` +
            `─────────────────────\n> _ZENTRIX MD BY ZENTRIX TECH_`
        });
      }
      size        = reqSize;
      promptInput = promptInput.replace(sizeMatch[0], '').trim();
    }

    if (!promptInput) {
      return reply({
        text:
          `*🖼️ QIMGCREATE — HELP*\n─────────────────────\n` +
          `*Usage:* \`.qimgcreate <prompt> [-size WxH]\`\n` +
          `*Sizes:* \`${QWEN_COMMON_SIZES.join('` `')}\`\n` +
          `*Example:* \`.qimgcreate a dragon in space -size 1024x1024\`\n` +
          `─────────────────────\n> _ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
      });
    }

    // Notify start
    await reply({
      text:
        `*🖼️ QIMGCREATE*\n─────────────────────\n` +
        `🔹 *Prompt:* _${promptInput}_\n` +
        `🔹 *Size:* \`${size}\`\n` +
        `⏳ _Generating..._\n` +
        `─────────────────────\n> _ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
    });

    await sock.sendMessage(jid, { react: { text: '🎨', key: msg.key } });

    // Try each key (shuffled for load balancing)
    const pool = shuffleArr(keys);
    let qwenData = null, imgRes = null, lastErr = null;
    const t0 = Date.now();

    for (const key of pool) {
      try {
        const apiRes = await axios.post(
          'https://qwen.aikit.club/v1/images/generations',
          { prompt: promptInput, size },
          {
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            timeout: 180000,
            validateStatus: () => true,
          }
        );

        // Skip auth/rate-limit errors and try next key
        if (apiRes.status === 401 || apiRes.status === 429) {
          lastErr = new Error(apiRes.data?.message || `HTTP ${apiRes.status}`);
          continue;
        }
        if (apiRes.status < 200 || apiRes.status >= 300) {
          throw new Error(`HTTP ${apiRes.status}: ${apiRes.data?.message || 'Unknown error'}`);
        }

        const url = apiRes.data?.data?.[0]?.url;
        if (!url) throw new Error('No image URL in response');

        imgRes = await axios.get(url, {
          responseType: 'arraybuffer',
          validateStatus: () => true,
        });

        if (imgRes.status >= 200 && imgRes.status < 300 && imgRes.data) {
          qwenData = apiRes.data;
          break;
        }
      } catch (e) {
        lastErr = e;
        continue;
      }
    }

    const t1 = Date.now();

    if (!qwenData || !imgRes?.data) {
      return reply({
        text:
          `*❌ QIMGCREATE FAILED*\n─────────────────────\n` +
          `\`\`\`${lastErr?.message || 'All keys failed'}\`\`\`\n` +
          `─────────────────────\n> _ZENTRIX MD BY ZENTRIX TECH_`
      });
    }

    const revisedPrompt = truncate(qwenData.data[0]?.revised_prompt || promptInput, 320);

    await sock.sendMessage(jid, channelMsg({
      image:   Buffer.from(imgRes.data),
      caption:
        `*🖼️ QIMGCREATE RESULT*\n` +
        `─────────────────────\n` +
        `🔹 *Prompt:* _${revisedPrompt}_\n` +
        `🔹 *Size:* \`${size}\`\n` +
        `🔹 *Time:* \`${((t1 - t0) / 1000).toFixed(2)}s\`\n` +
        `─────────────────────\n> _ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
    }), { quoted: msg });

    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
  }
};

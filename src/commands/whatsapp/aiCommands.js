/**
 * aiCommands.js — ZENTRIX MD AI
 * AI  : prexzyvilla GPT-5 API
 * TTS : Google Cloud Text-to-Speech (multilingual)
 * Audio: TTS mp3 → converted to OGG Opus via ffmpeg for WhatsApp PTT
 * Identity: Created by ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV
 *
 * ZENTRIX KEYWORD AI:
 *  - .zentrix on/off  → toggle keyword trigger per chat
 *  - Once ON: say "ZENTRIX <message>" (no prefix) to get AI reply
 *  - .voicemode <language|off> → when ON, ZENTRIX replies with voice note ONLY
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.js';
import { getMemory, appendMessage } from '../../services/aiMemoryService.js';
import { aiPersonalityPrompt } from '../../config/aiConfig.js';
import { enhanceResponse } from '../../services/emojiIntelligence.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import { automationService } from '../../services/automationService.js';
import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';
import { config } from '../../config/config.js';

const __filename    = fileURLToPath(import.meta.url);
const __dirname     = path.dirname(__filename);
const execFileAsync = promisify(execFile);

// ─── VoiceRSS Language Map ───────────────────────────────────────────────────
// name → VoiceRSS hl (language) code
export const TTS_LANGUAGES = {
  english:    'en-us',
  arabic:     'ar-sa',
  french:     'fr-fr',
  spanish:    'es-es',
  portuguese: 'pt-br',
  german:     'de-de',
  italian:    'it-it',
  dutch:      'nl-nl',
  russian:    'ru-ru',
  japanese:   'ja-jp',
  korean:     'ko-kr',
  chinese:    'zh-cn',
  hindi:      'hi-in',
  turkish:    'tr-tr',
  vietnamese: 'vi-vn',
  thai:       'th-th',
  indonesian: 'id-id',
  polish:     'pl-pl',
  swedish:    'sv-se',
  norwegian:  'nb-no',
  danish:     'da-dk',
  finnish:    'fi-fi',
  greek:      'el-gr',
  czech:      'cs-cz',
  catalan:    'ca-es',
  romanian:   'ro-ro',
  hungarian:  'hu-hu',
};

// Short-code aliases (so .voicemode en or .voicemode arabic both work)
const LANG_ALIASES = {
  en: 'english', ar: 'arabic', fr: 'french', es: 'spanish',
  pt: 'portuguese', de: 'german', it: 'italian', nl: 'dutch',
  ru: 'russian', ja: 'japanese', ko: 'korean', zh: 'chinese',
  hi: 'hindi', tr: 'turkish', vi: 'vietnamese', th: 'thai',
  id: 'indonesian', pl: 'polish', sv: 'swedish', no: 'norwegian',
  da: 'danish', fi: 'finnish', el: 'greek', cs: 'czech', uk: 'ukrainian',
};

function resolveLang(input) {
  if (!input) return null;
  const lower = input.toLowerCase();
  // Direct match (english, arabic…)
  if (TTS_LANGUAGES[lower]) return lower;
  // Short-code match (en, ar…)
  if (LANG_ALIASES[lower]) return LANG_ALIASES[lower];
  return null;
}


// ─── Translation Language Map (MyMemory API) ─────────────────────────────────
// Maps voicemode lang name → MyMemory language code for translation
const TRANSLATE_LANGS = {
  english:    'en',
  arabic:     'ar',
  french:     'fr',
  spanish:    'es',
  portuguese: 'pt',
  german:     'de',
  italian:    'it',
  dutch:      'nl',
  russian:    'ru',
  japanese:   'ja',
  korean:     'ko',
  chinese:    'zh',
  hindi:      'hi',
  turkish:    'tr',
  vietnamese: 'vi',
  thai:       'th',
  indonesian: 'id',
  polish:     'pl',
  swedish:    'sv',
  norwegian:  'no',
  danish:     'da',
  finnish:    'fi',
  greek:      'el',
  czech:      'cs',
  catalan:    'ca',
  romanian:   'ro',
  hungarian:  'hu',
};

// ─── Translate text using MyMemory (free, no key needed) ──────────────────────
async function translateText(text, targetLang) {
  if (targetLang === 'english' || targetLang === 'en') return text;
  const langCode = TRANSLATE_LANGS[targetLang];
  if (!langCode || langCode === 'en') return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    const translated = data?.responseData?.translatedText;
    if (translated && translated.trim()) {
      logger.info(`[Translate] en → ${langCode}: done`);
      return translated.trim();
    }
  } catch (err) {
    logger.warn(`[Translate] Failed: ${err.message} — using original text`);
  }
  return text; // fallback to original if translation fails
}

// ─── Temp dir ────────────────────────────────────────────────────────────────
function getTmpDir() {
  const dir = path.join(__dirname, '../../../tmp/media');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── VoiceRSS TTS → OGG Opus ─────────────────────────────────────────────────
async function textToVoiceNote(text, langName = 'english') {
  const apiKey = config.voiceRssApiKey;
  if (!apiKey) {
    logger.error('[TTS] voiceRssApiKey not set in config.js');
    return null;
  }

  const langCode = TTS_LANGUAGES[langName] || TTS_LANGUAGES.english;

  const tmpDir  = getTmpDir();
  const id      = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const mp3File = path.join(tmpDir, `${id}.mp3`);
  const oggFile = path.join(tmpDir, `${id}.ogg`);

  try {
    // 1. Call VoiceRSS API — returns raw MP3 audio
    const url = `https://api.voicerss.org/?key=${apiKey}&hl=${langCode}&c=MP3&f=44khz_16bit_mono&src=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    const buf = Buffer.from(res.data);

    // VoiceRSS returns an error string (not audio) if something is wrong
    const preview = buf.slice(0, 50).toString('utf8');
    if (preview.includes('ERROR') || buf.byteLength < 1000) {
      logger.warn(`[TTS] VoiceRSS error: ${preview}`);
      return null;
    }

    // 2. Save mp3
    fs.writeFileSync(mp3File, buf);

    // 3. Convert mp3 → ogg opus (WhatsApp PTT format)
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',   mp3File,
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-vbr', 'on',
      '-ar',  '48000',
      '-ac',  '1',
      oggFile,
    ]);

    return fs.readFileSync(oggFile);

  } catch (err) {
    logger.error(`[TTS] Voice note failed: ${err.message}`);
    return null;
  } finally {
    try { if (fs.existsSync(mp3File)) fs.unlinkSync(mp3File); } catch (_) {}
    try { if (fs.existsSync(oggFile)) fs.unlinkSync(oggFile); } catch (_) {}
  }
}

// ─── Send WhatsApp Voice Note ─────────────────────────────────────────────────
async function sendVoiceNote(sock, chatId, oggBuffer, quotedMsg) {
  await sock.sendMessage(
    chatId,
    {
      audio:    oggBuffer,
      mimetype: 'audio/ogg; codecs=opus',
      ptt:      true,
    },
    { quoted: quotedMsg }
  );
}

// ─── Core ZENTRIX AI Call (prexzyvilla GPT-5) ─────────────────────────────────
async function callZentrixAI(prompt) {
  const endpoints = [
    `https://apis.prexzyvilla.site/ai/gpt-5?text=`,
    `https://apis.prexzyvilla.site/ai/gpt4?text=`,
    `https://apis.prexzyvilla.site/ai/chatbot?text=`,
  ];

  for (const endpoint of endpoints) {
    try {
      const { data } = await axios.get(endpoint + encodeURIComponent(prompt), { timeout: 30000 });
      const text =
        data?.text ||
        data?.result ||
        data?.response ||
        data?.data?.response ||
        data?.message ||
        (typeof data === 'string' ? data : null);
      if (text && text.trim()) return text.trim();
    } catch (err) {
      logger.warn(`[ZENTRIX AI] Endpoint failed: ${endpoint} — ${err.message}`);
    }
  }
  throw new Error('ZENTRIX AI is temporarily unavailable. Please try again later.');
}

// ─── ZENTRIX Keyword AI Handler ───────────────────────────────────────────────
// Called from messageHandler when someone says "ZENTRIX <message>" in a chat
// where .zentrix is ON. Voice mode is checked here — if ON, reply is VOICE ONLY.
export async function handleZentrixKeyword({ sock, msg, userInput, botNumber, userNumber, chatId, userName, isGroup }) {
  const settings  = getChatSettings(botNumber, chatId);
  const vm        = settings.automation?.voicemode;
  const voiceOn   = vm?.enabled === true;
  const voiceLang = vm?.lang || 'english';

  // Memory
  const memory = await getMemory(botNumber, userNumber, chatId);
  const historyText = memory.messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const userContext = `User Name: ${userName}\nUser Number: ${userNumber}\nChat Type: ${isGroup ? 'Group' : 'Private'}`;
  const fullPrompt  = `${aiPersonalityPrompt}\n\n${userContext}\n\n${historyText ? `Conversation History:\n${historyText}\n\n` : ''}User: ${userInput}`;

  await sock.sendMessage(chatId, { react: { text: '🧠', key: msg.key } });

  try {
    await automationService.autoType(sock, chatId, userInput);

    const aiResponse       = await callZentrixAI(fullPrompt);
    const enhancedResponse = enhanceResponse(aiResponse);

    await appendMessage(botNumber, userNumber, chatId, 'user',      userInput);
    await appendMessage(botNumber, userNumber, chatId, 'assistant', enhancedResponse);

    if (voiceOn) {
      // ── Voice mode ON → translate to target language, then voice note only ──
      const translatedResponse = await translateText(aiResponse, voiceLang);
      const oggBuf = await textToVoiceNote(translatedResponse, voiceLang);
      if (oggBuf) {
        await sendVoiceNote(sock, chatId, oggBuf, msg);
      } else {
        // TTS failed — fall back to text so user isn't left hanging
        await sock.sendMessage(chatId,
          { text: `⚠️ _Voice note failed — TTS error. Here's the text reply:_\n\n${enhancedResponse}` },
          { quoted: msg }
        );
      }
    } else {
      // ── Voice mode OFF → send text only ──
      await sock.sendMessage(chatId, { text: enhancedResponse }, { quoted: msg });
    }

    await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    logger.error(`[ZENTRIX AI] Error: ${error.message}`);
    await sock.sendMessage(chatId,
      { text: '❌ ZENTRIX AI is currently unavailable. Please try again later.' },
      { quoted: msg }
    );
  }
}

// ─── .zentrix on/off ──────────────────────────────────────────────────────────
// Enables/disables ZENTRIX AI for the current chat.
// Private chat: replies to ALL messages when ON
// Group chat: replies ONLY when the bot's paired number is tagged (@number)
// Also handles the ZENTRIX keyword trigger in both modes.
export const zentrixCommand = {
  name: 'zentrix',
  execute: async ({ sock, msg, args, isOwner, isAdmin, phoneNumber }) => {
    if (!isOwner && !isAdmin) throw new Error('This command requires admin or owner privileges.');

    const jid     = msg.key.remoteJid;
    const action  = args[0]?.toLowerCase();
    const isGroup = jid.endsWith('@g.us');

    if (action === 'on') {
      updateChatSettings(phoneNumber, jid, { automation: { zentrix: { enabled: true } } });
      const note = isGroup
        ? `In this group, tag *@${phoneNumber}* to chat with the AI.`
        : 'In this private chat, I will reply to *all messages*.';
      return await sock.sendMessage(jid, {
        text: `✅ *ZENTRIX AI* is now *ON*.\n\n${note}\n\n🎙️ Combine with *.voicemode <language>* for voice replies.\n\n_ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
      }, { quoted: msg });
    }

    if (action === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { zentrix: { enabled: false } } });
      return await sock.sendMessage(jid, {
        text: '❌ *ZENTRIX AI* is now *OFF*.'
      }, { quoted: msg });
    }

    // Status check
    const s       = getChatSettings(phoneNumber, jid);
    const zStatus = s.automation?.zentrix?.enabled ? '🟢 ON' : '🔴 OFF';
    const vmOn    = s.automation?.voicemode?.enabled ? '🟢 ON' : '🔴 OFF';
    const vmLang  = s.automation?.voicemode?.lang || 'english';
    await sock.sendMessage(jid, {
      text:
        `ℹ️ *ZENTRIX AI Status:* ${zStatus}\n` +
        `🎙️ *Voice Mode:* ${vmOn} _(lang: ${vmLang})_\n\n` +
        `*How it works:*\n` +
        `• *Private chat* — replies to all messages\n` +
        `• *Group chat* — replies when @${phoneNumber} is tagged\n` +
        `• *Keyword* — say ZENTRIX <message> anywhere\n\n` +
        `*Commands:*\n` +
        `• *.zentrix on/off*\n` +
        `• *.voicemode arabic* — voice replies in Arabic\n` +
        `• *.voicemode off* — text replies only\n\n` +
        `_ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
    }, { quoted: msg });
  }
};

// ─── .voicemode <language|off> ────────────────────────────────────────────────
// Only affects the ZENTRIX keyword AI. When ON, ZENTRIX replies with voice only.
export const voicemodeCommand = {
  name: 'voicemode',
  execute: async ({ sock, msg, args, isOwner, isAdmin, phoneNumber }) => {
    if (!isOwner && !isAdmin) throw new Error('This command requires admin or owner privileges.');

    const jid   = msg.key.remoteJid;
    const input = args[0]?.toLowerCase();

    // Show language list
    if (!input) {
      const langList = Object.keys(TTS_LANGUAGES)
        .map(name => `• *${name}*`)
        .join('\n');
      return await sock.sendMessage(jid, {
        text:
          `🎙️ *Voice Mode — Supported Languages:*\n\n${langList}\n\n` +
          `*Usage:*\n` +
          `• .voicemode english\n` +
          `• .voicemode arabic\n` +
          `• .voicemode off\n\n` +
          `⚠️ _Voice mode only works with the ZENTRIX keyword AI._\n` +
          `_Make sure .zentrix is ON first._\n\n` +
          `_ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
      }, { quoted: msg });
    }

    // Turn off
    if (input === 'off' || input === 'disable') {
      updateChatSettings(phoneNumber, jid, { automation: { voicemode: { enabled: false, lang: 'english' } } });
      return await sock.sendMessage(jid, {
        text: '🔇 *Voice Mode* is now *OFF*. ZENTRIX AI will reply in text.'
      }, { quoted: msg });
    }

    // Resolve language
    const langName = resolveLang(input);
    if (!langName) {
      const similar = Object.keys(TTS_LANGUAGES)
        .filter(l => l.startsWith(input[0]))
        .slice(0, 5)
        .join(', ');
      return await sock.sendMessage(jid, {
        text:
          `❌ Unknown language: *${input}*` +
          `${similar ? `\n\nSimilar options: ${similar}` : ''}\n\n` +
          `Type *.voicemode* to see all supported languages.`
      }, { quoted: msg });
    }

    // Save setting
    updateChatSettings(phoneNumber, jid, {
      automation: { voicemode: { enabled: true, lang: langName } }
    });

    const langDisplay = langName.charAt(0).toUpperCase() + langName.slice(1);

    await sock.sendMessage(jid, {
      text:
        `✅ *Voice Mode* activated!\n` +
        `🌐 Language: *${langDisplay}*\n\n` +
        `🎙️ ZENTRIX AI will now reply with *voice notes only*.\n` +
        `Make sure *.zentrix on* is enabled.\n\n` +
        `_ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV_`
    }, { quoted: msg });

    // Demo voice note
    await sock.sendMessage(jid, { react: { text: '🎙️', key: msg.key } });
    const demoText = `Hello! Voice mode is now active in ${langDisplay}. I am ZENTRIX MD AI, forged by UNKNOWN DEV.`;
    const oggBuf   = await textToVoiceNote(demoText, langName);
    if (oggBuf) {
      await sendVoiceNote(sock, jid, oggBuf, msg);
    } else {
      await sock.sendMessage(jid, {
        text: '⚠️ _Demo voice note failed. Check that voiceRssApiKey is set in your config.js file._'
      });
    }
  }
};

// ─── .gpt (prefix command, text reply always) ────────────────────────────────
async function handleGPTRequest({ sock, msg, args, botNumber, userNumber, chatId, userName, isGroup }) {
  const userInput = args.join(' ').trim();
  if (!userInput) throw new Error('Please provide a message. Usage: .gpt <your question>');

  const memory = await getMemory(botNumber, userNumber, chatId);
  const historyText = memory.messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const userContext = `User Name: ${userName}\nUser Number: ${userNumber}\nChat Type: ${isGroup ? 'Group' : 'Private'}`;
  const fullPrompt  = `${aiPersonalityPrompt}\n\n${userContext}\n\n${historyText ? `Conversation History:\n${historyText}\n\n` : ''}User: ${userInput}`;

  await sock.sendMessage(chatId, { react: { text: '🧠', key: msg.key } });

  try {
    await automationService.autoType(sock, chatId, userInput);
    const aiResponse       = await callZentrixAI(fullPrompt);
    const enhancedResponse = enhanceResponse(aiResponse);

    await appendMessage(botNumber, userNumber, chatId, 'user',      userInput);
    await appendMessage(botNumber, userNumber, chatId, 'assistant', enhancedResponse);

    await sock.sendMessage(chatId, { text: enhancedResponse }, { quoted: msg });
    await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
  } catch (error) {
    logger.error(`[GPT] Error: ${error.message}`);
    throw new Error('AI service is currently unavailable. Please try again later.');
  }
}

export const gptCommand = {
  name: 'gpt',
  execute: async ({ sock, msg, args, phoneNumber, userId, userName, isGroup }) => {
    await handleGPTRequest({
      sock, msg, args,
      botNumber:  phoneNumber,
      userNumber: normalizeJidToNumber(userId, sock),
      chatId:     msg.key.remoteJid,
      userName,   isGroup,
    });
  }
};

export const thinkCommand = {
  name: 'think',
  execute: async ({ sock, msg, args, phoneNumber, userId, userName, isGroup }) => {
    await handleGPTRequest({
      sock, msg,
      args:       ['Think step by step and reason carefully:', ...args],
      botNumber:  phoneNumber,
      userNumber: normalizeJidToNumber(userId, sock),
      chatId:     msg.key.remoteJid,
      userName,   isGroup,
    });
  }
};

export const logicCommand = {
  name: 'logic',
  execute: async ({ sock, msg, args, phoneNumber, userId, userName, isGroup }) => {
    await handleGPTRequest({
      sock, msg,
      args:       ['Analyze this logically and analytically:', ...args],
      botNumber:  phoneNumber,
      userNumber: normalizeJidToNumber(userId, sock),
      chatId:     msg.key.remoteJid,
      userName,   isGroup,
    });
  }
};

export const codeaiCommand = {
  name: 'codeai',
  execute: async ({ sock, msg, args, phoneNumber, userId, userName, isGroup }) => {
    await handleGPTRequest({
      sock, msg,
      args:       ['You are an expert programmer. Help with this coding task:', ...args],
      botNumber:  phoneNumber,
      userNumber: normalizeJidToNumber(userId, sock),
      chatId:     msg.key.remoteJid,
      userName,   isGroup,
    });
  }
};

export const chatxCommand = {
  name: 'chatx',
  execute: async ({ sock, msg, args, phoneNumber, userId, userName, isGroup }) => {
    await handleGPTRequest({
      sock, msg, args,
      botNumber:  phoneNumber,
      userNumber: normalizeJidToNumber(userId, sock),
      chatId:     msg.key.remoteJid,
      userName,   isGroup,
    });
  }
};




// ─── Flux Image Generation ────────────────────────────────────────────────────
export const fluxCommand = {
  name: 'flux',
  description: 'Generate high-quality images using Flux Pro 2 AI.',
  usage: '.flux <prompt>',
  category: 'ai image generation',
  subCategory: 'image',
  roleRequired: 'user',
  groupOnly: false,
  emoji: '🎨',
  execute: async ({ sock, msg, args }) => {
    const jid    = msg.key.remoteJid;
    const prompt = args.join(' ').trim();
    const react  = (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });

    if (!prompt) {
      await sock.sendMessage(jid, {
        text: `⚠️ *Usage:* .flux <prompt>\n\n*Example:* .flux a futuristic neon city at night`
      }, { quoted: msg });
      return;
    }

    await react('🎨');

    try {
      const { data: initRes } = await axios.get(
        `https://omegatech-api.dixonomega.tech/api/ai/flux-pro2?prompt=${encodeURIComponent(prompt)}`,
        { timeout: 15000 }
      );

      if (!initRes?.success || !initRes?.task_id) throw new Error('Failed to start generation task.');

      const taskId = initRes.task_id;
      let resultUrl = null;

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const { data: check } = await axios.get(
          `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`,
          { timeout: 10000 }
        );
        if (check?.status === 'completed' && check?.image_url) {
          resultUrl = check.image_url;
          break;
        }
        if (check?.status === 'failed') throw new Error('Generation failed on the server.');
      }

      if (!resultUrl) throw new Error('Generation timed out after 60 seconds.');

      await Promise.all([
        sock.sendMessage(jid, {
          image: { url: resultUrl },
          caption: `✨ *FLUX PRO 2*\n\n📝 *Prompt:* ${prompt}\n\n_ZENTRIX MD BY ZENTRIX TECH | Powered by Omegatech API_`,
          contextInfo: {
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363425412882254@newsletter',
              newsletterName: '𝐙𝐄𝐍𝐓𝐑𝐈𝐗 𝐓𝐄𝐂𝐇 𓅯',
              serverMessageId: -1,
            },
          },
        }, { quoted: msg }),
        react('✅'),
      ]);

    } catch (e) {
      await react('❌');
      await sock.sendMessage(jid, { text: `❌ *Error:* ${e.message}` }, { quoted: msg });
    }
  },
};

export const fluxproCommand  = { ...fluxCommand, name: 'fluxpro'  };
export const fluxpro2Command = { ...fluxCommand, name: 'fluxpro2' };
export const flux2Command    = { ...fluxCommand, name: 'flux2'    };

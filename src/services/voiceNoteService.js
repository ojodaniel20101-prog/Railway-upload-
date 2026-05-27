/**
 * voiceNoteService.js — Transcribe WhatsApp voice notes using Groq Whisper API
 * Place this file at: src/services/voiceNoteService.js
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import FormData from 'form-data';
import logger from '../utils/logger.js';
import { config } from '../config/config.js';

const __filename    = fileURLToPath(import.meta.url);
const __dirname     = path.dirname(__filename);
const execFileAsync = promisify(execFile);

function getTmpDir() {
  const dir = path.join(__dirname, '../../tmp/media');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Download a WhatsApp voice note and convert ogg → wav using ffmpeg.
 * Returns the wav file path, or null on failure.
 */
async function downloadAndConvertVoiceNote(msg) {
  const tmpDir  = getTmpDir();
  const id      = `vn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const oggFile = path.join(tmpDir, `${id}.ogg`);
  const wavFile = path.join(tmpDir, `${id}.wav`);

  try {
    // 1. Download the audio from WhatsApp
    const audioMsg = msg.message?.audioMessage || msg.message?.pttMessage;
    if (!audioMsg) return null;

    const stream = await downloadContentFromMessage(audioMsg, 'audio');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (!buffer || buffer.length < 500) {
      logger.warn('[VoiceNote] Downloaded audio is too small, skipping');
      return null;
    }

    fs.writeFileSync(oggFile, buffer);

    // 2. Convert ogg opus → wav (Groq Whisper accepts wav/mp3/m4a etc.)
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',   oggFile,
      '-ar',  '16000',   // 16kHz sample rate (ideal for speech recognition)
      '-ac',  '1',       // mono
      '-c:a', 'pcm_s16le',
      wavFile,
    ]);

    return wavFile;
  } catch (err) {
    logger.error(`[VoiceNote] Download/convert failed: ${err.message}`);
    return null;
  } finally {
    // Clean up ogg file, keep wav for transcription
    try { if (fs.existsSync(oggFile)) fs.unlinkSync(oggFile); } catch (_) {}
  }
}

/**
 * Transcribe a wav file using Groq Whisper API.
 * Returns the transcribed text string, or null on failure.
 */
async function transcribeWithGroq(wavFile) {
  const apiKey = config.groqApiKey;
  if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
    logger.error('[VoiceNote] groqApiKey is not set in config.js');
    return null;
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(wavFile), {
      filename:    'audio.wav',
      contentType: 'audio/wav',
    });
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    // Remove the line below to auto-detect language
    // form.append('language', 'en');

    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    const text = data?.text?.trim();
    if (!text) {
      logger.warn('[VoiceNote] Groq returned empty transcription');
      return null;
    }

    logger.info(`[VoiceNote] Transcribed: "${text.slice(0, 80)}..."`);
    return text;

  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.error(`[VoiceNote] Groq transcription failed: ${errMsg}`);
    return null;
  }
}

/**
 * Main function — transcribe a WhatsApp voice note message.
 * Call this from messageHandler when you receive a ptt audio message.
 *
 * @param {object} msg - The WhatsApp message object from Baileys
 * @returns {string|null} - Transcribed text or null if failed
 */
export async function transcribeVoiceNote(msg) {
  const wavFile = await downloadAndConvertVoiceNote(msg);
  if (!wavFile) return null;

  try {
    const text = await transcribeWithGroq(wavFile);
    return text;
  } finally {
    // Always clean up wav file
    try { if (fs.existsSync(wavFile)) fs.unlinkSync(wavFile); } catch (_) {}
  }
}

/**
 * Check if a message is a WhatsApp voice note (ptt = push to talk).
 */
export function isVoiceNote(msg) {
  const audio = msg.message?.audioMessage;
  return !!(audio && audio.ptt === true);
}

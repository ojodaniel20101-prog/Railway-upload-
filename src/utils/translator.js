/**
 * translator.js — Shared translation utility for ZENTRIX MD BY ZENTRIX TECH.
 * Uses popcat.xyz translate API (same as .translate command).
 * Handles chunking for long texts and preserves WhatsApp formatting.
 */

import axios from 'axios';
import logger from './logger.js';

const TRANSLATE_API = 'https://api.popcat.xyz/translate';
const CHUNK_SIZE    = 1800; // safe char limit per API call

/**
 * Translate a single string to the target language.
 * Returns original text if translation fails.
 */
export async function translateText(text, langCode) {
  if (!text || !langCode || langCode === 'en') return text;
  try {
    const { data } = await axios.get(TRANSLATE_API, {
      params: { to: langCode, text },
      timeout: 8000,
    });
    return data?.translated || text;
  } catch (err) {
    logger.warn(`[Translator] Failed to translate to ${langCode}: ${err.message}`);
    return text;
  }
}

/**
 * Translate a long block of text by splitting into chunks.
 * Preserves line breaks and rejoins after translation.
 */
export async function translateLongText(text, langCode) {
  if (!text || !langCode || langCode === 'en') return text;

  // Split into lines, group into chunks under CHUNK_SIZE
  const lines  = text.split('\n');
  const chunks = [];
  let current  = '';

  for (const line of lines) {
    if ((current + '\n' + line).length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);

  // Translate each chunk
  const translated = await Promise.all(
    chunks.map(chunk => translateText(chunk, langCode))
  );

  return translated.join('\n');
}

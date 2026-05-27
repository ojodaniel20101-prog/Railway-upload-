/**
 * aiMemoryService.js — Persistent AI conversation memory for ZENTRIX MD BY ZENTRIX TECH.
 * Implements multi-tenant isolation: {botNumber}:{userNumber}:{chatId}
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const MEMORY_DIR = path.join(process.cwd(), 'database', 'memory');

/**
 * Ensures the memory directory exists.
 */
async function ensureDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

/**
 * Generates a unique key for memory isolation.
 * Format: {botNumber}:{userNumber}:{chatId}
 */
function getMemoryKey(botNumber, userNumber, chatId) {
  return `${botNumber}:${userNumber}:${chatId}`.replace(/[^a-zA-Z0-9:]/g, '_');
}

/**
 * Gets the file path for a specific memory key.
 */
function getFilePath(key) {
  return path.join(MEMORY_DIR, `${key}.json`);
}

/**
 * Loads conversation history for a specific context.
 */
export async function getMemory(botNumber, userNumber, chatId) {
  const key = getMemoryKey(botNumber, userNumber, chatId);
  const filePath = getFilePath(key);

  try {
    await ensureDir();
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        userId: userNumber,
        chatId: chatId,
        messages: [],
        lastUpdated: Date.now()
      };
    }
    logger.error(`[MemoryService] Failed to load memory for ${key}:`, error);
    return { userId: userNumber, chatId: chatId, messages: [], lastUpdated: Date.now() };
  }
}

/**
 * Saves conversation history for a specific context.
 */
export async function saveMemory(botNumber, userNumber, chatId, messages) {
  const key = getMemoryKey(botNumber, userNumber, chatId);
  const filePath = getFilePath(key);

  try {
    await ensureDir();
    const data = {
      userId: userNumber,
      chatId: chatId,
      messages: messages.slice(-20), // Keep last 20 messages for context window
      lastUpdated: Date.now()
    };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    logger.error(`[MemoryService] Failed to save memory for ${key}:`, error);
  }
}

/**
 * Appends a new message to the history.
 */
export async function appendMessage(botNumber, userNumber, chatId, role, content) {
  const memory = await getMemory(botNumber, userNumber, chatId);
  memory.messages.push({ role, content });
  await saveMemory(botNumber, userNumber, chatId, memory.messages);
}

/**
 * Clears memory for a specific context.
 */
export async function clearMemory(botNumber, userNumber, chatId) {
  const key = getMemoryKey(botNumber, userNumber, chatId);
  const filePath = getFilePath(key);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error(`[MemoryService] Failed to clear memory for ${key}:`, error);
    }
  }
}

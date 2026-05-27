/**
 * telegram.js — Core Telegram module for ZENTRIX MD BY ZENTRIX TECH Platform.
 * Features: Professional Console Logging and Centralized Update Dispatching.
 */

import TelegramBot from 'node-telegram-bot-api';
import { environment } from '../config/environment.js';
import { handleTelegramMessage, handleTelegramError } from '../handlers/telegramHandler.js';
import logger from '../utils/logger.js';

let bot;

/**
 * Initializes the Telegram bot and sets up event listeners.
 */
export function initializeTelegramBot() {
  const token = environment.telegramBotToken;
  if (!token) {
    logger.error('Telegram bot token is not configured. Please set TELEGRAM_BOT_TOKEN in your environment.');
    process.exit(1);
  }

  logger.telegram('Initializing Telegram Enterprise Core...', 'STARTUP');

  bot = new TelegramBot(token, { 
    polling: {
      interval: 300,
      autoStart: true,
      params: { timeout: 10 }
    }
  });

  // 1. Global Error Handler
  bot.on('error', handleTelegramError);
  bot.on('polling_error', handleTelegramError);
  bot.on('webhook_error', handleTelegramError);

  // 2. Message Handler
  bot.on('message', async (msg) => {
    try {
      if (msg.text && msg.chat.type === 'private') {
        await handleTelegramMessage(bot, msg);
      }
    } catch (error) {
      logger.error('Critical error in Telegram message handler:', error);
    }
  });

  // 3. Callback Query Handler (Inline Buttons)
  bot.on('callback_query', async (callbackQuery) => {
    try {
      const msg = callbackQuery.message;
      // Ensure msg has the correct 'from' user for the handler
      msg.from = callbackQuery.from; 
      msg.text = callbackQuery.data; // Treat callback data as text for the handler
      
      await handleTelegramMessage(bot, msg, callbackQuery.id);
    } catch (error) {
      logger.error('Critical error in Telegram callback handler:', error);
    }
  });

  logger.success('Telegram Enterprise Core Online', 'SYSTEM');
  return bot;
}

/**
 * Returns the bot instance for external use.
 */
export function getTelegramBot() {
  if (!bot) {
    throw new Error('Telegram bot has not been initialized.');
  }
  return bot;
}

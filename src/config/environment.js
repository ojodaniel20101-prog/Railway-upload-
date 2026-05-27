import { config } from './config.js';

export const environment = {
  isProduction: process.env.NODE_ENV === 'production',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || config.telegramBotToken,
  whatsappCommandPrefix: process.env.WHATSAPP_COMMAND_PREFIX || config.whatsappCommandPrefix,
  sessionDataPath: process.env.SESSION_DATA_PATH || config.sessionDataPath,
};

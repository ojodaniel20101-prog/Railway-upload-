/**
 * .antibot command — AI-powered bot/spam detection for groups.
 * Modes: off, detect, on, strict.
 * Admins and the bot owner are always exempt.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .antibot off/detect/on/strict/status');
    }

    const mode = args[0].toLowerCase();
    const settings = getChatSettings(phoneNumber, jid);

    if (['off', 'detect', 'on', 'strict'].includes(mode)) {
      if (!settings.automation) settings.automation = {};
      if (!settings.automation.antibot) settings.automation.antibot = {};

      settings.automation.antibot.mode = mode;
      updateChatSettings(phoneNumber, jid, settings);

      const descriptions = {
        off: 'Antibot is disabled.',
        detect: 'Detection only — logs suspicious activity without action.',
        on: 'Active — warns then kicks confirmed bots.',
        strict: 'Strict — immediately kicks on first detection.'
      };

      await sock.sendMessage(jid, {
        text: `🤖 *Antibot Mode: ${mode.toUpperCase()}*\n\n${descriptions[mode]}\n\n🛡️ Admins and the bot owner are always exempt.`
      });
    } else if (mode === 'status') {
      const currentMode = settings.automation?.antibot?.mode || 'off';
      await sock.sendMessage(jid, {
        text: `🤖 *ANTIBOT STATUS*\n\nMode: ${currentMode.toUpperCase()}\nProtection: ACTIVE\nAdmin Bypass: ENABLED\n\nModes available:\n• off — disabled\n• detect — log only\n• on — warn + kick\n• strict — instant kick`
      });
    } else {
      throw new Error('⚠️ Usage: .antibot off/detect/on/strict/status');
    }
  }
};

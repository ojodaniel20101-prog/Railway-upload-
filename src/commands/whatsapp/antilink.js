/**
 * .antilink command — Configures antilink protection.
 * Detects ALL link types: HTTP/HTTPS, Telegram, YouTube, social media, shortened URLs, etc.
 * Admins and the bot owner are always exempt.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .antilink on [warn/kick] | .antilink off');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const action = args[0].toLowerCase();

    if (action === 'on') {
      settings.protection.antilink.enabled = true;
      if (args[1]) {
        const mode = args[1].toLowerCase();
        if (mode === 'warn' || mode === 'kick') {
          settings.protection.antilink.mode = mode;
        }
      }
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, {
        text: `🔗 *Antilink Enabled*\n\nMode: ${settings.protection.antilink.mode.toUpperCase()}\n\n✅ All link types are now monitored:\n• HTTP/HTTPS URLs\n• WhatsApp invite links\n• Telegram links\n• Social media links\n• Shortened URLs\n• And all other domains\n\n🛡️ Admins are exempt from this rule.`
      });
    } else if (action === 'off') {
      settings.protection.antilink.enabled = false;
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, { text: `🔗 *Antilink Disabled*` });
    } else {
      throw new Error('⚠️ Usage: .antilink on [warn/kick] | .antilink off');
    }
  }
};

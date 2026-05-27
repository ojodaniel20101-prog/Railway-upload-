/**
 * .antiinvite command — Blocks WhatsApp group invite links specifically.
 * Admins and the bot owner are always exempt.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .antiinvite on [warn/kick] | .antiinvite off');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const action = args[0].toLowerCase();

    if (action === 'on') {
      settings.protection.antiinvite.enabled = true;
      if (args[1]) {
        const mode = args[1].toLowerCase();
        if (mode === 'warn' || mode === 'kick') {
          settings.protection.antiinvite.mode = mode;
        }
      }
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, {
        text: `🔗 *Antiinvite Enabled*\n\nMode: ${settings.protection.antiinvite.mode.toUpperCase()}\n\nWhatsApp group invite links (chat.whatsapp.com) will be blocked.\n🛡️ Admins are exempt from this rule.`
      });
    } else if (action === 'off') {
      settings.protection.antiinvite.enabled = false;
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, { text: `🔗 *Antiinvite Disabled*` });
    } else {
      throw new Error('⚠️ Usage: .antiinvite on [warn/kick] | .antiinvite off');
    }
  }
};

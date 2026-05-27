/**
 * .antiflood command — Blocks message flooding (5+ messages in 5 seconds).
 * Admins and the bot owner are always exempt.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .antiflood on [warn/kick] | .antiflood off');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const action = args[0].toLowerCase();

    if (action === 'on') {
      settings.protection.antiflood.enabled = true;
      if (args[1]) {
        const mode = args[1].toLowerCase();
        if (mode === 'warn' || mode === 'kick') {
          settings.protection.antiflood.mode = mode;
        }
      }
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, {
        text: `💧 *Antiflood Enabled*\n\nMode: ${settings.protection.antiflood.mode.toUpperCase()}\n\nUsers sending 5+ messages within 5 seconds will be actioned.\n🛡️ Admins are exempt from this rule.`
      });
    } else if (action === 'off') {
      settings.protection.antiflood.enabled = false;
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, { text: `💧 *Antiflood Disabled*` });
    } else {
      throw new Error('⚠️ Usage: .antiflood on [warn/kick] | .antiflood off');
    }
  }
};

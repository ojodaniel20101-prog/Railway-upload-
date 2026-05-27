/**
 * .antitag command — Blocks mass @mentions (5+ at once).
 * Admins and the bot owner are always exempt.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .antitag on [warn/kick] | .antitag off');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const action = args[0].toLowerCase();

    if (action === 'on') {
      settings.protection.antitag.enabled = true;
      if (args[1]) {
        const mode = args[1].toLowerCase();
        if (mode === 'warn' || mode === 'kick') {
          settings.protection.antitag.mode = mode;
        }
      }
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, {
        text: `🏷️ *Antitag Enabled*\n\nMode: ${settings.protection.antitag.mode.toUpperCase()}\n\nAny @mention will be blocked and deleted.\n🛡️ Admins are exempt from this rule.`
      });
    } else if (action === 'off') {
      settings.protection.antitag.enabled = false;
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, { text: `🏷️ *Antitag Disabled*` });
    } else {
      throw new Error('⚠️ Usage: .antitag on [warn/kick] | .antitag off');
    }
  }
};

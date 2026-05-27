/**
 * antigroupmention.js — Toggle automatic deletion of group-wide mentions.
 */

import { getChatSettings, updateChatSettings, updateGroupSettings } from '../../services/databaseService.js';

export const antigroupmentionCommand = {
  name: 'antigroupmention',
  aliases: ['antiall', 'antieveryone'],
  description: 'Automatically deletes messages containing group-wide mentions like @everyone, @all, or @here. Also prevents the bot from reacting to such mentions in status updates.',
  usage: '.antigroupmention on/off | .antigroupmention 1h (to set timer)',
  category: 'automation',
  subCategory: 'protection',
  roleRequired: 'admin',
  groupOnly: true,
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    const input = args[0]?.toLowerCase();
    const settings = getChatSettings(phoneNumber, jid);

    if (!input || input === 'status') {
      const status = settings.automation?.antigroupmention?.enabled ? '✅ ON' : '❌ OFF';
      const expiry = settings.automation?.antigroupmention?.expiry;
      let timeStr = '';
      if (settings.automation?.antigroupmention?.enabled && expiry) {
        const remaining = expiry - Date.now();
        if (remaining > 0) {
          const mins = Math.ceil(remaining / 60000);
          timeStr = `\n⏳ *Timer:* ${mins} minutes remaining`;
        }
      }
      return sock.sendMessage(jid, { text: `🛡️ *Antigroupmention Status:* ${status}${timeStr}\n\nUsage:\n.antigroupmention on\n.antigroupmention off\n.antigroupmention 1h (set timer)` }, { quoted: msg });
    }

    if (input === 'on') {
      updateChatSettings(phoneNumber, jid, { automation: { antigroupmention: { enabled: true, expiry: null } } });
      // Also update global settings for status protection
      const globalId = 'global_' + phoneNumber;
      updateGroupSettings(globalId, { automation: { antigroupmention: { enabled: true, expiry: null } } });
      return sock.sendMessage(jid, { text: '✅ *Antigroupmention* activated! Messages with @everyone, @all, or @here will be deleted, and status reactions for these mentions are disabled.' }, { quoted: msg });
    }

    if (input === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { antigroupmention: { enabled: false, expiry: null } } });
      // Also update global settings for status protection
      const globalId = 'global_' + phoneNumber;
      updateGroupSettings(globalId, { automation: { antigroupmention: { enabled: false, expiry: null } } });
      return sock.sendMessage(jid, { text: '❌ *Antigroupmention* deactivated.' }, { quoted: msg });
    }

    // Timer parsing (e.g., 1h, 30m, 10s)
    const timerMatch = input.match(/^(\d+)([hms])$/);
    if (timerMatch) {
      const value = parseInt(timerMatch[1]);
      const unit = timerMatch[2];
      let ms = 0;
      if (unit === 'h') ms = value * 3600000;
      else if (unit === 'm') ms = value * 60000;
      else if (unit === 's') ms = value * 1000;

      const expiry = Date.now() + ms;
      updateChatSettings(phoneNumber, jid, { automation: { antigroupmention: { enabled: true, expiry } } });
      // Also update global settings for status protection
      const globalId = 'global_' + phoneNumber;
      updateGroupSettings(globalId, { automation: { antigroupmention: { enabled: true, expiry } } });
      return sock.sendMessage(jid, { text: `✅ *Antigroupmention* activated for *${value}${unit}*!` }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text: '⚠️ Invalid input. Use: .antigroupmention on/off/1h' }, { quoted: msg });
  }
};

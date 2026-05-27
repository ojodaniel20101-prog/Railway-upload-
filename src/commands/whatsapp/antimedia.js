/**
 * antimedia.js — Toggle automatic media deletion in groups.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export const antimediaCommand = {
  name: 'antimedia',
  description: 'Automatically deletes any form of media (stickers, images, voice notes). Only text allowed.',
  usage: '.antimedia on/off | .antimedia 1h (to set timer)',
  category: 'automation',
  subCategory: 'protection',
  roleRequired: 'admin',
  groupOnly: true,
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    const input = args[0]?.toLowerCase();
    const settings = getChatSettings(phoneNumber, jid);

    if (!input || input === 'status') {
      const status = settings.automation?.antimedia?.enabled ? '✅ ON' : '❌ OFF';
      const expiry = settings.automation?.antimedia?.expiry;
      let timeStr = '';
      if (settings.automation?.antimedia?.enabled && expiry) {
        const remaining = expiry - Date.now();
        if (remaining > 0) {
          const mins = Math.ceil(remaining / 60000);
          timeStr = `\n⏳ *Timer:* ${mins} minutes remaining`;
        }
      }
      return sock.sendMessage(jid, { text: `🛡️ *Antimedia Status:* ${status}${timeStr}\n\nUsage:\n.antimedia on\n.antimedia off\n.antimedia 1h (set timer)` }, { quoted: msg });
    }

    if (input === 'on') {
      updateChatSettings(phoneNumber, jid, { automation: { antimedia: { enabled: true, expiry: null } } });
      return sock.sendMessage(jid, { text: '✅ *Antimedia* activated! All media messages will be deleted.' }, { quoted: msg });
    }

    if (input === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { antimedia: { enabled: false, expiry: null } } });
      return sock.sendMessage(jid, { text: '❌ *Antimedia* deactivated.' }, { quoted: msg });
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
      updateChatSettings(phoneNumber, jid, { automation: { antimedia: { enabled: true, expiry } } });
      return sock.sendMessage(jid, { text: `✅ *Antimedia* activated for *${value}${unit}*!` }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text: '⚠️ Invalid input. Use: .antimedia on/off/1h' }, { quoted: msg });
  }
};

/**
 * .antibadwords command — Blocks messages containing bad/prohibited words.
 * Admins and the bot owner are always exempt.
 * Supports: on/off, custom word list management.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

const DEFAULT_BAD_WORDS = ['spam', 'scam', 'porn', 'xxx', 'nude', 'hack', 'phishing', 'nigga', 'nigger', 'bitch', 'fuck', 'shit', 'asshole', 'bastard', 'whore', 'slut'];

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .antibadwords on/off [warn/kick] | .antibadwords add <word> | .antibadwords remove <word> | .antibadwords list');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const action = args[0].toLowerCase();

    if (action === 'on') {
      settings.protection.antibadwords.enabled = true;
      // Initialize default words if none set
      if (!settings.protection.antibadwords.words || settings.protection.antibadwords.words.length === 0) {
        settings.protection.antibadwords.words = [...DEFAULT_BAD_WORDS];
      }
      if (args[1]) {
        const mode = args[1].toLowerCase();
        if (mode === 'warn' || mode === 'kick') {
          settings.protection.antibadwords.mode = mode;
        }
      }
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, {
        text: `🚫 *Antibadwords Enabled*\n\nMode: ${settings.protection.antibadwords.mode.toUpperCase()}\nWords monitored: ${settings.protection.antibadwords.words.length}\n\nUse .antibadwords add <word> to add custom words.\n🛡️ Admins are exempt from this rule.`
      });
    } else if (action === 'off') {
      settings.protection.antibadwords.enabled = false;
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, { text: `🚫 *Antibadwords Disabled*` });
    } else if (action === 'add') {
      if (!args[1]) throw new Error('⚠️ Usage: .antibadwords add <word>');
      const word = args[1].toLowerCase();
      if (!settings.protection.antibadwords.words) settings.protection.antibadwords.words = [];
      if (!settings.protection.antibadwords.words.includes(word)) {
        settings.protection.antibadwords.words.push(word);
        updateChatSettings(phoneNumber, jid, settings);
        await sock.sendMessage(jid, { text: `✅ Added "${word}" to the bad words list.` });
      } else {
        await sock.sendMessage(jid, { text: `⚠️ "${word}" is already in the list.` });
      }
    } else if (action === 'remove') {
      if (!args[1]) throw new Error('⚠️ Usage: .antibadwords remove <word>');
      const word = args[1].toLowerCase();
      if (!settings.protection.antibadwords.words) settings.protection.antibadwords.words = [];
      const idx = settings.protection.antibadwords.words.indexOf(word);
      if (idx !== -1) {
        settings.protection.antibadwords.words.splice(idx, 1);
        updateChatSettings(phoneNumber, jid, settings);
        await sock.sendMessage(jid, { text: `✅ Removed "${word}" from the bad words list.` });
      } else {
        await sock.sendMessage(jid, { text: `⚠️ "${word}" is not in the list.` });
      }
    } else if (action === 'list') {
      const words = settings.protection.antibadwords.words || DEFAULT_BAD_WORDS;
      await sock.sendMessage(jid, {
        text: `🚫 *Bad Words List*\n\nStatus: ${settings.protection.antibadwords.enabled ? 'ON' : 'OFF'}\nMode: ${settings.protection.antibadwords.mode?.toUpperCase() || 'WARN'}\n\nWords (${words.length}):\n${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}`
      });
    } else {
      throw new Error('⚠️ Usage: .antibadwords on/off [warn/kick] | .antibadwords add <word> | .antibadwords remove <word> | .antibadwords list');
    }
  }
};

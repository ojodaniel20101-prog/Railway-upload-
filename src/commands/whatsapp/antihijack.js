/**
 * .antihijack — Protects the group from internal power grabs.
 *
 * Enforcements (once enabled):
 *   1. Admin demotes another admin  → remove the demoter
 *      (bot and group creator/superadmin are exempt)
 *   2. Someone sends .hijack (or any hijack variant) → instantly lock group
 *      (announce-only mode) and alert
 *
 * Usage:
 *   .antihijack on
 *   .antihijack off
 *   .antihijack status
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const reply = text => sock.sendMessage(jid, { text }, { quoted: msg });

    if (!args.length) {
      return reply(
        `🛡️ *ANTIHIJACK*\n\n` +
        `Usage:\n` +
        `  *.antihijack on*      — enable protection\n` +
        `  *.antihijack off*     — disable protection\n` +
        `  *.antihijack status*  — view current state\n\n` +
        `🔒 *What it protects against:*\n` +
        `  ▸ Admin demoting another admin → demoter is removed\n` +
        `    (bot & group creator are always exempt)\n` +
        `  ▸ *.hijack* command detected → group instantly locked`
      );
    }

    const action = args[0].toLowerCase();
    const settings = getChatSettings(phoneNumber, jid);
    if (!settings.protection) settings.protection = {};
    if (!settings.protection.antihijack) settings.protection.antihijack = {};

    if (action === 'on') {
      const enablerJid = msg.key.participant || msg.key.remoteJid;
      settings.protection.antihijack.enabled    = true;
      settings.protection.antihijack.enablerJid = enablerJid;
      updateChatSettings(phoneNumber, jid, settings);
      return reply(
        `🛡️ *Antihijack ENABLED*\n\n` +
        `✅ Admin demotion attacks → demoter removed\n` +
        `✅ .hijack command detected → group locked\n\n` +
        `_Bot, group creator, and you are always exempt._`
      );
    }

    if (action === 'off') {
      settings.protection.antihijack.enabled = false;
      updateChatSettings(phoneNumber, jid, settings);
      return reply(`🛡️ *Antihijack DISABLED*`);
    }

    if (action === 'status') {
      const s = settings.protection.antihijack;
      return reply(
        `🛡️ *ANTIHIJACK STATUS*\n\n` +
        `State: ${s.enabled ? '✅ ENABLED' : '❌ DISABLED'}`
      );
    }

    return reply('⚠️ Usage: .antihijack on | .antihijack off | .antihijack status');
  }
};

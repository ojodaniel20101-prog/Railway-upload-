/**
 * setbotname.js — Per-Session Custom Bot Name for ZENTRIX MD BY ZENTRIX TECH.
 * Owner-only. Sets a custom display name for this bot session.
 * "ZENTRIX MD BY ZENTRIX TECH" brand is always preserved — shown as "CustomName | ZENTRIX MD BY ZENTRIX TECH".
 * Persisted to database and survives restarts.
 */

import { getBotNameForSession, setBotNameForSession, clearBotNameForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import { getPrefixForSession } from '../../services/databaseService.js';
import logger from '../../utils/logger.js';

const MAX_NAME_LENGTH = 24;

export default {
  name: 'setbotname',
  description: 'Set a custom name for this bot session (ZENTRIX MD BY ZENTRIX TECH brand always stays)',
  category: 'system',
  roleRequired: 'owner',

  execute: async ({ sock, msg, args, isOwner }) => {
    const jid       = msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);

    // Paired user (session owner) only
    if (!isOwner) {
      return sock.sendMessage(jid, {
        text: '❌ Only the paired bot owner can change the bot name.'
      }, { quoted: msg });
    }
    const prefix    = getPrefixForSession(botNumber);
    const current   = getBotNameForSession(botNumber);

    const rawInput = args.join(' ').trim();

    // No input — show current name and usage
    if (!rawInput) {
      return sock.sendMessage(jid, {
        text: [
          `⚙️ *BOT NAME SETTINGS*`,
          ``,
          `📍 *Current Name:* ${current}`,
          ``,
          `*Usage:*`,
          `  \`${prefix}setbotname YourName\`   → sets name`,
          `  \`${prefix}setbotname reset\`       → back to default`,
          ``,
          `*How it looks:*`,
          `  _YourName | ZENTRIX MD BY ZENTRIX TECH_`,
          ``,
          `⚠️ Max ${MAX_NAME_LENGTH} characters. ZENTRIX MD BY ZENTRIX TECH brand always stays.`,
          ``,
          `_Each bot session has its own independent name._`,
        ].join('\n')
      }, { quoted: msg });
    }

    // Reset to default
    if (rawInput.toLowerCase() === 'reset') {
      clearBotNameForSession(botNumber);
      logger.info(`[SetBotName] Session ${botNumber} name reset to default`);
      await sock.sendMessage(jid, {
        text: [
          `✅ *Bot Name Reset*`,
          ``,
          `📍 *Name is now:* ZENTRIX MD BY ZENTRIX TECH`,
          ``,
          `_Default brand restored._`,
        ].join('\n')
      }, { quoted: msg });
      try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}
      return;
    }

    // Length check
    if (rawInput.length > MAX_NAME_LENGTH) {
      return sock.sendMessage(jid, {
        text: `❌ Name too long. Max is ${MAX_NAME_LENGTH} characters.\n\nYou entered: "${rawInput}" (${rawInput.length} chars)`
      }, { quoted: msg });
    }

    // Block empty or whitespace-only
    if (!rawInput.replace(/\s/g, '').length) {
      return sock.sendMessage(jid, {
        text: `❌ Name cannot be empty or spaces only.`
      }, { quoted: msg });
    }

    const newDisplayName = `${rawInput} | ZENTRIX MD BY ZENTRIX TECH`;

    try {
      setBotNameForSession(botNumber, rawInput);
      logger.info(`[SetBotName] Session ${botNumber} name set: "${rawInput}"`);

      await sock.sendMessage(jid, {
        text: [
          `✅ *Bot Name Updated!*`,
          ``,
          `📍 *Old Name:* ${current}`,
          `🆕 *New Name:* ${newDisplayName}`,
          ``,
          `_The ZENTRIX MD BY ZENTRIX TECH brand always stays._`,
          `💾 _Saved. Will persist after restart._`,
          `🔗 _Each bot session has its own independent name._`,
        ].join('\n')
      }, { quoted: msg });

      try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

    } catch (error) {
      logger.error('[SetBotName] Error saving name:', error.message);
      await sock.sendMessage(jid, {
        text: `❌ *Failed to save bot name:* ${error.message}`
      }, { quoted: msg });
    }
  }
};

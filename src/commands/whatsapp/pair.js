/**
 * pair.js — ZENTRIX MD BY ZENTRIX TECH · WhatsApp Session Pairing
 * Usage: .pair <phone number with country code>
 * Example: .pair 2349057467015
 */

import { sessionManager }     from '../../core/sessionManager.js';
import { validatePhoneNumber } from '../../utils/validator.js';
import { formatPairingCode }   from '../../utils/helpers.js';
import logger                  from '../../utils/logger.js';

export default {
  name: 'pair',
  aliases: ['paircode', 'getcode'],
  category: 'general',
  description: 'Pair a WhatsApp account via pairing code.',
  usage: 'pair <phone number>',
  cooldown: 10,
  permissions: ['user'],
  args: true,

  async execute({ sock, msg, args }) {
    const from = msg.key.remoteJid;

    // ── Extract & sanitise number ─────────────────────
    const phoneNumber = args.join('').trim().replace(/[^0-9]/g, '');

    // ── No number provided ────────────────────────────
    if (!phoneNumber) {
      await sock.sendMessage(from, {
        text: [
          `📱 *PAIR DEVICE*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `⚠️ Please provide your number with country code:`,
          ``,
          `  .pair 234xxxxxxxxx`,
          ``,
          `📌 *Rules:*`,
          `  ▸ No + prefix`,
          `  ▸ No spaces`,
          `  ▸ Digits only`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
      }, { quoted: msg });
      return;
    }

    // ── Validate ──────────────────────────────────────
    const { valid, reason } = validatePhoneNumber(phoneNumber);
    if (!valid) {
      await sock.sendMessage(from, {
        text: [
          `❌ *INVALID NUMBER*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `  ${reason}`,
          ``,
          `💡 Example: .pair 2349057467015`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
      }, { quoted: msg });
      return;
    }

    // ── Already active ────────────────────────────────
    if (sessionManager.isSessionActive(phoneNumber)) {
      await sock.sendMessage(from, {
        text: [
          `✅ *ALREADY CONNECTED*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `📞 +${phoneNumber} is already live.`,
          ``,
          `  ▸ No need to pair again.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
      }, { quoted: msg });
      return;
    }

    // ── Generating code ───────────────────────────────
    const waitSent = await sock.sendMessage(from, {
      text: `⏳ *Initiating pairing for* +${phoneNumber}*…*\n\n🧠⚡ ZENTRIX MD BY ZENTRIX TECH DEVICE LINK PROTOCOL ⚡🧠`,
    }, { quoted: msg });

    try {
      const result = await sessionManager.createSession(phoneNumber);

      if (result.success && result.pairingCode) {
        const code = formatPairingCode(result.pairingCode);

        await sock.sendMessage(from, {
          text: [
            `🔑 *Your Pairing Code for* +${phoneNumber}:`,
            ``,
            `  *${code}*`,
            ``,
            `🧠⚡ ZENTRIX MD BY ZENTRIX TECH DEVICE LINK PROTOCOL ⚡🧠`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━`,
            `*HOW TO LINK:*`,
            ``,
            `1️⃣ Open WhatsApp`,
            `2️⃣ Go to Settings → Linked Devices`,
            `3️⃣ Tap *"Link a Device"* → Enter Code`,
            ``,
            `⚠️ _Code expires in 60 seconds_`,
            `━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `_Powered by ZENTRIX TECH Enterprise_`,
          ].join('\n'),
        }, { quoted: waitSent });

        logger.info(`[Pair] Pairing code issued → ${phoneNumber}`);

      } else {
        await sock.sendMessage(from, {
          text: [
            `❌ *SESSION FAILED*`,
            `━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `${result.message || 'Could not create session. Please retry.'}`,
            ``,
            `💡 Contact the bot owner if the issue persists.`,
            `━━━━━━━━━━━━━━━━━━━━━`,
          ].join('\n'),
        }, { quoted: waitSent });
      }

    } catch (err) {
      logger.error(`[Pair] Error for ${phoneNumber}:`, err);
      await sock.sendMessage(from, {
        text: [
          `❌ *CRITICAL ERROR*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `${err.message || 'Check server logs.'}`,
          ``,
          `💡 Contact the bot owner for support.`,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n'),
      }, { quoted: waitSent });
    }
  },
};

/**
 * antimention.js — Prevent members from mentioning this group in their status.
 * When someone forwards a status that says "@ This group was mentioned",
 * the bot will kick or warn them automatically.
 *
 * Usage:
 *   .antimention on          → Enable, default action is warn
 *   .antimention off         → Disable
 *   .antimention kick        → Enable + set action to kick
 *   .antimention warn        → Enable + set action to warn
 *   .antimention status      → Show current setting
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  name: 'antimention',
  description: 'Kick or warn members who mention this group in their status.',
  category: 'group management',
  subCategory: 'protection',
  roleRequired: 'admin',
  groupOnly: true,

  async execute({ sock, msg, args, phoneNumber }) {
    const jid = msg.key.remoteJid;
    const settings = getChatSettings(phoneNumber, jid);
    const current  = settings.antimention || { enabled: false, action: 'warn' };
    const sub      = args[0]?.toLowerCase();

    // ── Status ─────────────────────────────────────────────────────────────
    if (!sub || sub === 'status') {
      return sock.sendMessage(jid, {
        text:
          `🛡️ *ANTI-MENTION*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Status: ${current.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
          `Action: *${current.action || 'warn'}*\n\n` +
          `*Commands:*\n` +
          `  .antimention on     → enable (warn)\n` +
          `  .antimention kick   → enable + kick offenders\n` +
          `  .antimention warn   → enable + warn offenders\n` +
          `  .antimention off    → disable`,
      }, { quoted: msg });
    }

    // ── Off ────────────────────────────────────────────────────────────────
    if (sub === 'off') {
      updateChatSettings(phoneNumber, jid, { antimention: { enabled: false, action: current.action || 'warn' } });
      return sock.sendMessage(jid, {
        text: `❌ *Anti-Mention Disabled*\n\nMembers can now mention this group in their status.`,
      }, { quoted: msg });
    }

    // ── On / kick / warn ───────────────────────────────────────────────────
    const action = (sub === 'kick' || sub === 'warn') ? sub : (sub === 'on' ? (current.action || 'warn') : null);

    if (!action) {
      return sock.sendMessage(jid, {
        text: `❌ Unknown option: *${sub}*\nUse: on, off, kick, warn`,
      }, { quoted: msg });
    }

    updateChatSettings(phoneNumber, jid, { antimention: { enabled: true, action } });

    return sock.sendMessage(jid, {
      text:
        `✅ *Anti-Mention Enabled*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Action: *${action}*\n\n` +
        `Anyone who mentions this group in their status will be *${action === 'kick' ? 'kicked' : 'warned'}*.`,
    }, { quoted: msg });
  },
};

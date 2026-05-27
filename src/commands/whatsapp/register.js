/**
 * register.js — DISABLED.
 * Registration is no longer required. Only the paired bot owner can use
 * XP/levelup features. This command is kept as a stub to avoid import errors.
 */

export default {
  name: 'register',
  aliases: ['reg'],
  category: 'general',
  description: 'Disabled — registration is no longer required',
  usage: 'register',
  cooldown: 0,
  permissions: ['user'],
  args: false,

  async execute({ sock, msg }) {
    const from = msg.key.remoteJid;
    await sock.sendMessage(from, {
      text: `ℹ️ Registration is no longer required.\n\nOnly the paired bot owner can use the XP system.`
    }, { quoted: msg });
  }
};

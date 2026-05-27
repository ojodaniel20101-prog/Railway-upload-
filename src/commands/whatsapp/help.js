/**
 * .help command — Shows quick help and redirects to .menu
 */

export default {
  name: 'help',
  description: 'Shows help information.',
  async execute({ sock, msg }) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `
╔════════════════════════════════════════╗
║        ⚡  ᴢᴇɴᴛʀɪx ᴛᴇᴄʜ  v3.3  ⚡        ║
║           QUICK START GUIDE            ║
╚════════════════════════════════════════╝

🚀 *CORE COMMANDS*
➤ .menu  : Open Enterprise Dashboard
➤ .ping  : Check System Latency
➤ .stats : View Global Statistics

🛡️ *GROUP CONTROLS*
➤ .kick  : Remove participants
➤ .warn  : Warning system
➤ .mode  : Set bot mode (Owner only)

🎮 *UTILITIES*
➤ .tiktok    : Download TikTok video
➤ .instagram : Download IG media
➤ .vv        : Bypass view-once

💡 *TIP:* Use *.menu* for the full command registry with live protection status.

⚡ Powered by ZENTRIX MD BY ZENTRIX TECH ⚡

> _Type .getbot to get your own bot_ 🤖
      `.trim()
    });
  }
};

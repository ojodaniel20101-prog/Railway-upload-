export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const uptimeStr = `🕒 *Bot Uptime:* ${hours}h ${minutes}m ${seconds}s`;
    await sock.sendMessage(jid, { text: uptimeStr });
  }
};
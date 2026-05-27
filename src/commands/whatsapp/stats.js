import { sessionManager } from '../../core/sessionManager.js';

export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const sessions = sessionManager.getAllSessions();
    const activeSessions = sessions.filter(s => {
        const wsState = s.sock.ws?.readyState;
        return wsState === 0 || wsState === 1;
    }).length;

    let stats = `📊 *ZENTRIX MD BY ZENTRIX TECH SYSTEM STATS*\n\n`;
    stats += `🌐 Total Sessions: ${sessions.length}\n`;
    stats += `✅ Active Sessions: ${activeSessions}\n`;
    stats += `🖥️ Platform: ${process.platform}\n`;
    stats += `📦 Node Version: ${process.version}\n`;
    stats += `💾 Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;

    await sock.sendMessage(jid, { text: stats + '\n\n> _Type .getbot to get your own bot_ 🤖' });
  }
};
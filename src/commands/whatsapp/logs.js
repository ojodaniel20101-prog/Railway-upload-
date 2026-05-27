import fs from 'fs';
import path from 'path';

export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const logPath = path.join(process.cwd(), 'logs', 'app.log'); // Assuming this is the log file

    if (!fs.existsSync(logPath)) {
      throw new Error('⚠️ Log file not found.');
    }

    const logs = fs.readFileSync(logPath, 'utf-8').split('\n').slice(-20).join('\n');
    await sock.sendMessage(jid, { text: `📋 *Recent Logs:*\n\n${logs}` });
  }
};
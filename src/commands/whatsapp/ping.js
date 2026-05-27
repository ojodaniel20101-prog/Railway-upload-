/**
 * .ping command — Checks bot response time and uptime.
 */
import os from 'os';
// import { version as pkgVersion } from '../../package.json'; // optional if you want bot version

export default {
  name: 'ping',
  description: 'Checks bot response time and uptime.',
  async execute({ sock, msg, sessionManager }) {
    const start = Date.now();

    // Send a temporary "typing..." placeholder for more accurate latency measurement
    await sock.sendPresenceUpdate('composing', msg.key.remoteJid);

    // Measure latency after a small delay to ensure presence update is processed
    await new Promise(res => setTimeout(res, 100));

    const latency = Date.now() - start;

    // Bot uptime
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptime = `${hours}h ${minutes}m ${seconds}s`;

    const botInfo = sessionManager?.botName || 'ZENTRIX_MD';

    // Build ping message
    const pingMessage = 
`🏓 *Pong!*
⚡ Bot: ${botInfo}
⏱ Latency: ${latency}ms
⏲ Uptime: ${uptime}
📦 Version: v1.0.0 (dynamic import fix)
✅ Bot is online and responsive!

> _Type .getbot to get your own bot_ 🤖`;

    // Send the ping message
    await sock.sendMessage(msg.key.remoteJid, { text: pingMessage });

    // Reset presence
    await sock.sendPresenceUpdate('available', msg.key.remoteJid);
  }
};
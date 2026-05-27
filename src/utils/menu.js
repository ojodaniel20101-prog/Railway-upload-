/**
 * menu.js — Enterprise-grade dashboard and UI elements for the ZENTRIX MD BY ZENTRIX TECH platform.
 * Optimized for Telegram caption limits and fixed for undefined properties.
 */

import os from 'os';

/**
 * Generates the professional enterprise dashboard for the /start and /menu commands.
 * @param {number} userId - The user's Telegram ID.
 * @param {string} firstName - The user's first name.
 * @param {string} role - The user's role (owner/user).
 * @returns {string} The formatted dashboard string.
 */
export function getEnterpriseDashboard(userId, firstName = 'User', role = 'user') {
  const roleDisplay = (role || 'user').toUpperCase();
  const firstNameDisplay = (firstName || 'User').toUpperCase();

  return `
╔══════════════════════════════╗
⚡  Z E N T R I X  T E C H  ⚡
🧠  ENTERPRISE CONTROL CORE
╚══════════════════════════════╝

👋 WELCOME, ${firstNameDisplay}!
🚀 MULTI-SESSION WHATSAPP SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ROLE: ${roleDisplay}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛰️  『 SESSION MANAGEMENT 』
╭──────────────────────────────╮
│ ⚙️ /connect <number>          │
│ 📡 /sessions                  │
│ 🔌 /disconnect <number>       │
╰──────────────────────────────╯
📊  『 DIAGNOSTICS 』
╭──────────────────────────────╮
│ 📊 /stats  │ ⏱ /uptime       │
│ 🧾 /logs   │ 🆔 /getid       │
╰──────────────────────────────╯
👑  『 OWNER CONTROLS 』
╭──────────────────────────────╮
│ 📢 /broadcast │ 🧬 /system   │
╰──────────────────────────────╯
📘  『 HELP & SUPPORT 』
╭──────────────────────────────╮
│ ❓ /help   │ ℹ️ /about        │
╰──────────────────────────────╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 ONLINE │ 🔐 SECURE │ 🧬 v3.1
🆔 YOUR ID: ${userId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Powered by ZENTRIX MD BY ZENTRIX TECH ⚡
  `.trim();
}

/**
 * Formats the process uptime into a human-readable string.
 * @returns {string}
 */
export function getFormattedUptime() {
  const seconds = Math.floor(process.uptime());
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Returns a system diagnostics breakdown for the /system command.
 * @returns {string}
 */
export function getSystemDiagnostics() {
  const memory = process.memoryUsage();
  const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

  return `
🧬  『 DEEP SYSTEM DIAGNOSTICS 』
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  Node Version : ${process.version}
💻  Platform     : ${process.platform}
🧠  Memory RSS   : ${formatMB(memory.rss)}
📊  Heap Total   : ${formatMB(memory.heapTotal)}
📈  Heap Used    : ${formatMB(memory.heapUsed)}
📂  External     : ${formatMB(memory.external)}
🔥  CPU Load (1m): ${os.loadavg()[0].toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

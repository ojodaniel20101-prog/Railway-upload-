/**
 * logger.js — Advanced Professional Console Logging System for ZENTRIX MD BY ZENTRIX TECH Enterprise.
 * Features: Global Noise Filtering, Silent Mode, ZENTRIX MD styled message display.
 */

import chalk from 'chalk';

// --- GLOBAL NOISE FILTER ---
const originalLog   = console.log;
const originalWarn  = console.warn;
const originalError = console.error;

const NOISE_KEYWORDS = [
  'Closing open session in favor of incoming prekey bundle',
  'Closing session: SessionEntry',
  'chainKey', 'registrationId', 'currentRatchet', 'ephemeralKeyPair',
  'lastRemoteEphemeralKey', 'previousCounter', 'rootKey',
  'tried remove, but no previous op', 'failed to sync state'
];

const shouldSilence = (args) => {
  const str = args.map(arg => String(arg)).join(' ');
  return NOISE_KEYWORDS.some(kw => str.includes(kw));
};

console.log   = (...args) => { if (!shouldSilence(args)) originalLog(...args); };
console.warn  = (...args) => { if (!shouldSilence(args)) originalWarn(...args); };
console.error = (...args) => { if (!shouldSilence(args)) originalError(...args); };

class AdvancedLogger {
  constructor() {
    this.levels = {
      INFO:     chalk.blue('INFO'),
      SUCCESS:  chalk.green('SUCCESS'),
      WARN:     chalk.yellow('WARN'),
      ERROR:    chalk.red('ERROR'),
      SYSTEM:   chalk.magenta('SYSTEM'),
      WHATSAPP: chalk.cyan('WHATSAPP'),
      TELEGRAM: chalk.hex('#0088cc')('TELEGRAM'),
    };

    // Silent until cli.js calls unmute() after connection confirmed
    this._silent = true;

    // Reaction debouncer
    this.reactionCache   = new Map();
    this.REACTION_COOLDOWN = 2000;
  }

  unmute() {
    this._silent = false;
  }

  _formatTimestamp() {
    return chalk.gray(`[${new Date().toISOString().replace('T', ' ').substring(0, 19)}]`);
  }

  info(message, context = '') {
    if (this._silent) return;
    originalLog(`${this._formatTimestamp()} ${this.levels.INFO} ${context ? `[${context}] ` : ''}${message}`);
  }

  success(message, context = '') {
    if (this._silent) return;
    originalLog(`${this._formatTimestamp()} ${this.levels.SUCCESS} ${context ? `[${context}] ` : ''}${message}`);
  }

  warn(message, context = '') {
    if (this._silent) return;
    originalLog(`${this._formatTimestamp()} ${this.levels.WARN} ${context ? `[${context}] ` : ''}${message}`);
  }

  error(message, error = null, context = '') {
    if (this._silent) return;
    const errorMsg = error?.message || error || '';
    originalError(`${this._formatTimestamp()} ${this.levels.ERROR} ${context ? `[${context}] ` : ''}${message} ${errorMsg ? `| ${errorMsg}` : ''}`);
  }

  whatsapp(message, type = 'EVENT') {
    if (this._silent) return;
    originalLog(`${this._formatTimestamp()} ${this.levels.WHATSAPP} [${type}] ${message}`);
  }

  telegram(message, type = 'EVENT') {
    if (this._silent) return;
    originalLog(`${this._formatTimestamp()} ${this.levels.TELEGRAM} [${type}] ${message}`);
  }

  message(options) {
    if (this._silent) return;

    const { direction, platform, user, content, context, groupName, type } = options;

    // Reaction debouncing
    if (type === 'reaction') {
      const cacheKey = `${user}_${groupName || 'dm'}_reaction`;
      const now = Date.now();
      if (this.reactionCache.has(cacheKey) &&
          (now - this.reactionCache.get(cacheKey) < this.REACTION_COOLDOWN)) return;
      this.reactionCache.set(cacheKey, now);
    }

    // Message type label
    const typeLabels = {
      text:     'conversation',
      image:    'imageMessage',
      video:    'videoMessage',
      audio:    'audioMessage',
      document: 'documentMessage',
      sticker:  'stickerMessage',
      location: 'locationMessage',
      contact:  'contactMessage',
      reaction: 'reactionMessage',
      forwarded:'extendedTextMessage',
      poll:     'pollCreationMessage',
    };
    const msgType = typeLabels[type] || type || 'conversation';

    // Parse "Name (number)" format
    const nameMatch  = user.match(/^(.+?)\s*\((\d+)\)$/);
    const senderName = nameMatch ? nameMatch[1].trim() : user;
    const senderNum  = nameMatch ? nameMatch[2] : user;

    // Timestamp with timezone
    const now      = new Date();
    const days     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName  = days[now.getDay()];
    const timeStr  = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const tzOff    = -now.getTimezoneOffset() / 60;
    const tzStr    = `GMT${tzOff >= 0 ? '+' : ''}${tzOff}`;
    const msgTime  = `${dayName}, ${timeStr} ${tzStr}`;

    // Chat ID
    const chatId   = context === 'GROUP' ? groupName : senderNum;

    // Clean message content
    const cleanMsg = String(content).replace(/\n/g, ' ').substring(0, 120);

    // ── Layout ────────────────────────────────────────────────────────────────
    const BRAND  = '『 ZENTRIX MD 』';
    const pad    = '─'.repeat(18);
    const top    = chalk.cyan(pad) + chalk.bold.white(BRAND) + chalk.magenta(pad) + chalk.yellow(' ─');
    const bottom = chalk.cyan('─'.repeat(50)) + chalk.yellow(' \\\\');

    const row = (label, value) =>
      chalk.magenta('» ') +
      chalk.cyan(label.padEnd(14)) +
      chalk.white(': ') +
      chalk.white(value);

    const speedVal = chalk.yellow('0.00s') + ' ' + chalk.green('[ FAST ]');

    originalLog('');
    originalLog(top);
    originalLog(row('Message Type', msgType));
    originalLog(row('Message Time', msgTime));
    originalLog(row('Speed',        speedVal));
    originalLog(row('Sender',       senderNum));
    originalLog(row('Name',         senderName));
    originalLog(row('Chat ID',      chatId));
    originalLog(row('Message',      cleanMsg));
    originalLog(bottom);
    originalLog('');
  }

  debug(message, context = '') {
    if (this._silent) return;
    originalLog(`${this._formatTimestamp()} ${chalk.gray('DEBUG')} ${context ? `[${context}] ` : ''}${message}`);
  }

  system(message) {
    if (this._silent) return;
    originalLog(`${this._formatTimestamp()} ${this.levels.SYSTEM} ${message}`);
  }
}

const logger = new AdvancedLogger();
export default logger;

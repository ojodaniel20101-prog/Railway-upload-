/**
 * advancedCommands.js — 47 Advanced Offline Commands for ZENTRIX MD BY ZENTRIX TECH v3.7
 * ──────────────────────────────────────────────────────────────────────────
 * ZERO external API calls. All logic runs locally.
 *
 * 🔒 JS OBFUSCATION (3)   — javaenc1, javaenc2, javaenc3
 *                           Supports single .js file OR a .zip of a whole project.
 *                           The bot walks every folder, finds every .js file, obfuscates
 *                           all of them, and returns the result as a downloadable file.
 *
 * 📝 TEXT ADVANCED   (8)  — leetspeak, zalgo, smallcaps, strikethrough, natoalphabet,
 *                           braille, wordwrap, countchar
 * 🔢 MATH ADVANCED   (7)  — gcd, lcm, statistics, quadratic, hexcalc, baseconv, mathmatch
 * 🎨 CREATIVE        (8)  — haiku, acrostic, limerick, fortunecookie, absurdstory,
 *                           complimentbomb, battlecry, namepoem
 * 🛠️ DEV TOOLS      (7)  — jsonformat, jsminify, regextest, colorconvert,
 *                           jsontable, hexdump, unicodeinfo
 * 🎮 EXTRA GAMES     (7)  — hangmanstart, tictactoe, countdown, mathquiz,
 *                           wordassoc, memtest, speedmath
 * 📊 ANALYTICS       (7)  — textanalyze, hashbenchmark, sorttest, duplicates,
 *                           wordfreq, anagram, longestword
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { writeFile, unlink, mkdir, rm } from 'fs/promises';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import logger from '../../utils/logger.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

// ── Shared ────────────────────────────────────────────────────────────────────
const DIV  = '━━━━━━━━━━━━━━━━━━━━━━';
const TEMP = path.join(process.cwd(), 'tmp/media');
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

const reply  = (sock, msg, text) => sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
const react  = async (sock, msg, e) => { try { await sock.sendMessage(msg.key.remoteJid, { react: { text: e, key: msg.key } }); } catch (_) {} };
const rand   = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒  JS OBFUSCATION ENGINE  (shared by javaenc1/2/3)
// ═══════════════════════════════════════════════════════════════════════════════

const JS_KW = new Set([
  'break','case','catch','class','const','continue','debugger','default','delete','do','else',
  'export','extends','finally','for','function','if','import','in','instanceof','let','new',
  'null','of','return','static','super','switch','this','throw','true','false','try','typeof',
  'undefined','var','void','while','with','yield','async','await','get','set','from','console',
  'process','require','module','exports','__dirname','__filename','arguments','prototype',
  'constructor','length','toString','indexOf','Buffer','push','pop','shift','map','filter',
  'forEach','reduce','Object','Array','String','Number','Boolean','Function','Promise','Error',
  'Math','JSON','Date','parseInt','parseFloat','setInterval','setTimeout','clearInterval',
  'clearTimeout','global','window','RegExp','Symbol','BigInt','isNaN','isFinite',
  'encodeURIComponent','decodeURIComponent','eval','then','catch','finally','resolve','reject',
]);

const MARK   = '\x00Z\x00';
const mkId   = (i, seed) => '_0x' + (((Math.imul(i | 0, 0x9E3779B9) + seed) >>> 0)).toString(16).padStart(8, '0');
const MR_RE  = MARK.replace(/\x00/g, '\\x00');

/** Character-by-character string literal scanner — handles comments, templates */
function scanStrings(code) {
  const strings = []; let out = ''; let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i), end = nl === -1 ? code.length : nl;
      out += code.slice(i, end); i = end; continue;
    }
    if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      if (end === -1) { out += code.slice(i); break; }
      i = end + 2; continue;
    }
    if (ch === '`') {                          // template literal — pass through
      out += ch; i++;
      while (i < code.length && code[i] !== '`') {
        if (code[i] === '\\') { out += code[i] + code[i + 1]; i += 2; } else { out += code[i]; i++; }
      }
      if (i < code.length) { out += code[i]; i++; }
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch; let s = ''; i++;
      while (i < code.length && code[i] !== q) {
        if (code[i] === '\\') { s += code[i] + code[i + 1]; i += 2; } else { s += code[i]; i++; }
      }
      if (i < code.length) i++;
      if (s.length >= 2) { strings.push(s); out += MARK + (strings.length - 1) + MARK; }
      else { out += q + s + q; }
      continue;
    }
    out += ch; i++;
  }
  return { stripped: out, strings };
}

/** Rename user-defined identifiers (var/let/const/function) to hex IDs */
function renameIds(code, origCode, seed) {
  const found = new Set();
  const re1 = /\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  const re2 = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]+)/g;
  let m;
  while ((m = re1.exec(origCode)) !== null) if (!JS_KW.has(m[2])) found.add(m[2]);
  while ((m = re2.exec(origCode)) !== null) if (!JS_KW.has(m[1])) found.add(m[1]);
  const idMap = {};
  [...found].forEach((id, i) => { idMap[id] = mkId(i + 0x1000, seed); });
  let out = code;
  for (const [orig, obf] of Object.entries(idMap)) {
    out = out.replace(new RegExp('\\b' + orig.replace(/[$]/g, '\\$') + '\\b', 'g'), obf);
  }
  return out;
}

// ── Level 1: Light — Base64 string array + identifier renaming + number XOR ──
function obfuscateL1(code, filename) {
  const seed  = crypto.createHash('md5').update(filename + 'ZX1').digest().readUInt32LE(0);
  const arrN  = mkId(0x201, seed), decF = mkId(0x202, seed);
  const { stripped, strings } = scanStrings(code);
  const b64s  = strings.map(s => Buffer.from(s).toString('base64'));
  let out     = stripped.replace(new RegExp(MR_RE + '(\\d+)' + MR_RE, 'g'), (_, i) => `${decF}(${i})`);
  out         = renameIds(out, code, seed);
  out         = out.replace(/\b(\d{2,})\b/g, n => {
    const v = parseInt(n); if (v < 10 || v > 0x7FFF) return n;
    const mask = (seed & 0x7F) | 1;
    return '(0x' + (v ^ mask).toString(16) + '^0x' + mask.toString(16) + ')';
  });
  out = out.replace(/\s+/g, ' ').trim();
  return `var ${arrN}=[${b64s.map(s => JSON.stringify(s)).join(',')}];` +
    `function ${decF}(i){return Buffer.from(${arrN}[i],'base64').toString();}` + out;
}

// ── Level 2: Medium — XOR-byte string encoding + key array + IIFE wrapper ────
function obfuscateL2(code, filename) {
  const seed  = crypto.createHash('sha256').update(filename + 'ZX2').digest().readUInt32LE(0);
  const kb    = [...crypto.createHash('md5').update(filename + seed).digest()].slice(0, 8);
  const arrN  = mkId(0x201, seed), decF = mkId(0x202, seed), keyN = mkId(0x203, seed);
  const xorE  = s => [...s].map((c, i) => c.charCodeAt(0) ^ kb[i % 8]);
  const { stripped, strings } = scanStrings(code);
  const encs  = strings.map(xorE);
  let out     = stripped.replace(new RegExp(MR_RE + '(\\d+)' + MR_RE, 'g'), (_, i) => `${decF}(${i})`);
  out         = renameIds(out, code, seed);
  out         = out.replace(/\b(\d{2,})\b/g, n => {
    const v = parseInt(n); if (v < 10 || v > 0x7FFF) return n;
    const a = kb[v % 8];
    return '(0x' + (v ^ a).toString(16) + '^0x' + a.toString(16) + ')';
  });
  out = out.replace(/\s+/g, ' ').trim();
  const kl = kb.map(b => '0x' + b.toString(16)).join(',');
  return `(function(){var ${keyN}=[${kl}];` +
    `var ${arrN}=[${encs.map(a => '[' + a.join(',') + ']').join(',')}];` +
    `function ${decF}(i){return ${arrN}[i].map(function(c,j){return String.fromCharCode(c^${keyN}[j%8]);}).join('');}` +
    out + '\n}());';
}

// ── Level 3: Advanced — 16-byte key, shift+XOR double-layer, deep renaming ───
function obfuscateL3(code, filename) {
  const seed  = crypto.createHash('sha512').update(filename + 'ZX3_ZENTRIX MD BY ZENTRIX TECH').digest().readUInt32LE(0);
  const kb    = [...crypto.createHash('sha256').update(filename + seed + 'k3').digest()].slice(0, 16);
  const shift = ((kb[0] % 32) + 8); // always 8-39
  const arrN  = mkId(0x201, seed), decF  = mkId(0x202, seed), keyN  = mkId(0x203, seed);
  const shN   = mkId(0x204, seed), rotF  = mkId(0x205, seed);
  const enc   = s => [...s].map((c, i) => ((c.charCodeAt(0) ^ kb[i % 16]) + shift) & 0xFF);
  const { stripped, strings } = scanStrings(code);
  const encs  = strings.map(enc);
  let out     = stripped.replace(new RegExp(MR_RE + '(\\d+)' + MR_RE, 'g'), (_, i) => `${decF}(${i})`);
  out         = renameIds(out, code, seed);
  out         = out.replace(/\b(\d{2,})\b/g, n => {
    const v = parseInt(n); if (v < 10 || v > 0x1FFF) return n;
    const a = kb[v % 16], b = v ^ a;
    return '(0x' + b.toString(16) + '^0x' + a.toString(16) + ')';
  });
  out = out.replace(/\s+/g, ' ').trim();
  const kl = kb.map(b => '0x' + b.toString(16)).join(',');
  return `(function(){var ${keyN}=[${kl}];var ${shN}=0x${shift.toString(16)};` +
    `var ${arrN}=[${encs.map(a => '[' + a.join(',') + ']').join(',')}];` +
    `function ${rotF}(c,j){return((c-${shN}+256)&0xFF)^${keyN}[j%${keyN}.length];}` +
    `function ${decF}(i){return ${arrN}[i].map(function(c,j){return String.fromCharCode(${rotF}(c,j));}).join('');}` +
    out + '\n}());';
}

/** Walk a directory tree and collect all .js file paths */
function walkJs(dir) {
  const files = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
    }
  }
  walk(dir);
  return files;
}

/** Core handler for all three javaenc commands */
async function handleObfuscate(sock, msg, level, levelName) {
  const jid = msg.key.remoteJid;
  const fns = { 1: obfuscateL1, 2: obfuscateL2, 3: obfuscateL3 };
  const obfFn = fns[level];

  // Get the attached document
  const quoted   = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const docMsg   = msg.message?.documentMessage || quoted?.documentMessage;
  const imgMsg   = null;

  if (!docMsg) {
    await reply(sock, msg,
      `📎 *${levelName}*\n${DIV}\n\n` +
      `Please **send** or **reply to** a file:\n` +
      `• A single \`.js\` file\n` +
      `• A \`.zip\` containing a JS project\n\n` +
      `_The bot will find and obfuscate every .js file automatically._`
    );
    return;
  }

  await react(sock, msg, '🔒');
  await reply(sock, msg, `🔒 *${levelName}* — Processing... please wait.`);

  const workId  = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const workDir = path.join(TEMP, 'enc_' + workId);
  await mkdir(workDir, { recursive: true });

  try {
    // Download the file
    const stream  = await downloadContentFromMessage(docMsg, 'document');
    const chunks  = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer  = Buffer.concat(chunks);

    const origName   = docMsg.fileName || 'file.js';
    const isZip      = origName.endsWith('.zip');
    const isJs       = origName.endsWith('.js');

    if (!isZip && !isJs) {
      await reply(sock, msg, '❌ Only *.js* and *.zip* files are supported.');
      return;
    }

    let jsFiles = [], baseDir = workDir;

    if (isJs) {
      // Single JS file
      const inPath = path.join(workDir, origName);
      await writeFile(inPath, buffer);
      jsFiles = [inPath];
    } else {
      // ZIP — extract, walk, collect .js
      const inZip  = path.join(workDir, 'input.zip');
      const extDir = path.join(workDir, 'extracted');
      await writeFile(inZip, buffer);
      await mkdir(extDir, { recursive: true });
      execSync(`unzip -q "${inZip}" -d "${extDir}"`, { timeout: 30000 });
      jsFiles = walkJs(extDir);
      baseDir = extDir;
      if (jsFiles.length === 0) {
        await reply(sock, msg, '❌ No `.js` files found inside the ZIP.');
        return;
      }
    }

    // Obfuscate each JS file
    let processed = 0, errors = 0;
    const report  = [];

    for (const filePath of jsFiles) {
      const relPath  = path.relative(baseDir, filePath);
      const origSize = fs.statSync(filePath).size;
      try {
        const src  = fs.readFileSync(filePath, 'utf8');
        const obf  = obfFn(src, path.basename(filePath));
        fs.writeFileSync(filePath, obf, 'utf8');
        const newSize = fs.statSync(filePath).size;
        report.push(`✅ ${relPath} (${origSize}B → ${newSize}B)`);
        processed++;
      } catch (e) {
        report.push(`⚠️ ${relPath} — skipped: ${e.message.slice(0, 50)}`);
        errors++;
      }
    }

    // Package result
    let outBuffer, outName;
    if (isJs) {
      outBuffer = fs.readFileSync(jsFiles[0]);
      outName   = path.basename(origName, '.js') + `_${levelName.toLowerCase().replace(/\s/g,'')}.js`;
    } else {
      const outZip = path.join(workDir, 'output.zip');
      execSync(`cd "${baseDir}" && zip -r "${outZip}" . -x "*.orig" 2>/dev/null`, { timeout: 30000 });
      outBuffer = fs.readFileSync(outZip);
      outName   = path.basename(origName, '.zip') + `_${levelName.toLowerCase().replace(/\s/g,'')}.zip`;
    }

    // Send result file
    const summary =
      `🔒 *${levelName} Complete*\n${DIV}\n` +
      `📁 *Files processed:* ${processed}\n` +
      `⚠️ *Skipped:* ${errors}\n` +
      `📦 *Output:* ${outName}\n` +
      `${DIV}\n` +
      report.slice(0, 15).join('\n') +
      (report.length > 15 ? `\n...and ${report.length - 15} more` : '') +
      `\n${DIV}\n⚡ Powered by ZENTRIX_MD`;

    await sock.sendMessage(jid, {
      document: outBuffer,
      fileName: outName,
      mimetype: isJs ? 'application/javascript' : 'application/zip',
      caption:  summary,
    }, { quoted: msg });

    await react(sock, msg, '✅');

  } catch (err) {
    logger.error(`[${levelName}] Error:`, err.message);
    await reply(sock, msg, `❌ *${levelName} Error:* ${err.message}`);
    await react(sock, msg, '❌');
  } finally {
    rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The three obfuscation commands
// ─────────────────────────────────────────────────────────────────────────────

/**
 * .javaenc1 — Light JS obfuscation (Base64 strings + identifier rename + number XOR)
 * Supports: single .js file OR .zip archive of any JS project.
 */
export const javaenc1Command = {
  name: 'javaenc1',
  description: 'Light JS obfuscation: Base64 string array, identifier renaming, number XOR. Send or reply to a .js or .zip file.',
  usage: '.javaenc1  [send or reply to a .js / .zip file]',
  category: 'tools',
  execute: ({ sock, msg }) => handleObfuscate(sock, msg, 1, 'JavaEnc Level 1'),
};

/**
 * .javaenc2 — Medium JS obfuscation (XOR-byte string encoding + 8-byte key array + IIFE)
 * Supports: single .js file OR .zip archive of any JS project.
 */
export const javaenc2Command = {
  name: 'javaenc2',
  description: 'Medium JS obfuscation: XOR-byte string encoding, 8-byte key array, IIFE wrapper, deep identifier renaming. Send or reply to a .js / .zip file.',
  usage: '.javaenc2  [send or reply to a .js / .zip file]',
  category: 'tools',
  execute: ({ sock, msg }) => handleObfuscate(sock, msg, 2, 'JavaEnc Level 2'),
};

/**
 * .javaenc3 — Advanced JS obfuscation (16-byte SHA-256 key, double-layer shift+XOR,
 *             number expression chains, deep renaming — hardest to reverse.)
 * Supports: single .js file OR .zip archive of any JS project.
 */
export const javaenc3Command = {
  name: 'javaenc3',
  description: 'Advanced JS obfuscation: 16-byte SHA-256 key, double-layer XOR+shift encoding, number chains, deep renaming. Hardest to reverse. Send or reply to a .js / .zip.',
  usage: '.javaenc3  [send or reply to a .js / .zip file]',
  category: 'tools',
  execute: ({ sock, msg }) => handleObfuscate(sock, msg, 3, 'JavaEnc Level 3'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📝  TEXT ADVANCED  (8 commands)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * .leetspeak — Convert text to 1337 speak.
 */
export const leetspeakCommand = {
  name: 'leetspeak',
  description: 'Convert text to 1337 (leet) speak.',
  usage: '.leetspeak <text>  or reply to a message',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .leetspeak <text>  or reply to a message');
    const MAP = { a:'4',e:'3',i:'1',o:'0',t:'7',s:'5',g:'9',b:'8',l:'|',z:'2',
                  A:'4',E:'3',I:'1',O:'0',T:'7',S:'5',G:'9',B:'8',L:'|',Z:'2' };
    const leet = text.split('').map(c => MAP[c] || c).join('');
    await reply(sock, msg, `🔢 *Leet Speak*\n${DIV}\n📥 ${text}\n📤 ${leet}\n${DIV}`);
  },
};

/**
 * .smallcaps — Convert text to sᴍᴀʟʟ ᴄᴀᴘs Unicode.
 */
export const smallcapsCommand = {
  name: 'smallcaps',
  description: 'Convert text to sᴍᴀʟʟ ᴄᴀᴘs Unicode style.',
  usage: '.smallcaps <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .smallcaps <text>');
    const SC = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',
                 l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'Q',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',
                 w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
    const out = text.toLowerCase().split('').map(c => SC[c] || c).join('');
    await reply(sock, msg, `🔡 *Small Caps*\n${DIV}\n📥 ${text}\n📤 ${out}\n${DIV}`);
  },
};

/**
 * .strikethrough — Apply s̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶ Unicode combining chars.
 */
export const strikethroughCommand = {
  name: 'strikethrough',
  description: 'Apply Unicode s̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶ effect to text.',
  usage: '.strikethrough <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .strikethrough <text>');
    const out = text.split('').map(c => c === ' ' ? ' ' : c + '\u0336').join('');
    await reply(sock, msg, `✂️ *Strikethrough*\n${DIV}\n📥 ${text}\n📤 ${out}\n${DIV}`);
  },
};

/**
 * .natoalphabet — Convert letters to NATO phonetic alphabet.
 */
export const natoalphabetCommand = {
  name: 'natoalphabet',
  description: 'Convert text to NATO phonetic alphabet (Alpha, Bravo, Charlie…)',
  usage: '.natoalphabet <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .natoalphabet <text>\nExample: .natoalphabet SOS');
    const NATO = {
      A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',
      H:'Hotel',I:'India',J:'Juliet',K:'Kilo',L:'Lima',M:'Mike',N:'November',
      O:'Oscar',P:'Papa',Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',
      V:'Victor',W:'Whiskey',X:'X-ray',Y:'Yankee',Z:'Zulu',
      '0':'Zero','1':'One','2':'Two','3':'Three','4':'Four',
      '5':'Five','6':'Six','7':'Seven','8':'Eight','9':'Nine',
    };
    const words = text.toUpperCase().split('').map(c => NATO[c] || (c === ' ' ? '/' : c));
    const out   = words.join(' — ');
    await reply(sock, msg, `📡 *NATO Phonetic Alphabet*\n${DIV}\n📥 *Input:* ${text}\n\n📤 ${out}\n${DIV}`);
  },
};

/**
 * .braille — Convert text to Braille Unicode characters.
 */
export const brailleCommand = {
  name: 'braille',
  description: 'Convert text to Braille Unicode characters.',
  usage: '.braille <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ').toLowerCase();
    if (!text) throw new Error('Usage: .braille <text>\nExample: .braille hello');
    const BR = {
      a:'⠁',b:'⠃',c:'⠉',d:'⠙',e:'⠑',f:'⠋',g:'⠛',h:'⠓',i:'⠊',j:'⠚',
      k:'⠅',l:'⠇',m:'⠍',n:'⠝',o:'⠕',p:'⠏',q:'⠟',r:'⠗',s:'⠎',t:'⠞',
      u:'⠥',v:'⠧',w:'⠺',x:'⠭',y:'⠽',z:'⠵',' ':'⠀',
      '1':'⠂','2':'⠆','3':'⠒','4':'⠲','5':'⠢','6':'⠖','7':'⠶','8':'⠦','9':'⠔','0':'⠴',
    };
    const out = text.split('').map(c => BR[c] || c).join('');
    await reply(sock, msg, `👆 *Braille Converter*\n${DIV}\n📥 ${text}\n📤 ${out}\n${DIV}\n_Grade 1 Braille_`);
  },
};

/**
 * .wordwrap — Wrap text at a specified column width.
 */
export const wordwrapCommand = {
  name: 'wordwrap',
  description: 'Wrap text at a given column width (useful for formatting).',
  usage: '.wordwrap <width> <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const width = parseInt(args[0]);
    if (isNaN(width) || width < 10 || width > 200) throw new Error('Usage: .wordwrap <width 10-200> <text>\nExample: .wordwrap 30 This is a long sentence that needs wrapping');
    const text  = args.slice(1).join(' ');
    if (!text) throw new Error('Please provide text after the width.\nExample: .wordwrap 30 Hello world this is a long text');
    const words = text.split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      if (cur && (cur + ' ' + w).length > width) { lines.push(cur); cur = w; }
      else { cur = cur ? cur + ' ' + w : w; }
    }
    if (cur) lines.push(cur);
    await reply(sock, msg,
      `📐 *Word Wrap (${width} cols)*\n${DIV}\n` +
      lines.map((l, i) => `${String(i + 1).padStart(2)} │ ${l}`).join('\n') +
      `\n${DIV}\n📊 ${lines.length} lines, ${text.length} chars`
    );
  },
};

/**
 * .countchar — Count occurrences of a specific character in text.
 */
export const countcharCommand = {
  name: 'countchar',
  description: 'Count how many times a specific character appears in text.',
  usage: '.countchar <char> <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .countchar <char> <text>\nExample: .countchar e Hello everyone everywhere');
    const char = args[0];
    const text = args.slice(1).join(' ');
    const cs   = (text.match(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const ci   = (text.toLowerCase().match(new RegExp(char.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const pct  = ((cs / text.length) * 100).toFixed(1);
    await reply(sock, msg,
      `🔍 *Character Counter*\n${DIV}\n` +
      `🔎 *Target:* "${char}"\n` +
      `📝 *Text:* "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"\n\n` +
      `📊 *Exact matches:* ${cs}\n` +
      `📊 *Case-insensitive:* ${ci}\n` +
      `📈 *Frequency:* ${pct}% of text\n${DIV}`
    );
  },
};

/**
 * .zalgo — Apply Z̷a̴l̵g̸o̶ creepy glitch text effect.
 */
export const zalgoCommand = {
  name: 'zalgo',
  description: 'Apply Z̶a̸l̵g̷o̴ creepy glitch Unicode effect to text.',
  usage: '.zalgo <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .zalgo <text>\nExample: .zalgo hello darkness');
    const UP = ['\u030d','\u030e','\u0304','\u0305','\u033f','\u0311','\u0306','\u0310','\u0352','\u0357','\u0351','\u0307','\u0308','\u030a','\u0342','\u0343'];
    const MID= ['\u0315','\u031b','\u0340','\u0341','\u0358','\u0321','\u0322','\u0327','\u0328','\u0334','\u0335','\u0336','\u034f','\u035c','\u035d','\u035e'];
    const DN = ['\u0316','\u0317','\u0318','\u0319','\u031c','\u031d','\u031e','\u031f','\u0320','\u0324','\u0325','\u0326','\u0329','\u032a','\u032b','\u032c'];
    const rn = (a, n) => Array.from({ length: n }, () => rand(a)).join('');
    const out = text.split('').map(c => {
      if (c === ' ') return ' ';
      return c + rn(UP, 2) + rn(MID, 1) + rn(DN, 2);
    }).join('');
    await reply(sock, msg, `👻 *Zalgo Text*\n${DIV}\n📥 ${text}\n📤 ${out}\n${DIV}`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔢  MATH ADVANCED  (7 commands)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * .gcd — Find the Greatest Common Divisor of two or more numbers.
 */
export const gcdCommand = {
  name: 'gcd',
  description: 'Find the Greatest Common Divisor (GCD) of two or more numbers.',
  usage: '.gcd <num1> <num2> [num3...]',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .gcd <num1> <num2> [num3...]\nExample: .gcd 48 18 36');
    const nums = args.map(Number);
    if (nums.some(isNaN) || nums.some(n => n <= 0)) throw new Error('All numbers must be positive integers.');
    const gcd2 = (a, b) => b === 0 ? a : gcd2(b, a % b);
    const gcd  = nums.reduce(gcd2);
    const lcm2 = (a, b) => (a / gcd2(a, b)) * b;
    const lcm  = nums.reduce(lcm2);
    await reply(sock, msg,
      `🔢 *GCD / LCM Calculator*\n${DIV}\n` +
      `📊 *Numbers:* ${nums.join(', ')}\n\n` +
      `✅ *GCD:* ${gcd}\n` +
      `🔁 *LCM:* ${lcm}\n` +
      `📐 *GCD meaning:* ${gcd} is the largest number that divides all of them.\n${DIV}`
    );
  },
};

/**
 * .statistics — Full statistical analysis of a dataset.
 */
export const statisticsCommand = {
  name: 'statistics',
  description: 'Full stats: mean, median, mode, range, variance, std deviation.',
  usage: '.statistics <num1> <num2> <num3>...',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .statistics <numbers...>\nExample: .statistics 4 8 6 5 3 7 2 9');
    const nums = args.map(Number).filter(n => !isNaN(n));
    if (nums.length < 2) throw new Error('Provide at least 2 valid numbers.');
    const sorted = [...nums].sort((a, b) => a - b);
    const n      = nums.length;
    const mean   = nums.reduce((a, b) => a + b, 0) / n;
    const mid    = Math.floor(n / 2);
    const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const freq   = {}; nums.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
    const maxF   = Math.max(...Object.values(freq));
    const mode   = Object.entries(freq).filter(([, v]) => v === maxF).map(([k]) => +k);
    const vari   = nums.reduce((a, x) => a + (x - mean) ** 2, 0) / n;
    const std    = Math.sqrt(vari);
    const range  = sorted[n - 1] - sorted[0];
    const q1     = sorted[Math.floor(n / 4)];
    const q3     = sorted[Math.floor(3 * n / 4)];
    const iqr    = q3 - q1;
    await reply(sock, msg,
      `📊 *Statistics*\n${DIV}\n` +
      `📋 *Dataset:* ${nums.join(', ')}\n` +
      `📊 *Count:* ${n}\n${DIV}\n` +
      `📈 *Mean:* ${mean.toFixed(4)}\n` +
      `📏 *Median:* ${median}\n` +
      `🔁 *Mode:* ${mode.join(', ')} (freq: ${maxF})\n` +
      `↔️ *Range:* ${range}\n` +
      `📐 *Variance:* ${vari.toFixed(4)}\n` +
      `〽️ *Std Deviation:* ${std.toFixed(4)}\n` +
      `🔼 *Max:* ${sorted[n - 1]}  🔽 *Min:* ${sorted[0]}\n` +
      `📦 *Q1:* ${q1}  *Q3:* ${q3}  *IQR:* ${iqr}\n${DIV}`
    );
  },
};

/**
 * .quadratic — Solve a quadratic equation ax² + bx + c = 0.
 */
export const quadraticCommand = {
  name: 'quadratic',
  description: 'Solve quadratic equations ax² + bx + c = 0 using the quadratic formula.',
  usage: '.quadratic <a> <b> <c>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 3) throw new Error('Usage: .quadratic <a> <b> <c>\nExample: .quadratic 1 -5 6  → x²-5x+6=0');
    const [a, b, c] = args.map(Number);
    if ([a, b, c].some(isNaN)) throw new Error('All three values must be numbers.');
    if (a === 0) throw new Error('Coefficient a cannot be 0 (would not be quadratic).');
    const disc = b ** 2 - 4 * a * c;
    const eq   = `${a}x² ${b >= 0 ? '+' : ''}${b}x ${c >= 0 ? '+' : ''}${c} = 0`;
    let result;
    if (disc > 0) {
      const x1 = (-b + Math.sqrt(disc)) / (2 * a);
      const x2 = (-b - Math.sqrt(disc)) / (2 * a);
      result = `✅ *Two real roots:*\n   x₁ = ${x1.toFixed(6)}\n   x₂ = ${x2.toFixed(6)}`;
    } else if (disc === 0) {
      const x = -b / (2 * a);
      result = `✅ *One repeated root:*\n   x = ${x.toFixed(6)}`;
    } else {
      const re = (-b / (2 * a)).toFixed(4);
      const im = (Math.sqrt(-disc) / (2 * a)).toFixed(4);
      result = `🔵 *Complex roots (no real solution):*\n   x₁ = ${re} + ${im}i\n   x₂ = ${re} − ${im}i`;
    }
    await reply(sock, msg,
      `📐 *Quadratic Solver*\n${DIV}\n` +
      `📝 *Equation:* ${eq}\n` +
      `🔍 *Discriminant:* ${disc}\n\n` +
      result + `\n${DIV}`
    );
  },
};

/**
 * .hexcalc — Hexadecimal calculator and converter.
 */
export const hexcalcCommand = {
  name: 'hexcalc',
  description: 'Convert between hex/decimal/binary/octal and do hex arithmetic.',
  usage: '.hexcalc <value>  or  .hexcalc <hex1> + <hex2>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ').trim();
    if (!input) throw new Error('Usage: .hexcalc <value>\nExamples:\n.hexcalc 255\n.hexcalc FF\n.hexcalc 0xFF + 0x10');
    // Detect arithmetic
    const arithMatch = input.match(/^(0x[0-9a-fA-F]+|[0-9a-fA-F]+)\s*([+\-*])\s*(0x[0-9a-fA-F]+|[0-9]+)$/i);
    if (arithMatch) {
      const a = parseInt(arithMatch[1], arithMatch[1].toLowerCase().startsWith('0x') ? 16 : 16);
      const b = parseInt(arithMatch[3], arithMatch[3].toLowerCase().startsWith('0x') ? 16 : 10);
      const op = arithMatch[2];
      const r  = op === '+' ? a + b : op === '-' ? a - b : a * b;
      await reply(sock, msg,
        `🔢 *Hex Calculator*\n${DIV}\n` +
        `🧮 ${input} = ${r}\n\n` +
        `🔵 *Hex:* 0x${r.toString(16).toUpperCase()}\n` +
        `🟢 *Decimal:* ${r}\n` +
        `🟡 *Octal:* 0o${r.toString(8)}\n` +
        `🔴 *Binary:* ${r.toString(2)}\n${DIV}`
      );
    } else {
      const n = input.toLowerCase().startsWith('0x') ? parseInt(input, 16) : /^[0-9a-fA-F]+$/i.test(input) ? parseInt(input, 16) : parseInt(input, 10);
      if (isNaN(n)) throw new Error(`Cannot parse "${input}". Use a decimal number, a hex value like FF or 0xFF.`);
      await reply(sock, msg,
        `🔢 *Number Converter*\n${DIV}\n` +
        `📥 *Input:* ${input}\n\n` +
        `🔵 *Hex:* 0x${n.toString(16).toUpperCase()}\n` +
        `🟢 *Decimal:* ${n}\n` +
        `🟡 *Octal:* 0o${n.toString(8)}\n` +
        `🔴 *Binary:* ${n.toString(2)}\n` +
        `📏 *Bits needed:* ${n.toString(2).length}\n${DIV}`
      );
    }
  },
};

/**
 * .baseconv — Convert a number between any two bases (2-36).
 */
export const baseconvCommand = {
  name: 'baseconv',
  description: 'Convert a number from any base (2-36) to any other base.',
  usage: '.baseconv <number> <from base> <to base>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 3) throw new Error('Usage: .baseconv <number> <from> <to>\nExample: .baseconv 1010 2 10  (binary to decimal)');
    const [numStr, fromStr, toStr] = args;
    const from = parseInt(fromStr), to = parseInt(toStr);
    if ([from, to].some(b => isNaN(b) || b < 2 || b > 36)) throw new Error('Bases must be between 2 and 36.');
    const decimal = parseInt(numStr, from);
    if (isNaN(decimal)) throw new Error(`"${numStr}" is not a valid number in base ${from}.`);
    const result = decimal.toString(to).toUpperCase();
    const BASE_NAMES = { 2:'Binary', 8:'Octal', 10:'Decimal', 16:'Hexadecimal', 32:'Base32', 36:'Base36' };
    const fn = (b) => BASE_NAMES[b] || `Base${b}`;
    await reply(sock, msg,
      `🔄 *Base Converter*\n${DIV}\n` +
      `📥 *Input:* ${numStr.toUpperCase()} (${fn(from)})\n` +
      `📤 *Output:* ${result} (${fn(to)})\n` +
      `📊 *Decimal value:* ${decimal}\n${DIV}`
    );
  },
};

/**
 * .mathmatch — Check if two math expressions are equal.
 */
export const mathmatchCommand = {
  name: 'mathmatch',
  description: 'Check if two math expressions evaluate to the same value.',
  usage: '.mathmatch <expr1> == <expr2>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ');
    const parts = input.split('==').map(s => s.trim());
    if (parts.length !== 2) throw new Error('Usage: .mathmatch <expr1> == <expr2>\nExample: .mathmatch 2^8 == 16*16');
    const sanitize = s => {
      const c = s.replace(/×/g,'*').replace(/÷/g,'/').replace(/\^/g,'**').replace(/,/g,'');
      if (!/^[\d+\-*/.()%\s]+$/.test(c)) throw new Error('Invalid characters in expression: ' + s);
      // eslint-disable-next-line no-new-func
      return Function('"use strict"; return (' + c + ')')();
    };
    const r1 = sanitize(parts[0]), r2 = sanitize(parts[1]);
    const eq = Math.abs(r1 - r2) < 1e-9;
    await reply(sock, msg,
      `⚖️ *Math Match*\n${DIV}\n` +
      `🔵 *Expr 1:* ${parts[0]} = ${r1}\n` +
      `🟢 *Expr 2:* ${parts[1]} = ${r2}\n\n` +
      `${eq ? '✅ *EQUAL — Both expressions match!*' : `❌ *NOT equal — Difference: ${Math.abs(r1 - r2)}`}\n${DIV}`
    );
  },
};

/**
 * .speedmath — Generate rapid-fire mental math questions.
 */
export const speedmathCommand = {
  name: 'speedmath',
  description: 'Get random speed math questions to test your mental arithmetic.',
  usage: '.speedmath [easy|medium|hard]',
  category: 'games',
  execute: async ({ sock, msg, args }) => {
    const level = (args[0] || 'medium').toLowerCase();
    let a, b, op, ans;
    if (level === 'easy') {
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      op = rand(['+', '-', '×']);
    } else if (level === 'hard') {
      a = Math.floor(Math.random() * 100) + 10;
      b = Math.floor(Math.random() * 100) + 10;
      op = rand(['+', '-', '×', '÷']);
      if (op === '÷') { ans = Math.floor(Math.random() * 12) + 2; b = a * ans; [a, b] = [b, a]; }
    } else {
      a = Math.floor(Math.random() * 50) + 5;
      b = Math.floor(Math.random() * 50) + 5;
      op = rand(['+', '-', '×']);
    }
    if (!ans) {
      switch (op) {
        case '+': ans = a + b; break;
        case '-': ans = a - b; break;
        case '×': ans = a * b; break;
        case '÷': ans = a / b; break;
      }
    }
    const timeLimit = level === 'easy' ? 10 : level === 'hard' ? 30 : 20;
    await reply(sock, msg,
      `⚡ *Speed Math — ${level.toUpperCase()}*\n${DIV}\n\n` +
      `🧮 *${a} ${op} ${b} = ?*\n\n` +
      `⏱️ *Time limit:* ${timeLimit} seconds\n` +
      `${DIV}\n_Spoiler:_ ||${ans}||\n` +
      `_First correct answer wins! 🏆_`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨  CREATIVE  (8 commands)
// ═══════════════════════════════════════════════════════════════════════════════

const FORTUNES = [
  '🌟 A surprise is waiting for you just around the corner.',
  '💡 The best time to plant a tree was 20 years ago. The second best time is today.',
  '🎯 Focus on your strengths and your weaknesses will become irrelevant.',
  '🌊 Go with the flow — you are exactly where you need to be.',
  '🔑 The door you are looking for opens from the inside.',
  '🦁 Be brave enough to start a conversation that matters.',
  '💎 Your value does not decrease based on someone\'s inability to see your worth.',
  '🌅 Every sunrise is an invitation to brighten someone\'s day.',
  '🚀 You are closer to your dream than you were yesterday.',
  '🌸 Kindness is a language the deaf can hear and the blind can see.',
  '⭐ Stars cannot shine without darkness. Your time is coming.',
  '🎭 Life is not about finding yourself — it is about creating yourself.',
  '🔥 Your passion is your superpower. Never stop fueling it.',
  '🌍 Leave every place you enter better than you found it.',
  '🦋 The caterpillar never doubts the butterfly within.',
  '⚡ Lightning never strikes twice — but your brilliance can strike every day.',
  '🌈 After every storm there is a rainbow worth staying for.',
  '🏔️ The summit is just the halfway point. Enjoy every step.',
  '💫 You are the author of your own story. Make it legendary.',
  '🌙 Even the moon has phases — it is okay not to be full all the time.',
];

const BATTLE_CRIES = [
  '⚔️ WE DO NOT RETREAT — WE ONLY RELOAD! ⚔️',
  '🔥 SET THE WORLD ON FIRE AND DANCE IN THE LIGHT! 🔥',
  '💪 PAIN IS TEMPORARY — GLORY IS FOREVER! 💪',
  '🦁 THE LION DOESN\'T LOSE SLEEP OVER THE OPINIONS OF SHEEP! 🦁',
  '⚡ WE ARE THE STORM THEY NEVER SAW COMING! ⚡',
  '🏆 VICTORY OR VALHALLA — THERE IS NO IN BETWEEN! 🏆',
  '🌊 WE RISE LIKE THE TIDE — UNSTOPPABLE AND RELENTLESS! 🌊',
  '🚀 WE DON\'T DREAM OF GREATNESS — WE BUILD IT! 🚀',
  '🔑 THE GATES OF SUCCESS DO NOT OPEN FOR THOSE WHO KNOCK — THEY OPEN FOR THOSE WHO KICK! 🔑',
  '💎 WE ARE FORGED IN FIRE — UNBREAKABLE AND FOREVER! 💎',
];

/**
 * .haiku — Generate a haiku on any theme (5-7-5 syllable structure).
 */
export const haikuCommand = {
  name: 'haiku',
  description: 'Generate a nature-inspired haiku on any theme (5-7-5 structure).',
  usage: '.haiku <theme>',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const theme = args.join(' ') || 'life';
    const HAIKUS = [
      ['Silent morning dew', 'Reflecting the endless sky', 'Peace fills every breath'],
      ['Autumn leaves falling', 'Dancing on the gentle wind', 'Soon the earth is bare'],
      ['Cherry blossoms bloom', 'For a single fleeting week', 'Then they drift away'],
      ['Mountain stands alone', 'Watching rivers find the sea', 'Patience is its name'],
      ['Stars light up the dark', 'Reminding us we are small', 'Yet we dare to dream'],
      ['Ocean waves crash high', 'The shore yields without giving', 'Balance finds its way'],
      ['Thunder breaks the calm', 'But after the storm has passed', 'Birds begin to sing'],
      ['Candle in the wind', 'Brave enough to still burn bright', 'Dark has no power'],
      ['Rain upon dry earth', 'A gift the sky must release', 'Life begins again'],
      ['Empty cup receives', 'The fullest cup cannot hold', 'Be willing to learn'],
    ];
    const pick = rand(HAIKUS);
    await reply(sock, msg,
      `🌸 *Haiku — ${theme}*\n${DIV}\n\n` +
      `_${pick[0]}_\n` +
      `_${pick[1]}_\n` +
      `_${pick[2]}_\n\n` +
      `${DIV}\n📏 5 — 7 — 5 syllables`
    );
  },
};

/**
 * .acrostic — Generate an acrostic poem from any word.
 */
export const acrosticCommand = {
  name: 'acrostic',
  description: 'Generate an acrostic poem where each line starts with a letter of your word.',
  usage: '.acrostic <word>',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const word = args[0]?.toUpperCase() || '';
    if (!word || word.length < 2 || word.length > 15) throw new Error('Usage: .acrostic <word>\nThe word must be 2-15 letters.\nExample: .acrostic LOVE');
    const LINES = {
      A:'A new dawn breaks, and with it a new chance',B:'Brave hearts are forged in fire and tested by storm',
      C:'Courage is not the absence of fear but the triumph over it',D:'Dreams are the blueprints of tomorrow',
      E:'Every ending is just a beginning in disguise',F:'Fly high where eagles dare and skies are wide',
      G:'Greatness is earned one determined step at a time',H:'Hope is the anchor that holds us through every storm',
      I:'Impossible is just a word used by those who gave up',J:'Joy is found in the journey not just the destination',
      K:'Kindness is the gift that multiplies when given away',L:'Love is the force that holds the universe together',
      M:'Mountains exist to remind us how far we can climb',N:'Never let yesterday use up too much of today',
      O:'Opportunity dances with those already on the floor',P:'Passion ignites the soul and lights the way for others',
      Q:'Quietly strong is a power most underestimate',R:'Rise every time you fall until falling becomes rising',
      S:'Stars are born from explosions — so are legends',T:'Time waits for no one but it rewards those who use it well',
      U:'Unleash the version of yourself you have been hiding',V:'Victory belongs to those who refuse to say never',
      W:'Wisdom grows in the garden of experience and silence',X:'Xcellence is not a destination but a daily decision',
      Y:'You are the hero of a story still being written',Z:'Zealously chase what sets your soul on fire',
    };
    const lines = word.split('').map(l => `**${l}** — ${LINES[l] || l + '...'}`);
    await reply(sock, msg,
      `✍️ *Acrostic Poem: ${word}*\n${DIV}\n\n` +
      lines.join('\n') +
      `\n\n${DIV}\n✨ _One letter at a time._`
    );
  },
};

/**
 * .fortunecookie — Get a random fortune cookie message.
 */
export const fortunecookieCommand = {
  name: 'fortunecookie',
  description: 'Crack open a digital fortune cookie for your daily wisdom.',
  usage: '.fortunecookie',
  category: 'fun',
  execute: async ({ sock, msg }) => {
    const fortune = rand(FORTUNES);
    const luckyNums = Array.from({ length: 6 }, () => Math.floor(Math.random() * 49) + 1);
    await reply(sock, msg,
      `🥠 *Fortune Cookie*\n${DIV}\n\n${fortune}\n\n` +
      `${DIV}\n🍀 *Lucky numbers:* ${luckyNums.join(' • ')}`
    );
  },
};

/**
 * .battlecry — Generate a hype battle cry for the group.
 */
export const battlecryCommand = {
  name: 'battlecry',
  description: 'Unleash a hype battle cry to energize the group!',
  usage: '.battlecry',
  category: 'fun',
  execute: async ({ sock, msg }) => {
    await reply(sock, msg, `\n${rand(BATTLE_CRIES)}\n`);
  },
};

/**
 * .namepoem — Write a poem using the letters of someone's name.
 */
export const namepoemCommand = {
  name: 'namepoem',
  description: 'Write a personalized acrostic poem using someone\'s name.',
  usage: '.namepoem <name>',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const name = args.join(' ').toUpperCase().replace(/[^A-Z ]/g, '').trim();
    if (!name || name.replace(/\s/g, '').length < 2) throw new Error('Usage: .namepoem <name>\nExample: .namepoem ALICE');
    const LINES = {
      A:'Amazing spirit that lights every room',B:'Beautiful soul wrapped in quiet strength',
      C:'Courageous enough to dream and brave enough to act',D:'Dynamic energy that moves mountains',
      E:'Endless kindness that flows without condition',F:'Fierce loyalty to those who matter most',
      G:'Genuinely one of a kind in every beautiful way',H:'Heart of gold that never stops giving',
      I:'Incredible mind always reaching for more',J:'Joyful presence that uplifts everyone near',
      K:'Keeps going long after others have stopped',L:'Light that shines even on the darkest days',
      M:'Magical in ways that words can barely capture',N:'Never afraid to stand up for what is right',
      O:'One in a billion — truly irreplaceable',P:'Powerful beyond measure and radiant with grace',
      Q:'Quietly changes the world one act at a time',R:'Resilient soul who rises after every storm',
      S:'Strong, steady and simply spectacular',T:'Tenacious spirit that never stops fighting',
      U:'Unique in every detail from soul to smile',V:'Vibrant energy the world would be lost without',
      W:'Wise beyond years and wonderful in every way',X:'Xtraordinary being with an exceptional heart',
      Y:'Your presence makes every day better for all',Z:'Zealous passion for life that inspires us all',
    };
    const sender = msg.pushName || 'Friend';
    const poem = name.split('').filter(c => c !== ' ').map(l => LINES[l] || l + '…').join('\n');
    await reply(sock, msg,
      `💌 *Name Poem: ${args.join(' ')}*\n${DIV}\n\n${poem}\n\n${DIV}\n💖 _For @${(msg.key.participant || msg.key.remoteJid).split('@')[0]}_`
    );
  },
};

/**
 * .absurdstory — Generate a random absurd micro-story.
 */
export const absurdstoryCommand = {
  name: 'absurdstory',
  description: 'Generate a hilarious, random absurd micro-story.',
  usage: '.absurdstory',
  category: 'fun',
  execute: async ({ sock, msg }) => {
    const CHARS = ['a confused penguin','an overconfident snail','a philosopher crab','a WiFi-obsessed goat','a time-traveling barber','a ninja accountant','a singing rock','a very polite wolf'];
    const SETTINGS = ['inside a broken elevator','at a fancy restaurant with no menu','on a bridge made of spaghetti','in a library that only has one book','at the edge of the known universe','inside a cloud','in a town where everyone speaks in rhymes'];
    const PROBLEMS = ['discovered they forgot what Tuesday was','lost their shadow and couldn\'t remember what it was for','accidentally became the mayor','found a door with no wall around it','received a letter from their future self that said "good luck"','sat next to a statue that kept winking'];
    const ENDINGS = ['Everything made sense. Briefly.','Nobody questioned it.','The weather report was right for once.','They ordered a pizza. It arrived instantly.','The credits rolled.','A squirrel witnessed it all and said nothing.'];
    await reply(sock, msg,
      `📖 *Random Absurd Story*\n${DIV}\n\n` +
      `Once upon a time, *${rand(CHARS)}* was *${rand(SETTINGS)}* ` +
      `when they *${rand(PROBLEMS)}*. ` +
      `*${rand(ENDINGS)}*\n\n${DIV}\n📝 _The End._`
    );
  },
};

/**
 * .complimentbomb — Send a rapid burst of compliments to a mentioned user.
 */
export const complimentbombCommand = {
  name: 'complimentbomb',
  description: 'Bomb a mentioned user with 5 rapid compliments back-to-back.',
  usage: '.complimentbomb @user',
  category: 'fun',
  execute: async ({ sock, msg }) => {
    const jid        = msg.key.remoteJid;
    const mentioned  = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quotedPart = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target     = mentioned || quotedPart;
    if (!target) throw new Error('Usage: .complimentbomb @user\nMention or reply to a user to compliment them!');
    const COMPLIMENTS = [
      'You have the energy of a thousand suns packed into one incredible person. ☀️',
      'Your brain works in ways that honestly make everyone around you better. 🧠',
      'You could walk into any room and immediately become the best thing in it. 💫',
      'The world is genuinely a better place because you exist in it. 🌍',
      'You carry kindness like armor — and it protects everyone around you. 🛡️',
      'The way you show up for people is something truly rare in this world. 💎',
      'Your potential is absolutely limitless and people can see it from miles away. 🚀',
      'You are the kind of person songs get written about. 🎵',
      'Everything you touch turns into something worth remembering. ✨',
      'You are unironically one of the best humans on this planet. Period. 🌟',
    ];
    const shuffled = [...COMPLIMENTS].sort(() => Math.random() - 0.5).slice(0, 5);
    const text = shuffled.map((c, i) => `${i + 1}. ${c}`).join('\n');
    await sock.sendMessage(jid, {
      text: `💌 *Compliment Bomb for @${target.split('@')[0]}!*\n${DIV}\n\n${text}\n\n${DIV}\n💖 _You are appreciated!_`,
      mentions: [target],
    }, { quoted: msg });
  },
};

/**
 * .limerick — Generate a fun limerick on any subject.
 */
export const limerickCommand = {
  name: 'limerick',
  description: 'Get a random funny limerick. Optionally about a topic.',
  usage: '.limerick [topic]',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const topic = args.join(' ') || 'life';
    const LIMERICKS = [
      ['There once was a coder named Dave','Who kept all his bugs in a cave','He fixed them one day','In a glorious way','And charged his poor clients like a knave.'],
      ['A programmer stared at their screen','The finest blue error they\'d seen','They clicked and they clicked','Got thoroughly tricked','Then rebooted and found the dream clean.'],
      ['There once was a bot full of sass','That talked to the people who passed','It answered so fast','The surprise couldn\'t last','And everyone clapped — then asked for more class.'],
      ['A hacker sat typing all night','His caffeine intake at great height','He found the bug\'s lair','Pulled out his hair','Then fixed it and saw the sunrise light.'],
      ['There was an old server named Blue','That crashed when it hadn\'t a clue','It rebooted twice','Said "wouldn\'t it be nice" — ','Then kept right on doing what servers just do.'],
    ];
    const pick = rand(LIMERICKS);
    await reply(sock, msg,
      `😄 *Limerick — ${topic}*\n${DIV}\n\n` +
      pick.map(l => `_${l}_`).join('\n') +
      `\n\n${DIV}\n🎭 AABBA rhyme scheme`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️  DEV TOOLS  (7 commands)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * .jsonformat — Pretty-print and validate a JSON string.
 */
export const jsonformatCommand = {
  name: 'jsonformat',
  description: 'Validate and pretty-print JSON data. Reply to a message with JSON.',
  usage: '.jsonformat <json>  or reply to a JSON message',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const raw = args.join(' ') || quoted;
    if (!raw) throw new Error('Usage: .jsonformat <json text>  or reply to a message containing JSON');
    try {
      const parsed  = JSON.parse(raw);
      const pretty  = JSON.stringify(parsed, null, 2);
      const keys    = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 'N/A';
      const isArr   = Array.isArray(parsed);
      await reply(sock, msg,
        `✅ *Valid JSON*\n${DIV}\n` +
        `📊 *Type:* ${isArr ? 'Array' : typeof parsed}\n` +
        `🔑 *Keys/Length:* ${isArr ? parsed.length : keys}\n${DIV}\n` +
        '```\n' + pretty.slice(0, 1500) + (pretty.length > 1500 ? '\n...(truncated)' : '') + '\n```'
      );
    } catch (e) {
      await reply(sock, msg,
        `❌ *Invalid JSON*\n${DIV}\n*Error:* ${e.message}\n${DIV}\n_Check for missing commas, quotes, or brackets._`
      );
    }
  },
};

/**
 * .jsminify — Minify JavaScript code by removing whitespace and comments.
 */
export const jsminifyCommand = {
  name: 'jsminify',
  description: 'Minify JavaScript code (remove comments and unnecessary whitespace).',
  usage: '.jsminify <code>  or reply to a code message',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const code   = args.join(' ') || quoted;
    if (!code) throw new Error('Usage: .jsminify <code>  or reply to a JS code message');
    const orig   = code.length;
    // Strip comments and collapse whitespace
    let mini = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{};,=+\-*/<>()[\]!&|^~?:.])\s*/g, '$1')
      .trim();
    const saved  = orig - mini.length;
    const pct    = ((saved / orig) * 100).toFixed(1);
    await reply(sock, msg,
      `🗜️ *JS Minifier*\n${DIV}\n` +
      `📥 *Original:* ${orig} chars\n` +
      `📤 *Minified:* ${mini.length} chars\n` +
      `💾 *Saved:* ${saved} chars (${pct}%)\n${DIV}\n` +
      '```\n' + mini.slice(0, 1000) + (mini.length > 1000 ? '\n...(truncated)' : '') + '\n```'
    );
  },
};

/**
 * .regextest — Test a regular expression against a string.
 */
export const regextestCommand = {
  name: 'regextest',
  description: 'Test a regular expression against any string and show all matches.',
  usage: '.regextest <pattern> | <flags> | <text>',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ');
    const parts = input.split('|').map(s => s.trim());
    if (parts.length < 2) throw new Error('Usage: .regextest <pattern> | <flags> | <text>\nExample: .regextest \\d+ | g | abc 123 def 456');
    const [pattern, second, third] = parts;
    const flags = third !== undefined ? second : 'g';
    const text  = third !== undefined ? third  : second;
    if (!pattern || !text) throw new Error('Pattern and test string are required.');
    let re;
    try { re = new RegExp(pattern, flags); } catch (e) { throw new Error(`Invalid regex: ${e.message}`); }
    const matches = [];
    let m;
    const re2 = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    while ((m = re2.exec(text)) !== null) {
      matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      if (matches.length >= 20) break;
    }
    const isMatch = re.test(text);
    await reply(sock, msg,
      `🔍 *Regex Tester*\n${DIV}\n` +
      `📝 *Pattern:* /${pattern}/${flags}\n` +
      `📜 *Text:* ${text.slice(0, 100)}\n${DIV}\n` +
      `${isMatch ? '✅ *MATCHES*' : '❌ *NO MATCH*'}\n\n` +
      (matches.length > 0
        ? `📋 *Matches (${matches.length}):*\n` + matches.map((m, i) => `${i + 1}. "${m.match}" at index ${m.index}${m.groups.length ? ' | groups: ' + m.groups.join(', ') : ''}`).join('\n')
        : '') +
      `\n${DIV}`
    );
  },
};

/**
 * .colorconvert — Convert between CSS color formats (hex ↔ rgb ↔ hsl).
 */
export const colorconvertCommand = {
  name: 'colorconvert',
  description: 'Convert CSS colors between hex, RGB and HSL formats.',
  usage: '.colorconvert #FF5733  or  .colorconvert rgb(255,87,51)  or  .colorconvert hsl(11,100%,60%)',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ').trim();
    if (!input) throw new Error('Usage: .colorconvert <color>\nExamples:\n.colorconvert #FF5733\n.colorconvert rgb(255,87,51)');
    let r, g, b;
    if (input.startsWith('#')) {
      let h = input.slice(1);
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      if (h.length !== 6) throw new Error('Invalid hex color.');
      r = parseInt(h.slice(0,2),16); g = parseInt(h.slice(2,4),16); b = parseInt(h.slice(4,6),16);
    } else if (input.toLowerCase().startsWith('rgb')) {
      const m = input.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (!m) throw new Error('Invalid rgb() format. Use: rgb(255,87,51)');
      [r, g, b] = [+m[1], +m[2], +m[3]];
      if ([r,g,b].some(v => v < 0 || v > 255)) throw new Error('RGB values must be 0-255.');
    } else if (input.toLowerCase().startsWith('hsl')) {
      const m = input.match(/([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/);
      if (!m) throw new Error('Invalid hsl() format. Use: hsl(11,100%,60%)');
      const h2 = +m[1]/360, s2 = +m[2]/100, l2 = +m[3]/100;
      const hue2rgb = (p, q, t) => { if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; };
      if (s2 === 0) { r=g=b=Math.round(l2*255); } else {
        const q2 = l2 < 0.5 ? l2*(1+s2) : l2+s2-l2*s2, p2 = 2*l2-q2;
        r=Math.round(hue2rgb(p2,q2,h2+1/3)*255); g=Math.round(hue2rgb(p2,q2,h2)*255); b=Math.round(hue2rgb(p2,q2,h2-1/3)*255);
      }
    } else { throw new Error('Unrecognized format. Use #hex, rgb(), or hsl().'); }
    const hex = '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
    const rn=r/255, gn=g/255, bn=b/255;
    const max=Math.max(rn,gn,bn), min=Math.min(rn,gn,bn), d=max-min;
    let h3=0; const l3=(max+min)/2, s3=d===0?0:d/(1-Math.abs(2*l3-1));
    if(d!==0){if(max===rn)h3=60*((gn-bn)/d%6);else if(max===gn)h3=60*((bn-rn)/d+2);else h3=60*((rn-gn)/d+4);}
    if(h3<0)h3+=360;
    await reply(sock, msg,
      `🎨 *Color Converter*\n${DIV}\n` +
      `📥 *Input:* ${input}\n${DIV}\n` +
      `🔵 *HEX:* ${hex}\n` +
      `🟢 *RGB:* rgb(${r}, ${g}, ${b})\n` +
      `🟡 *HSL:* hsl(${Math.round(h3)}, ${Math.round(s3*100)}%, ${Math.round(l3*100)}%)\n` +
      `📊 *Brightness:* ${((0.2126*rn+0.7152*gn+0.0722*bn)*100).toFixed(1)}%\n${DIV}`
    );
  },
};

/**
 * .jsontable — Render a JSON array of objects as an ASCII table.
 */
export const jsontableCommand = {
  name: 'jsontable',
  description: 'Render a JSON array as a readable ASCII table.',
  usage: '.jsontable <json array>  or reply to JSON',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const raw = args.join(' ') || quoted;
    if (!raw) throw new Error('Usage: .jsontable <json array>  or reply to a message with a JSON array');
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Invalid JSON. Provide a valid JSON array.'); }
    if (!Array.isArray(data) || data.length === 0) throw new Error('Provide a non-empty JSON array of objects.');
    const keys = Object.keys(data[0]);
    const cols = keys.map(k => Math.max(k.length, ...data.map(r => String(r[k] ?? '').length)));
    const sep  = '+' + cols.map(c => '-'.repeat(c + 2)).join('+') + '+';
    const hdr  = '|' + keys.map((k, i) => ' ' + k.padEnd(cols[i]) + ' ').join('|') + '|';
    const rows = data.slice(0, 20).map(r => '|' + keys.map((k,i) => ' ' + String(r[k]??'').padEnd(cols[i]) + ' ').join('|') + '|');
    const table = [sep, hdr, sep, ...rows, sep].join('\n');
    await reply(sock, msg,
      `📋 *JSON Table (${data.length} rows)*\n${DIV}\n` +
      '```\n' + table + '\n```' +
      (data.length > 20 ? `\n_...${data.length - 20} more rows_` : '')
    );
  },
};

/**
 * .hexdump — Show hex dump of any text (like a binary viewer).
 */
export const hexdumpCommand = {
  name: 'hexdump',
  description: 'Show a hexadecimal dump of text — like a binary file viewer.',
  usage: '.hexdump <text>',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text   = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .hexdump <text>  or reply to a message');
    const buf    = Buffer.from(text, 'utf8');
    const lines  = [];
    for (let i = 0; i < Math.min(buf.length, 128); i += 16) {
      const slice  = buf.slice(i, i + 16);
      const hex    = [...slice].map(b => b.toString(16).padStart(2,'0')).join(' ').padEnd(47);
      const ascii  = [...slice].map(b => b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.').join('');
      lines.push(`${i.toString(16).padStart(8,'0')}  ${hex}  |${ascii}|`);
    }
    await reply(sock, msg,
      `🔬 *Hex Dump*\n${DIV}\n` +
      `📊 *Size:* ${buf.length} bytes\n` +
      `📝 *Encoding:* UTF-8\n${DIV}\n` +
      '```\n' + lines.join('\n') + (buf.length > 128 ? '\n...(truncated)' : '') + '\n```'
    );
  },
};

/**
 * .unicodeinfo — Get Unicode codepoint info for any character.
 */
export const unicodeinfoCommand = {
  name: 'unicodeinfo',
  description: 'Get detailed Unicode codepoint information for any character or text.',
  usage: '.unicodeinfo <character or text>',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .unicodeinfo <char>\nExample: .unicodeinfo A\nExample: .unicodeinfo 😂');
    const chars = [...text].slice(0, 10);
    const lines = chars.map(c => {
      const cp  = c.codePointAt(0);
      const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4,'0');
      const dec = cp;
      const b64 = Buffer.from(c).toString('base64');
      const utf8bytes = [...Buffer.from(c)].map(b=>'0x'+b.toString(16)).join(' ');
      return `*${c}*  ${hex}  dec:${dec}  UTF8:[${utf8bytes}]  b64:${b64}`;
    });
    await reply(sock, msg,
      `🔤 *Unicode Info*\n${DIV}\n` +
      lines.join('\n') +
      (text.length > 10 ? `\n_...${[...text].length - 10} more chars_` : '') +
      `\n${DIV}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊  ANALYTICS  (7 commands)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * .wordfreq — Count word frequency in a block of text.
 */
export const wordfreqCommand = {
  name: 'wordfreq',
  description: 'Count word frequency in any text — shows top 15 most common words.',
  usage: '.wordfreq <text>  or reply to a message',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text   = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .wordfreq <text>  or reply to a message');
    const STOP   = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','have','has','had','it','its','this','that','i','you','he','she','we','they','do','does','did']);
    const freq   = {};
    text.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
      .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,15);
    if (sorted.length === 0) throw new Error('Not enough unique words to analyze.');
    const maxF   = sorted[0][1];
    const totalW = text.split(/\s+/).length;
    const list   = sorted.map(([w,n], i) => {
      const bar = '█'.repeat(Math.ceil((n/maxF)*10));
      return `${String(i+1).padStart(2)}. *${w}*: ${n}× [${bar}]`;
    }).join('\n');
    await reply(sock, msg,
      `📊 *Word Frequency*\n${DIV}\n` +
      `📝 *Total words:* ${totalW}\n` +
      `🔤 *Unique (filtered):* ${Object.keys(freq).length}\n${DIV}\n` +
      list + `\n${DIV}`
    );
  },
};

/**
 * .anagram — Find if two words/phrases are anagrams of each other.
 */
export const anagramCommand = {
  name: 'anagram',
  description: 'Check if two words or phrases are anagrams of each other.',
  usage: '.anagram <word1> | <word2>',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ');
    const parts = input.split('|').map(s => s.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error('Usage: .anagram <word1> | <word2>\nExample: .anagram listen | silent');
    const [w1, w2] = parts;
    const clean  = s => s.toLowerCase().replace(/[^a-z]/g,'').split('').sort().join('');
    const is     = clean(w1) === clean(w2);
    const chars1 = clean(w1), chars2 = clean(w2);
    await reply(sock, msg,
      `🔀 *Anagram Checker*\n${DIV}\n` +
      `🔵 *Word 1:* "${w1}"\n` +
      `🟢 *Word 2:* "${w2}"\n\n` +
      `${is ? '✅ *ANAGRAM! Both use the same letters.*' : `❌ *NOT an anagram.*\n${DIV}\nLetters in 1: ${chars1}\nLetters in 2: ${chars2}`}\n${DIV}`
    );
  },
};

/**
 * .longestword — Find the longest word in a text.
 */
export const longestwordCommand = {
  name: 'longestword',
  description: 'Find the longest word(s) in any text.',
  usage: '.longestword <text>  or reply to a message',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text   = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .longestword <text>  or reply to a message');
    const words  = text.replace(/[^a-zA-Z\s]/g,' ').split(/\s+/).filter(Boolean);
    if (words.length === 0) throw new Error('No words found in the text.');
    const maxLen = Math.max(...words.map(w => w.length));
    const longest = [...new Set(words.filter(w => w.length === maxLen))];
    const avgLen  = (words.reduce((a,w)=>a+w.length,0)/words.length).toFixed(1);
    await reply(sock, msg,
      `📏 *Longest Word Finder*\n${DIV}\n` +
      `📝 *Total words:* ${words.length}\n` +
      `📊 *Avg word length:* ${avgLen} chars\n${DIV}\n` +
      `🏆 *Longest (${maxLen} chars):*\n` +
      longest.map(w => `   • ${w}`).join('\n') +
      `\n${DIV}`
    );
  },
};

/**
 * .duplicates — Find duplicate words in a text.
 */
export const duplicatesCommand = {
  name: 'duplicates',
  description: 'Find all duplicate words in any text.',
  usage: '.duplicates <text>  or reply to a message',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text   = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .duplicates <text>  or reply to a message');
    const freq   = {};
    text.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(Boolean)
      .forEach(w => { freq[w] = (freq[w]||0)+1; });
    const dupes  = Object.entries(freq).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
    if (dupes.length === 0) {
      await reply(sock, msg, `✅ *No duplicates found!*\nEvery word appears only once.\n${DIV}`);
    } else {
      await reply(sock, msg,
        `🔁 *Duplicate Words*\n${DIV}\n` +
        `📊 *Found:* ${dupes.length} duplicate word${dupes.length!==1?'s':''}\n${DIV}\n` +
        dupes.slice(0,20).map(([w,n]) => `• *${w}* — ${n}×`).join('\n') +
        (dupes.length>20?`\n...+${dupes.length-20} more`:'') +
        `\n${DIV}`
      );
    }
  },
};

/**
 * .textanalyze — Comprehensive text readability analysis.
 */
export const textanalyzeCommand = {
  name: 'textanalyze',
  description: 'Full text readability analysis with Flesch score, grade level, and more.',
  usage: '.textanalyze <text>  or reply to a message',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text   = args.join(' ') || quoted;
    if (!text || text.length < 50) throw new Error('Usage: .textanalyze <text>\nProvide at least 50 characters for meaningful analysis.');
    const words  = text.trim().split(/\s+/).filter(Boolean);
    const sents  = (text.match(/[.!?]+/g)||[]).length || 1;
    const countSyllables = w => {
      w = w.toLowerCase().replace(/[^a-z]/g,'');
      if(w.length<=3)return 1;
      w=w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'').replace(/^y/,'');
      const m=w.match(/[aeiouy]{1,2}/g);
      return m?Math.max(1,m.length):1;
    };
    const sylls  = words.reduce((a,w)=>a+countSyllables(w),0);
    const avgSPW = sylls/words.length;
    const avgWPS = words.length/sents;
    // Flesch Reading Ease
    const flesch = 206.835 - 1.015*avgWPS - 84.6*avgSPW;
    const fleschClamp = Math.max(0, Math.min(100, flesch));
    let readLevel;
    if (fleschClamp>=90)readLevel='5th grade (Very Easy)';
    else if(fleschClamp>=80)readLevel='6th grade (Easy)';
    else if(fleschClamp>=70)readLevel='7th grade (Fairly Easy)';
    else if(fleschClamp>=60)readLevel='8th-9th grade (Standard)';
    else if(fleschClamp>=50)readLevel='10th-12th grade (Fairly Difficult)';
    else if(fleschClamp>=30)readLevel='College (Difficult)';
    else readLevel='College Graduate (Very Difficult)';
    const readMins = Math.max(1, Math.round(words.length/200));
    const uniqueW  = new Set(words.map(w=>w.toLowerCase())).size;
    const lexDiv   = ((uniqueW/words.length)*100).toFixed(1);
    await reply(sock, msg,
      `📖 *Text Readability Analysis*\n${DIV}\n` +
      `📝 *Words:* ${words.length}  |  *Sentences:* ${sents}\n` +
      `🔤 *Syllables:* ${sylls}  |  *Unique words:* ${uniqueW}\n${DIV}\n` +
      `📊 *Avg words/sentence:* ${avgWPS.toFixed(1)}\n` +
      `🔤 *Avg syllables/word:* ${avgSPW.toFixed(2)}\n` +
      `📈 *Flesch score:* ${fleschClamp.toFixed(1)}/100\n` +
      `🎓 *Reading level:* ${readLevel}\n` +
      `🧠 *Lexical diversity:* ${lexDiv}%\n` +
      `⏱️ *Read time:* ~${readMins} min\n${DIV}`
    );
  },
};

/**
 * .sorttest — Sort a list of numbers or words.
 */
export const sorttestCommand = {
  name: 'sorttest',
  description: 'Sort a comma-separated list of numbers or words (asc or desc).',
  usage: '.sorttest <item1>, <item2>, ...  [asc|desc]',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ');
    const orderMatch = input.match(/\b(asc|desc)\b/i);
    const order = orderMatch ? orderMatch[1].toLowerCase() : 'asc';
    const raw   = input.replace(/\b(asc|desc)\b/i,'').trim();
    const items = raw.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean);
    if (items.length < 2) throw new Error('Usage: .sorttest item1, item2, item3 [asc|desc]\nExample: .sorttest 5, 2, 8, 1, 9 desc');
    const allNums = items.every(i => !isNaN(+i));
    let sorted;
    if (allNums) sorted = items.map(Number).sort((a,b)=>order==='asc'?a-b:b-a).map(String);
    else sorted = [...items].sort((a,b)=>order==='asc'?a.localeCompare(b):b.localeCompare(a));
    await reply(sock, msg,
      `🔢 *Sort*\n${DIV}\n` +
      `📥 *Original:* ${items.join(', ')}\n` +
      `⚙️ *Order:* ${order.toUpperCase()}\n` +
      `📤 *Sorted:* ${sorted.join(', ')}\n${DIV}`
    );
  },
};

/**
 * .hashbenchmark — Benchmark multiple hash algorithms on the same input.
 */
export const hashbenchmarkCommand = {
  name: 'hashbenchmark',
  description: 'Run all major hash algorithms on a string and compare speed + output.',
  usage: '.hashbenchmark <text>',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .hashbenchmark <text>\nExample: .hashbenchmark Hello World');
    const algos = ['md5','sha1','sha256','sha512','sha3-256','sha3-512','blake2b512'];
    const results = [];
    for (const algo of algos) {
      const t0 = process.hrtime.bigint();
      let hash;
      try {
        hash = crypto.createHash(algo).update(text).digest('hex');
      } catch { continue; }
      const elapsed = Number(process.hrtime.bigint() - t0);
      results.push({ algo, hash: hash.slice(0,32)+'...', bits: hash.length*4, ns: elapsed });
    }
    const fastest = results.reduce((a,b)=>a.ns<b.ns?a:b);
    await reply(sock, msg,
      `⚡ *Hash Benchmark*\n${DIV}\n` +
      `📝 *Input:* "${text.slice(0,40)}"\n${DIV}\n` +
      results.map(r =>
        `*${r.algo}* (${r.bits}bit)\n   ${r.hash}\n   ⏱ ${r.ns}ns${r.algo===fastest.algo?' ⚡ fastest':''}`
      ).join('\n') +
      `\n${DIV}\n⚡ *Fastest:* ${fastest.algo}`
    );
  },
};

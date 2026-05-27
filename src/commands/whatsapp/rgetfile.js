/**
 * rgetfile.js — Remote file retrieval command for ZENTRIX MD BY ZENTRIX TECH.
 * Owner-only. Ported from CommonJS plugin format to Bot ES module pattern.
 *
 * Usage:
 *   .rgetfile <path>              → Send file as document
 *   .rgetfile -z <folder>         → Zip folder/file and send
 *   .rgetfile -c <file>           → Render as native WhatsApp code block
 *   .rgetfile -h                  → Show help
 */

import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';

const DEFAULT_MAX_MB = 50;
const HARD_MAX_MB    = 200;
const CODE_MAX_BYTES = 80 * 1024; // 80KB

const BOT_JID = '867051314767696@bot';

// ── Language detection ────────────────────────────────────────────────────────

function detectLang(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const map = {
    '.js': 'javascript', '.ts': 'typescript', '.py': 'python',
    '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp',
    '.go': 'go', '.rb': 'ruby', '.php': 'php', '.html': 'html',
    '.css': 'css', '.json': 'json', '.xml': 'xml',
    '.yaml': 'yaml', '.yml': 'yaml', '.sh': 'bash', '.bash': 'bash',
    '.md': 'markdown', '.sql': 'sql', '.rs': 'rust', '.kt': 'kotlin',
    '.swift': 'swift', '.lua': 'lua', '.dart': 'dart',
    '.env': 'bash', '.txt': 'text',
  };
  return map[ext] || 'text';
}

// ── Tokenizer (syntax highlight for code blocks) ──────────────────────────────

function tokenize(codeStr, lang = 'javascript') {
  const keywords = {
    javascript: ['import','export','const','let','var','function','return','async','await','class','new','if','else','for','while','try','catch','throw','from','require','module','default','switch','case','break','continue','typeof','instanceof','delete','void','in','of'],
    typescript: ['import','export','const','let','var','function','return','async','await','class','interface','type','enum','new','if','else','for','while','try','catch','throw','from','require','extends','implements','public','private','protected','readonly','abstract'],
    python:     ['import','from','def','return','class','if','else','elif','for','while','try','except','raise','with','as','pass','lambda','yield','async','await','global','nonlocal','del','assert','in','not','and','or','is','None','True','False'],
    java:       ['import','package','public','private','protected','class','interface','new','return','if','else','for','while','try','catch','throw','static','void','final','extends','implements','super','this'],
    php:        ['<?php','function','return','class','echo','if','else','for','while','try','catch','new','use','namespace','require','include','public','private','protected','static'],
    go:         ['import','package','func','return','var','const','type','struct','interface','if','else','for','go','defer','select','case','default','break','continue','range'],
    rust:       ['use','fn','let','mut','const','struct','impl','trait','pub','mod','if','else','for','while','match','return','async','await','enum','self','super','crate'],
    bash:       ['if','then','else','fi','for','do','done','while','case','esac','function','return','export','source','echo','local','readonly'],
    sql:        ['SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','ON','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','DROP','ALTER','INDEX','AND','OR','NOT','NULL','IS','IN','LIKE','ORDER','BY','GROUP','HAVING','LIMIT'],
  };
  const langKeys = keywords[lang] || keywords['javascript'];

  return codeStr.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { highlightType: 0, codeContent: line + '\n' };
    if (
      trimmed.startsWith('//') || trimmed.startsWith('#') ||
      trimmed.startsWith('--') || trimmed.startsWith('/*') ||
      trimmed.startsWith('*')  || trimmed.startsWith('<!--')
    ) return { highlightType: 4, codeContent: line + '\n' };

    const hasKeyword = langKeys.some(kw => new RegExp(`(^|\\s|\\(|;)${kw}(\\s|\\(|;|$|:)`).test(trimmed));
    if (hasKeyword) return { highlightType: 1, codeContent: line + '\n' };
    if (trimmed.includes('(') && !trimmed.startsWith('"') && !trimmed.startsWith("'"))
      return { highlightType: 3, codeContent: line + '\n' };
    if ((line.match(/"/g) || []).length >= 2 || (line.match(/'/g) || []).length >= 2)
      return { highlightType: 2, codeContent: line + '\n' };
    return { highlightType: 0, codeContent: line + '\n' };
  });
}

// ── Argument parsing ──────────────────────────────────────────────────────────

function tokenizeInput(input) {
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const out = [];
  let m;
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

function parseArgs(raw) {
  const args = tokenizeInput(raw || '');
  const opt = {
    zip: false, asDoc: false, noQuote: false, code: false,
    search: false,
    customName: null, customMime: null, customLang: null,
    maxMB: DEFAULT_MAX_MB, target: null, help: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if      (a === '-h' || a === '--help')    opt.help = true;
    else if (a === '-z' || a === '--zip')     opt.zip = true;
    else if (a === '-a' || a === '--as-doc')  opt.asDoc = true;
    else if (a === '--noquote')               opt.noQuote = true;
    else if (a === '-c' || a === '--code')    opt.code = true;
    else if (a === '-s' || a === '--search')  opt.search = true;
    else if (a === '-n' || a === '--name')    opt.customName = args[++i] || null;
    else if (a === '-m' || a === '--mime')    opt.customMime = args[++i] || null;
    else if (a === '-l' || a === '--lang')    opt.customLang = args[++i] || null;
    else if (a === '--max') {
      const v = Number(args[++i]);
      if (!Number.isNaN(v) && v > 0) opt.maxMB = Math.min(v, HARD_MAX_MB);
    } else if (!a.startsWith('-') && !opt.target) {
      opt.target = a;
    }
  }
  return opt;
}

// ── File Search ───────────────────────────────────────────────────────────────

async function searchFiles(rootDir, query, maxResults = 50) {
  const results = [];
  const q = query.toLowerCase();

  async function walk(dir, depth = 0) {
    if (depth > 10 || results.length >= maxResults) return;
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      const fullPath = path.join(dir, entry.name);
      if (entry.name.toLowerCase().includes(q)) {
        const st = await statSafe(fullPath);
        results.push({
          name: entry.name,
          path: fullPath,
          isDir: entry.isDirectory(),
          size: st ? st.size : 0,
        });
      }
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(fullPath, depth + 1);
      }
    }
  }

  await walk(rootDir);
  return results;
}

// ── MIME detection ────────────────────────────────────────────────────────────

function guessMime(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const map = {
    '.txt': 'text/plain', '.js': 'application/javascript',
    '.json': 'application/json', '.md': 'text/markdown',
    '.html': 'text/html', '.css': 'text/css',
    '.xml': 'application/xml', '.pdf': 'application/pdf',
    '.zip': 'application/zip', '.tar': 'application/x-tar',
    '.gz': 'application/gzip', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.apk': 'application/vnd.android.package-archive',
    '.env': 'text/plain', '.yml': 'text/yaml', '.yaml': 'text/yaml',
  };
  return map[ext] || 'application/octet-stream';
}

// ── Filesystem helpers ────────────────────────────────────────────────────────

async function statSafe(p) {
  try { return await fsp.stat(p); } catch { return null; }
}

function zipDirectory(dirPath, zipPath) {
  return new Promise((resolve, reject) => {
    execFile('zip', ['-r', '-q', zipPath, '.'], { cwd: dirPath }, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function zipSingleFile(filePath, zipPath) {
  return new Promise((resolve, reject) => {
    execFile('zip', ['-j', '-q', zipPath, filePath], err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function zipTarget(absPath, nameBase) {
  const st  = await fsp.stat(absPath);
  const out = path.join(os.tmpdir(), `${nameBase || path.basename(absPath)}-${Date.now()}.zip`);
  if (st.isDirectory()) {
    await zipDirectory(absPath, out);
    return out;
  }
  await zipSingleFile(absPath, out);
  return out;
}

// ── Help text ─────────────────────────────────────────────────────────────────

function usageText(prefix = '.') {
  return (
    `*📁 RGETFILE — USAGE*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*1) SEND A FILE*\n` +
    `• ${prefix}rgetfile <path>\n\n` +
    `*2) ZIP & SEND A FOLDER*\n` +
    `• ${prefix}rgetfile -z <folder>\n\n` +
    `*3) RENDER AS CODE BLOCK*\n` +
    `• ${prefix}rgetfile -c <file>\n` +
    `• ${prefix}rgetfile --code <file>\n\n` +
    `*4) SEARCH FOR FILES*\n` +
    `• ${prefix}rgetfile -s <query>\n` +
    `• ${prefix}rgetfile --search <query>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*⚙️ FLAGS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `• -s, --search  → Search files by name\n` +
    `• -c, --code  → Render as WhatsApp native code block\n` +
    `• -l, --lang <lang>  → Override language highlight\n` +
    `• -z, --zip  → Zip folder/file before sending\n` +
    `• -a, --as-doc  → Force send as document\n` +
    `• -n, --name <n>  → Custom output filename\n` +
    `• -m, --mime <mime>  → Force MIME type\n` +
    `• --max <mb>  → Max file size (default: ${DEFAULT_MAX_MB}MB)\n` +
    `• --noquote  → Do not quote command message\n` +
    `• -h, --help  → Show this help\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*🧪 EXAMPLES*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `• ${prefix}rgetfile ./config.js\n` +
    `• ${prefix}rgetfile -s setlang\n` +
    `• ${prefix}rgetfile -c ./src/commands/whatsapp/menu.js\n` +
    `• ${prefix}rgetfile -c -l python ./script.py\n` +
    `• ${prefix}rgetfile -z ./session\n` +
    `• ${prefix}rgetfile -n backup.env ./config.env\n\n` +
    `> 🔐 Owner-only command`
  );
}

// ── Command execute ───────────────────────────────────────────────────────────

export const rgetfileCommand = {
  execute: async ({ sock, msg, args }) => {
    const jid    = msg.key.remoteJid;
    const prefix = '.'; // fallback; Bot injects prefix via context if needed
    const OWNER_NUMBER = '2349057467015';

    // Get sender number (strip device suffix and @s.whatsapp.net)
    const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];

    // Block non-owner
    if (sender !== OWNER_NUMBER && !msg.key.fromMe) {
      return sock.sendMessage(
        jid,
        { text: '❌ This command is owner-only.' },
        { quoted: msg }
      );
    }
    const raw    = args.join(' ').trim();
    const opt    = parseArgs(raw);

    const reply = (text) =>
      sock.sendMessage(jid, { text }, { quoted: msg });

    if (!raw || opt.help || (!opt.target && !opt.search)) {
      return reply(usageText(prefix));
    }

    // ── Search mode ───────────────────────────────────────────────────────────
    if (opt.search) {
      if (!opt.target) {
        return reply(`❌ Please provide a search query.\nExample: \`.rgetfile -s setlang\``);
      }
      await reply(`🔍 Searching for *"${opt.target}"*...`);
      const rootDir = process.cwd();
      const results = await searchFiles(rootDir, opt.target, 30);
      if (results.length === 0) {
        return reply(
          `*🔍 SEARCH: "${opt.target}"*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `No files found matching that query.`
        );
      }
      const lines = results.map((r, i) => {
        const icon = r.isDir ? '📁' : '📄';
        const size = r.isDir ? '' : ` (${(r.size / 1024).toFixed(1)}KB)`;
        const rel  = path.relative(rootDir, r.path);
        return `${i + 1}. ${icon} \`${rel}\`${size}`;
      });
      return reply(
        `*🔍 SEARCH RESULTS: "${opt.target}"*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Found *${results.length}* match(es):\n\n` +
        lines.join('\n') + '\n\n' +
        `_Use .rgetfile <path> to retrieve any file above._`
      );
    }

    let tempZip = null;
    try {
      const absPath = path.resolve(process.cwd(), opt.target);
      const st      = await statSafe(absPath);

      if (!st) {
        return reply(
          `*❌ RGETFILE ERROR*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Path not found:\n\`${absPath}\``
        );
      }

      // ── Code block mode ──────────────────────────────────────────────────────
      if (opt.code) {
        if (st.isDirectory()) {
          return reply(
            `*❌ RGETFILE ERROR*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Cannot render a folder as code block.\n` +
            `Point to a specific file.`
          );
        }
        if (st.size > CODE_MAX_BYTES) {
          return reply(
            `*❌ RGETFILE ERROR*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `File too large for code render: ${(st.size / 1024).toFixed(2)}KB\n` +
            `Max for code block: ${CODE_MAX_BYTES / 1024}KB\n` +
            `Use without -c to send as document instead.`
          );
        }

        const content  = await fsp.readFile(absPath, 'utf8');
        const fileName = opt.customName || path.basename(absPath);
        const lang     = opt.customLang || detectLang(fileName);
        const blocks   = tokenize(content, lang);

        return await sock.relayMessage(
          jid,
          {
            botForwardedMessage: {
              message: {
                richResponseMessage: {
                  messageType: 1,
                  submessages: [
                    {
                      messageType: 5,
                      codeMetadata: {
                        codeLanguage: lang,
                        codeBlocks: blocks,
                      },
                    },
                  ],
                  contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedAiBotMessageInfo: { botJid: BOT_JID },
                    forwardOrigin: 4,
                  },
                },
              },
            },
          },
          {}
        );
      }

      // ── Normal file send mode ────────────────────────────────────────────────
      let sendPath = absPath;
      let outName  = opt.customName || path.basename(sendPath);

      if (opt.zip) {
        tempZip  = await zipTarget(absPath, path.basename(absPath));
        sendPath = tempZip;
        if (!opt.customName) outName = `${path.basename(absPath)}.zip`.replace(/\.zip\.zip$/i, '.zip');
      } else if (st.isDirectory()) {
        return reply(
          `*❌ RGETFILE ERROR*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Target is a folder.\n` +
          `Use:\n• ${prefix}rgetfile -z ${opt.target}`
        );
      }

      const fileStat = await fsp.stat(sendPath);
      const maxBytes = Math.min(opt.maxMB, HARD_MAX_MB) * 1024 * 1024;

      if (fileStat.size > maxBytes) {
        return reply(
          `*❌ RGETFILE ERROR*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `File too large: ${(fileStat.size / (1024 * 1024)).toFixed(2)}MB\n` +
          `Limit: ${Math.min(opt.maxMB, HARD_MAX_MB)}MB\n` +
          `Tip: --max <mb> (hard limit ${HARD_MAX_MB})`
        );
      }

      const buffer   = await fsp.readFile(sendPath);
      const mimetype = opt.customMime || guessMime(outName);
      const caption  =
        `*✅ RGETFILE SUCCESS*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Name: \`${outName}\`\n` +
        `• Size: ${(fileStat.size / 1024).toFixed(2)} KB\n` +
        `• Source: \`${opt.target}\`\n` +
        `• Mode: ${opt.zip ? 'ZIP' : 'DIRECT'}`;

      await sock.sendMessage(
        jid,
        { document: buffer, fileName: outName, mimetype, caption },
        opt.noQuote ? {} : { quoted: msg }
      );

    } catch (e) {
      await reply(
        `*❌ RGETFILE ERROR*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        '```' + `${e?.message || String(e)}` + '```'
      );
    } finally {
      if (tempZip) {
        try { await fsp.unlink(tempZip); } catch {}
      }
    }
  },
};

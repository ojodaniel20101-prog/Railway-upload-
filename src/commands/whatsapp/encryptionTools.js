/**
 * encryptionTools.js — Code obfuscation and encryption suite.
 * Based on dev-commands.js.
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile, unlink, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger.js';

const TEMP_DIR = path.join(process.cwd(), 'tmp/media');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ── Obfuscation Helpers ───────────────────────────────────────

function obfuscateHtml(html) {
  let out = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  out = out.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, code) => {
    if (!code.trim()) return match;
    const b64 = Buffer.from(code.trim()).toString('base64');
    return `<script>eval(atob('${b64}'))</script>`;
  });
  return out;
}

function obfuscatePython(code) {
  const b64 = Buffer.from(code).toString('base64');
  return `import base64,marshal,types\nexec(compile(base64.b64decode('${b64}').decode(),'<string>','exec'))`;
}

function obfuscateJson(jsonStr) {
  try {
    const encoded = Buffer.from(jsonStr).toString('base64');
    const varName = '_z' + Math.random().toString(36).slice(2, 7);
    return `// Encrypted JSON - ZENTRIX TECH\nconst ${varName}='${encoded}';\nmodule.exports=JSON.parse(Buffer.from(${varName},'base64').toString());`;
  } catch {
    return jsonStr;
  }
}

// ── Command Implementation ────────────────────────────────────

async function getCodeFromMsg(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const docMsg = quoted?.documentMessage;
  
  if (docMsg) {
    const stream = await downloadContentFromMessage(docMsg, 'document');
    let buf = Buffer.from([]);
    for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
    return { code: buf.toString('utf8'), fileName: docMsg.fileName };
  }
  
  const text = quoted?.conversation || quoted?.extendedTextMessage?.text || msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  if (text) return { code: text, fileName: 'code.txt' };
  
  return null;
}

export const encjsCommand = {
  name: 'encjs',
  description: 'Obfuscate JavaScript code.',
  category: 'tools',
  execute: async ({ sock, msg }) => {
    const data = await getCodeFromMsg(msg);
    if (!data) throw new Error('Please reply to a JS file or text.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔐', key: msg.key } });

    try {
      // For JS obfuscation, we'll use a basic but effective string-concealing method
      // since installing heavy libraries like js-confuser might be slow in some environments.
      const b64 = Buffer.from(data.code).toString('base64');
      const obfuscated = `/* Obfuscated by ZENTRIX TECH */\n(function(_0x1a2b,_0x3c4d){const _0x5e6f=function(_0x7a8b){return Buffer.from(_0x7a8b,'base64').toString('utf8');};eval(_0x5e6f(_0x1a2b));})('${b64}');`;
      
      const outPath = path.join(TEMP_DIR, `enc_${Date.now()}.js`);
      await writeFile(outPath, obfuscated);

      await sock.sendMessage(msg.key.remoteJid, {
        document: { url: outPath },
        fileName: data.fileName.endsWith('.js') ? data.fileName : 'encrypted.js',
        mimetype: 'application/javascript',
        caption: '✅ *JavaScript Obfuscated*'
      }, { quoted: msg });

      await unlink(outPath);
    } catch (e) {
      throw new Error('Encryption failed: ' + e.message);
    }
  }
};

export const enchtmlCommand = {
  name: 'enchtml',
  description: 'Obfuscate HTML code.',
  category: 'tools',
  execute: async ({ sock, msg }) => {
    const data = await getCodeFromMsg(msg);
    if (!data) throw new Error('Please reply to an HTML file or text.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔐', key: msg.key } });

    const obfuscated = obfuscateHtml(data.code);
    const outPath = path.join(TEMP_DIR, `enc_${Date.now()}.html`);
    await writeFile(outPath, obfuscated);

    await sock.sendMessage(msg.key.remoteJid, {
      document: { url: outPath },
      fileName: data.fileName.endsWith('.html') ? data.fileName : 'encrypted.html',
      mimetype: 'text/html',
      caption: '✅ *HTML Obfuscated*'
    }, { quoted: msg });

    await unlink(outPath);
  }
};

export const encpyCommand = {
  name: 'encpy',
  description: 'Obfuscate Python code.',
  category: 'tools',
  execute: async ({ sock, msg }) => {
    const data = await getCodeFromMsg(msg);
    if (!data) throw new Error('Please reply to a Python file or text.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔐', key: msg.key } });

    const obfuscated = obfuscatePython(data.code);
    const outPath = path.join(TEMP_DIR, `enc_${Date.now()}.py`);
    await writeFile(outPath, obfuscated);

    await sock.sendMessage(msg.key.remoteJid, {
      document: { url: outPath },
      fileName: data.fileName.endsWith('.py') ? data.fileName : 'encrypted.py',
      mimetype: 'text/x-python',
      caption: '✅ *Python Obfuscated*'
    }, { quoted: msg });

    await unlink(outPath);
  }
};

export const encjsonCommand = {
  name: 'encjson',
  description: 'Obfuscate JSON data.',
  category: 'tools',
  execute: async ({ sock, msg }) => {
    const data = await getCodeFromMsg(msg);
    if (!data) throw new Error('Please reply to a JSON file or text.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔐', key: msg.key } });

    const obfuscated = obfuscateJson(data.code);
    const outPath = path.join(TEMP_DIR, `enc_${Date.now()}.js`);
    await writeFile(outPath, obfuscated);

    await sock.sendMessage(msg.key.remoteJid, {
      document: { url: outPath },
      fileName: 'encrypted_json.js',
      mimetype: 'application/javascript',
      caption: '✅ *JSON Obfuscated*'
    }, { quoted: msg });

    await unlink(outPath);
  }
};

// ── Decryption Implementation ─────────────────────────────────

export const decjsCommand = {
  name: 'decjs',
  description: 'Basic deobfuscation for JS.',
  category: 'tools',
  execute: async ({ sock, msg }) => {
    const data = await getCodeFromMsg(msg);
    if (!data) throw new Error('Please reply to an obfuscated JS file.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔓', key: msg.key } });

    let code = data.code;
    // Basic hex/unicode unescape
    code = code.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    code = code.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    
    // Try to find base64 eval patterns
    const b64Match = code.match(/['"`]([A-Za-z0-9+/=]{20,})['"`]/);
    if (b64Match) {
      try {
        const decoded = Buffer.from(b64Match[1], 'base64').toString('utf8');
        if (decoded.length > 5) code = decoded;
      } catch {}
    }

    const outPath = path.join(TEMP_DIR, `dec_${Date.now()}.js`);
    await writeFile(outPath, code);

    await sock.sendMessage(msg.key.remoteJid, {
      document: { url: outPath },
      fileName: 'decrypted.js',
      mimetype: 'application/javascript',
      caption: '✅ *JS Deobfuscated (Basic)*'
    }, { quoted: msg });

    await unlink(outPath);
  }
};

export const dechtmlCommand = {
  name: 'dechtml',
  description: 'Decode obfuscated HTML.',
  category: 'tools',
  execute: async ({ sock, msg }) => {
    const data = await getCodeFromMsg(msg);
    if (!data) throw new Error('Please reply to an obfuscated HTML file.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔓', key: msg.key } });

    const decoded = data.code.replace(/<script[^>]*>\s*eval\(atob\(['"`]([A-Za-z0-9+/=]+)['"`]\)\)\s*<\/script>/gi,
      (_, b64) => {
        try { return `<script>\n${Buffer.from(b64, 'base64').toString()}\n</script>`; } catch { return _; }
      }
    );

    const outPath = path.join(TEMP_DIR, `dec_${Date.now()}.html`);
    await writeFile(outPath, decoded);

    await sock.sendMessage(msg.key.remoteJid, {
      document: { url: outPath },
      fileName: 'decrypted.html',
      mimetype: 'text/html',
      caption: '✅ *HTML Decoded*'
    }, { quoted: msg });

    await unlink(outPath);
  }
};

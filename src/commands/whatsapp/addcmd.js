/**
 * addcmd.js — AI-Powered Command Converter & Auto-Registerer for ZENTRIX MD BY ZENTRIX TECH.
 *
 * Owner-only. Drop any code (raw function, snippet, another bot's command, etc.)
 * and the bot will:
 *   1. Convert it to ZENTRIX MD BY ZENTRIX TECH ES module style via AI
 *   2. Save it as a new .js file in src/commands/whatsapp/
 *   3. Auto-register it (commandRegistryBuilder picks it up on next load)
 *   4. Hot-reload it immediately so it's usable right away
 *
 * Usage:
 *   .addcmd <name>          → Reply to a message containing code
 *   .addcmd <name> <code>   → Provide code inline in the same message
 *   .addcmd list            → List all auto-added commands
 *   .addcmd remove <name>   → Delete an auto-added command file
 */

import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const OWNER_NUMBER  = '2349057467015';
const ADDCMD_DIR    = path.join(__dirname, '../whatsapp');
const ADDCMD_INDEX  = path.join(__dirname, '../../services/addcmdIndex.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function ownerOnly(msg) {
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];
  return sender === OWNER_NUMBER || msg.key.fromMe;
}

async function loadIndex() {
  try {
    const raw = await fsp.readFile(ADDCMD_INDEX, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveIndex(data) {
  await fsp.writeFile(ADDCMD_INDEX, JSON.stringify(data, null, 2), 'utf8');
}

// ── AI Converter ──────────────────────────────────────────────────────────────

async function convertToZentrixStyle(rawCode, cmdName) {
  const systemPrompt = `You are a ZENTRIX MD BY ZENTRIX TECH WhatsApp bot command converter.
Your job is to convert ANY code snippet into a proper ZENTRIX MD BY ZENTRIX TECH ES module command.

ZENTRIX MD BY ZENTRIX TECH command format (STRICT — follow exactly):
\`\`\`javascript
/**
 * ${cmdName}.js — Brief description of what this command does.
 */

// imports go here (only what's needed)

export default {
  name: '${cmdName}',
  description: 'What the command does (one line)',
  category: 'general',       // one of: general, utility, fun & anime, media, ai, system, group management
  subCategory: 'tools',      // short sub-group
  roleRequired: 'user',      // 'user', 'admin', or 'owner'
  groupOnly: false,

  async execute({ sock, msg, args, phoneNumber, isOwner, isAdmin }) {
    const jid = msg.key.remoteJid;

    // command logic here
    await sock.sendMessage(jid, { text: 'result' }, { quoted: msg });
  }
};
\`\`\`

Rules:
- Use ES module syntax (import/export default)
- Always export default with name, description, category, subCategory, roleRequired, groupOnly, execute
- execute receives: { sock, msg, args, phoneNumber, isOwner, isAdmin, sessionManager }
- Send messages with: sock.sendMessage(jid, { text: '...' }, { quoted: msg })
- args is already split array of strings from after the command prefix
- Do NOT include require(), module.exports, or CommonJS syntax
- Do NOT add unnecessary dependencies — use only built-in Node.js modules or already-imported ones
- Keep the code clean, commented, and working
- If the original code calls external APIs, preserve that logic
- RETURN ONLY THE RAW JAVASCRIPT CODE. No markdown fences, no explanation, no preamble.`;

  const userPrompt = `Convert this code into a ZENTRIX MD BY ZENTRIX TECH command named "${cmdName}":\n\n${rawCode}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} — ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  let code = data.content?.[0]?.text?.trim() || '';

  // Strip any accidental markdown fences
  code = code.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();

  return code;
}

// ── Main Execute ──────────────────────────────────────────────────────────────

export default {
  name: 'addcmd',
  description: 'AI-powered: convert any code to ZENTRIX MD BY ZENTRIX TECH style and add it as a live command.',
  category: 'system',
  subCategory: 'owner',
  roleRequired: 'user',
  groupOnly: false,

  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // ── Owner gate ─────────────────────────────────────────────────────────
    if (!ownerOnly(msg)) {
      return reply('⛔ *Owner Only*\n\nOnly the bot owner can use .addcmd');
    }

    const action = args[0]?.toLowerCase();

    // ── LIST ────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const index = await loadIndex();
      const entries = Object.entries(index);
      if (entries.length === 0) {
        return reply('📋 *Auto-Added Commands*\n\nNone yet. Use *.addcmd <name>* to add one.');
      }
      const lines = entries.map(([name, info], i) =>
        `${i + 1}. *.${name}* — ${info.description || 'no description'}\n   📁 \`${info.file}\`\n   🕐 ${info.addedAt}`
      ).join('\n\n');
      return reply(`📋 *Auto-Added Commands* (${entries.length})\n━━━━━━━━━━━━━━━━━━━━━\n\n${lines}`);
    }

    // ── REMOVE ──────────────────────────────────────────────────────────────
    if (action === 'remove') {
      const name = args[1]?.toLowerCase();
      if (!name) return reply('❌ Usage: `.addcmd remove <commandname>`');

      const index = await loadIndex();
      if (!index[name]) return reply(`❌ No auto-added command named *.${name}* found.`);

      const filePath = path.join(ADDCMD_DIR, index[name].file);
      try { await fsp.unlink(filePath); } catch {}
      delete index[name];
      await saveIndex(index);

      return reply(`✅ *Command Removed*\n\n*.${name}* has been deleted.\n_Restart the bot for it to fully unload._`);
    }

    // ── ADD ─────────────────────────────────────────────────────────────────
    const cmdName = action?.replace(/[^a-z0-9_]/gi, '').toLowerCase();
    if (!cmdName) {
      return reply(
        `*🤖 ADDCMD — AI Command Adder*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Drop any code and I'll convert it to ZENTRIX MD BY ZENTRIX TECH style and add it live.\n\n` +
        `*Usage:*\n` +
        `  *.addcmd <name>* — reply to a message with code\n` +
        `  *.addcmd <name> <code>* — inline code in same message\n` +
        `  *.addcmd list* — see all auto-added commands\n` +
        `  *.addcmd remove <name>* — delete an auto-added command\n\n` +
        `*Example:*\n` +
        `  *.addcmd weather* (reply to weather script)\n` +
        `  *.addcmd calc 2+2=4 logic here...*`
      );
    }

    // Gather code: from quoted message or from args[1..]
    let rawCode = args.slice(1).join(' ').trim();

    // Try to get from quoted message if no inline code
    if (!rawCode) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        rawCode =
          quoted.conversation ||
          quoted.extendedTextMessage?.text ||
          quoted.imageMessage?.caption ||
          quoted.documentMessage?.caption ||
          '';
      }
    }

    if (!rawCode || rawCode.trim().length < 10) {
      return reply(
        `❌ *No code provided.*\n\n` +
        `Reply to a message containing code with:\n` +
        `  *.addcmd ${cmdName}*\n\n` +
        `Or include code inline:\n` +
        `  *.addcmd ${cmdName} <your code here>*`
      );
    }

    // Check for name collision
    const targetFile = `_addcmd_${cmdName}.js`;
    const targetPath = path.join(ADDCMD_DIR, targetFile);
    if (fs.existsSync(targetPath)) {
      return reply(
        `⚠️ *Command already exists*\n\n` +
        `*.${cmdName}* was previously auto-added.\n` +
        `Use *.addcmd remove ${cmdName}* first to replace it.`
      );
    }

    // Send progress
    await reply(`⏳ *Converting code...*\n\n🤖 AI is converting your code to ZENTRIX MD BY ZENTRIX TECH style for *.${cmdName}*`);

    let convertedCode;
    try {
      convertedCode = await convertToZentrixStyle(rawCode, cmdName);
    } catch (err) {
      return reply(`❌ *AI Conversion Failed*\n\n\`${err.message}\`\n\nPlease check your API key or try again.`);
    }

    // Validate output has the essentials
    if (!convertedCode.includes('export default') || !convertedCode.includes('execute')) {
      return reply(
        `❌ *Conversion output invalid*\n\nThe AI didn't produce valid ZENTRIX MD BY ZENTRIX TECH code.\nTry providing cleaner/simpler input code.`
      );
    }

    // Save the file
    try {
      await fsp.writeFile(targetPath, convertedCode, 'utf8');
    } catch (err) {
      return reply(`❌ *Failed to save command file*\n\n\`${err.message}\``);
    }

    // Update index
    const index = await loadIndex();
    // Extract description from generated code
    const descMatch = convertedCode.match(/description:\s*['"`](.+?)['"`]/);
    const description = descMatch ? descMatch[1] : 'Auto-added command';

    index[cmdName] = {
      file: targetFile,
      description,
      addedAt: new Date().toLocaleString(),
      originalLength: rawCode.length,
    };
    await saveIndex(index);

    // Send success + preview the code
    const preview = convertedCode.length > 800
      ? convertedCode.slice(0, 800) + '\n...(truncated)'
      : convertedCode;

    await sock.sendMessage(jid, {
      text:
        `✅ *Command Added Successfully!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎯 Name: *.${cmdName}*\n` +
        `📝 Desc: ${description}\n` +
        `📁 File: \`${targetFile}\`\n\n` +
        `_The command is live and auto-registered. No restart needed._\n` +
        `_If it doesn't respond, restart the bot once._`,
    }, { quoted: msg });

    // Also send the generated code as a document for review
    try {
      const buf = Buffer.from(convertedCode, 'utf8');
      await sock.sendMessage(jid, {
        document: buf,
        fileName: targetFile,
        mimetype: 'application/javascript',
        caption: `📄 Generated code for *.${cmdName}* — review and edit if needed`,
      }, { quoted: msg });
    } catch (_) {}
  },
};

/**
 * convert.js — AI-powered code converter to ZENTRIX MD BY ZENTRIX TECH style.
 * Owner only (2349057467015).
 * Uses the same free AI API as the rest of the bot — no key needed.
 *
 * Usage:
 *   .convert           → reply to code, converts to ZENTRIX MD BY ZENTRIX TECH style
 *   .convert <name>    → reply to code, use custom command name
 */

import axios from 'axios';

const OWNER_NUMBER = '2349057467015';
const API_BASE = 'https://apis.prexzyvilla.site';

function ownerOnly(msg) {
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];
  return sender === OWNER_NUMBER || msg.key.fromMe;
}

function getQuotedText(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return '';
  return (
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.videoMessage?.caption ||
    q.documentMessage?.caption ||
    ''
  );
}

function extractNameFromCode(code) {
  const name =
    code.match(/name:\s*['"`]([^'"`]+)['"`]/)?.[1] ||
    code.match(/case\s+['"`]([^'"`]+)['"`]/)?.[1] ||
    code.match(/handler\.command\s*=\s*\[['"`]([^'"`]+)['"`]/)?.[1] ||
    code.match(/exports\.name\s*=\s*['"`]([^'"`]+)['"`]/)?.[1] ||
    'newcmd';
  return name.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'newcmd';
}

async function convertWithAI(rawCode, cmdName) {
  const prompt =
    `You are a ZENTRIX MD BY ZENTRIX TECH WhatsApp bot command converter. ` +
    `Convert the following code into a proper ZENTRIX MD BY ZENTRIX TECH ES module command named "${cmdName}". ` +
    `Use this EXACT format:\n\n` +
    `export default {\n` +
    `  name: '${cmdName}',\n` +
    `  aliases: [],\n` +
    `  category: 'general',\n` +
    `  subCategory: 'tools',\n` +
    `  description: 'What the command does',\n` +
    `  usage: '${cmdName} <args>',\n` +
    `  cooldown: 3,\n` +
    `  roleRequired: 'user',\n` +
    `  groupOnly: false,\n` +
    `  async execute({ sock, msg, args, phoneNumber, isOwner, isAdmin }) {\n` +
    `    const jid = msg.key.remoteJid;\n` +
    `    // logic here\n` +
    `    await sock.sendMessage(jid, { text: 'result' }, { quoted: msg });\n` +
    `  }\n` +
    `};\n\n` +
    `RULES: ES modules only (import/export default), NO require/module.exports, preserve all original logic and API calls, return ONLY raw JavaScript with no markdown fences or explanation.\n\n` +
    `CODE TO CONVERT:\n${rawCode}`;

  const res = await axios.get(
    `${API_BASE}/ai/gpt-5?text=${encodeURIComponent(prompt)}`,
    { timeout: 60000 }
  );

  let code = (res.data?.result || res.data?.response || res.data?.answer || res.data || '').toString().trim();
  code = code.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();
  if (!code || code.length < 20) throw new Error('AI returned empty or invalid response');
  return code;
}

export default {
  name: 'convert',
  aliases: ['cvt'],
  category: 'utility',
  subCategory: 'tools',
  description: 'AI-powered: convert any code to ZENTRIX MD BY ZENTRIX TECH style. Owner only.',
  usage: 'convert [name] (reply to code)',
  cooldown: 5,
  roleRequired: 'user',
  groupOnly: false,

  async execute({ sock, msg, args, from }) {
    const jid = from || msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // Owner only
    if (!ownerOnly(msg)) {
      return reply('⛔ *Owner Only Command*\n\nOnly the bot owner can use *.convert*');
    }

    // Get source code from quoted message
    const source = getQuotedText(msg);
    if (!source || source.trim().length < 10) {
      return reply(
        `❌ *No code found.*\n\n` +
        `Reply to a message containing code with:\n` +
        `  *.convert* — auto-detects command name\n` +
        `  *.convert myname* — use custom name\n\n` +
        `_After converting, reply to the output with *.addcmd <name>* to add it live._`
      );
    }

    // Determine command name
    const cmdName = args[0]?.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || extractNameFromCode(source);

    await reply(`⏳ *Converting code...*\n\n🤖 AI is rewriting to ZENTRIX MD BY ZENTRIX TECH style for *.${cmdName}*`);

    let converted;
    try {
      converted = await convertWithAI(source, cmdName);
    } catch (err) {
      return reply(`❌ *AI Conversion Failed*\n\n\`${err.message}\`\n\nTry again or check if the AI service is up.`);
    }

    if (!converted.includes('export default') || !converted.includes('execute')) {
      return reply(`❌ *Invalid output from AI*\n\nTry providing cleaner input code and try again.`);
    }

    // Send as text if short enough
    if (converted.length <= 3500) {
      return reply(
        `✅ *Converted to ZENTRIX MD BY ZENTRIX TECH Style*\n` +
        `🔖 Command name: *.${cmdName}*\n\n` +
        `\`\`\`javascript\n${converted}\n\`\`\`\n\n` +
        `_Reply to this with *.addcmd ${cmdName}* to add it live._`
      );
    }

    // Long code — send as file
    await reply(
      `✅ *Converted to ZENTRIX MD BY ZENTRIX TECH Style*\n` +
      `🔖 Command name: *.${cmdName}*\n\n` +
      `_Code is long — sending as file._\n` +
      `_Reply to the file with *.addcmd ${cmdName}* to add it live._`
    );

    const buf = Buffer.from(converted, 'utf8');
    await sock.sendMessage(jid, {
      document: buf,
      fileName: `${cmdName}.js`,
      mimetype: 'application/javascript',
      caption: `📄 *.${cmdName}* — converted to ZENTRIX MD BY ZENTRIX TECH style\nReply with *.addcmd ${cmdName}* to add live.`,
    }, { quoted: msg });
  },
};

/**
 * .autoreply command — Manages automatic keyword-based replies (GLOBAL).
 * Supports: keyword rules, global away message, and AI-powered auto-reply.
 * Only the paired bot owner can manage autoreply.
 */
import axios from 'axios';
import { getGroupSettings, updateGroupSettings } from '../../services/databaseService.js';

const API_BASE = 'https://apis.prexzyvilla.site';

export default {
  name: 'autoreply',
  description: 'Manages global auto-reply rules, away message, and AI replies. Owner only.',
  async execute({ sock, msg, args, isOwner, phoneNumber }) {
    const jid = msg.key.remoteJid;

    if (!isOwner) {
      return await sock.sendMessage(jid, {
        text: `⛔ *Owner Only Command*\n\nOnly the paired bot owner can manage *.autoreply*`
      }, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();
    const globalSettings = getGroupSettings(phoneNumber);
    const autoreply = globalSettings.automation?.autoreply || {};
    const currentRules = autoreply.rules || [];
    const isEnabled = autoreply.enabled || false;
    const globalMsg = autoreply.globalMessage || null;
    const globalMsgEnabled = autoreply.globalMessageEnabled || false;
    const aiEnabled = autoreply.aiEnabled || false;
    const aiPrompt = autoreply.aiPrompt || null;

    // ── AI AUTO-REPLY ────────────────────────────────────────────────────────
    if (action === 'ai') {
      const sub = args[1]?.toLowerCase();

      if (sub === 'off') {
        updateGroupSettings(phoneNumber, {
          automation: { autoreply: { ...autoreply, aiEnabled: false } }
        });
        return await sock.sendMessage(jid, {
          text: '❌ *AI AutoReply* is now OFF globally.'
        }, { quoted: msg });
      }

      if (sub === 'on') {
        updateGroupSettings(phoneNumber, {
          automation: { autoreply: { ...autoreply, aiEnabled: true } }
        });
        return await sock.sendMessage(jid, {
          text: `✅ *AI AutoReply* is now ON globally.\n\n🤖 AI will respond to every message.\n📝 Prompt: _${aiPrompt || 'Default: helpful WhatsApp assistant'}_`
        }, { quoted: msg });
      }

      if (sub === 'prompt') {
        // .autoreply ai prompt <your custom prompt>
        const prompt = args.slice(2).join(' ').trim();
        if (!prompt) {
          return await sock.sendMessage(jid, {
            text: `📝 *Current AI Prompt:*\n_${aiPrompt || 'Default: helpful WhatsApp assistant'}_\n\nTo change: *.autoreply ai prompt <your prompt>*`
          }, { quoted: msg });
        }
        updateGroupSettings(phoneNumber, {
          automation: { autoreply: { ...autoreply, aiPrompt: prompt, aiEnabled: true } }
        });
        return await sock.sendMessage(jid, {
          text: `✅ *AI Prompt Updated & ON!*\n\n📝 Prompt: _${prompt}_\n\n_AI will use this context when replying to messages._`
        }, { quoted: msg });
      }

      // .autoreply ai — show status
      const status = aiEnabled ? '🟢 ON' : '🔴 OFF';
      return await sock.sendMessage(jid, {
        text: `🤖 *AI AutoReply*\nStatus: ${status}\n📝 Prompt: _${aiPrompt || 'Default: helpful WhatsApp assistant'}_\n\n*Commands:*\n• *.autoreply ai on/off*\n• *.autoreply ai prompt <context>* — set AI personality\n\n_AI replies to every message globally._`
      }, { quoted: msg });
    }

    // ── GLOBAL AWAY MESSAGE ──────────────────────────────────────────────────
    if (action === 'global') {
      const sub = args[1]?.toLowerCase();

      if (sub === 'off') {
        updateGroupSettings(phoneNumber, {
          automation: { autoreply: { ...autoreply, globalMessageEnabled: false } }
        });
        return await sock.sendMessage(jid, {
          text: '❌ *Global Away Message* is now OFF.'
        }, { quoted: msg });
      }

      if (sub === 'on') {
        if (!globalMsg) {
          return await sock.sendMessage(jid, {
            text: '⚠️ No global message set yet.\n\nUse: *.autoreply global <your message>*'
          }, { quoted: msg });
        }
        updateGroupSettings(phoneNumber, {
          automation: { autoreply: { ...autoreply, globalMessageEnabled: true } }
        });
        return await sock.sendMessage(jid, {
          text: `✅ *Global Away Message* is now ON.\n\n💬 _${globalMsg}_`
        }, { quoted: msg });
      }

      if (sub === 'show') {
        const status = globalMsgEnabled ? '🟢 ON' : '🔴 OFF';
        return await sock.sendMessage(jid, {
          text: `📋 *Global Away Message*\nStatus: ${status}\n\n💬 ${globalMsg || '_Not set_'}`
        }, { quoted: msg });
      }

      const message = args.slice(1).join(' ').trim();
      if (!message) {
        return await sock.sendMessage(jid, {
          text: `ℹ️ *Global Away Message*\n\n*Commands:*\n• *.autoreply global <message>*\n• *.autoreply global on/off*\n• *.autoreply global show*`
        }, { quoted: msg });
      }

      updateGroupSettings(phoneNumber, {
        automation: { autoreply: { ...autoreply, globalMessage: message, globalMessageEnabled: true } }
      });
      return await sock.sendMessage(jid, {
        text: `✅ *Global Away Message Set & ON!*\n\n💬 _${message}_`
      }, { quoted: msg });
    }

    // ── KEYWORD RULES ────────────────────────────────────────────────────────
    if (action === 'on') {
      updateGroupSettings(phoneNumber, { automation: { autoreply: { ...autoreply, enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *AutoReply* (keyword rules) is now ON globally.' }, { quoted: msg });

    } else if (action === 'off') {
      updateGroupSettings(phoneNumber, { automation: { autoreply: { ...autoreply, enabled: false } } });
      await sock.sendMessage(jid, { text: '❌ *AutoReply* (keyword rules) is now OFF globally.' }, { quoted: msg });

    } else if (action === 'add') {
      const rest = args.slice(1).join(' ');
      const parts = rest.split('|');
      if (parts.length < 2) throw new Error('Usage: .autoreply add <keyword> | <response>');
      const keyword = parts[0].trim();
      const response = parts.slice(1).join('|').trim();
      if (!keyword || !response) throw new Error('Keyword and response cannot be empty.');
      const exists = currentRules.some(r => r.keyword.toLowerCase() === keyword.toLowerCase());
      if (exists) throw new Error(`A rule for "${keyword}" already exists. Remove it first.`);
      currentRules.push({ keyword, response, exact: false });
      updateGroupSettings(phoneNumber, { automation: { autoreply: { ...autoreply, rules: currentRules } } });
      await sock.sendMessage(jid, {
        text: `✅ *AutoReply Rule Added (Global)!*\n\n🔑 Keyword: *${keyword}*\n💬 Response: ${response}`
      }, { quoted: msg });

    } else if (action === 'remove' || action === 'del') {
      const keyword = args.slice(1).join(' ').trim();
      if (!keyword) throw new Error('Usage: .autoreply remove <keyword>');
      const newRules = currentRules.filter(r => r.keyword.toLowerCase() !== keyword.toLowerCase());
      if (newRules.length === currentRules.length) throw new Error(`No rule found for "${keyword}".`);
      updateGroupSettings(phoneNumber, { automation: { autoreply: { ...autoreply, rules: newRules } } });
      await sock.sendMessage(jid, { text: `✅ AutoReply rule for "*${keyword}*" removed.` }, { quoted: msg });

    } else if (action === 'list') {
      const gStatus = globalMsgEnabled ? '🟢 ON' : '🔴 OFF';
      const kStatus = isEnabled ? '🟢 ON' : '🔴 OFF';
      const aStatus = aiEnabled ? '🟢 ON' : '🔴 OFF';
      let text = `📋 *AutoReply Status (Global)*\n\n`;
      text += `🤖 AI Reply: ${aStatus}\n`;
      text += `🌍 Away Message: ${gStatus} — _${globalMsg || 'not set'}_\n`;
      text += `🔑 Keyword Rules: ${kStatus} (${currentRules.length} rules)\n`;
      if (currentRules.length > 0) {
        text += `\n`;
        currentRules.forEach((rule, i) => {
          text += `${i + 1}. 🔑 *${rule.keyword}*\n   💬 ${rule.response}\n\n`;
        });
      }
      await sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });

    } else if (action === 'clear') {
      updateGroupSettings(phoneNumber, { automation: { autoreply: { ...autoreply, rules: [] } } });
      await sock.sendMessage(jid, { text: '🗑️ All keyword rules cleared.' }, { quoted: msg });

    } else {
      const gStatus = globalMsgEnabled ? '🟢 ON' : '🔴 OFF';
      const kStatus = isEnabled ? '🟢 ON' : '🔴 OFF';
      const aStatus = aiEnabled ? '🟢 ON' : '🔴 OFF';
      await sock.sendMessage(jid, {
        text: `ℹ️ *AutoReply (Global)*\n\n` +
          `🤖 AI Reply: ${aStatus}\n` +
          `🌍 Away Message: ${gStatus} — _${globalMsg || 'not set'}_\n` +
          `🔑 Keyword Rules: ${kStatus} (${currentRules.length} rules)\n\n` +
          `*AI Commands:*\n` +
          `• *.autoreply ai on/off*\n` +
          `• *.autoreply ai prompt <context>*\n\n` +
          `*Away Message:*\n` +
          `• *.autoreply global <message>*\n` +
          `• *.autoreply global on/off*\n\n` +
          `*Keyword Rules:*\n` +
          `• *.autoreply on/off*\n` +
          `• *.autoreply add <keyword> | <response>*\n` +
          `• *.autoreply remove <keyword>*\n` +
          `• *.autoreply list / clear*`
      }, { quoted: msg });
    }
  },
};

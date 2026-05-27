/**
 * automationService.js — Centralized service for human-like automation behaviors.
 * FIXED:
 *  - autoType/autoRecord: must call presenceSubscribe(jid) before sendPresenceUpdate in DMs.
 *    Baileys 7.x silently drops presence updates if the chat is not subscribed first.
 *  - Added sock.user?.name guard — Baileys ignores sendPresenceUpdate if creds.me.name is unset.
 *  - Both features now work in DMs AND groups.
 */
import { getGroupSettings, getChatSettings } from './databaseService.js';
import { sleep, extractMessageText } from '../utils/helpers.js';
import axios from 'axios';
import logger from '../utils/logger.js';
import { downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys';
import { normalizeJidToNumber } from '../utils/helpers.js';

const MIN_TYPING_DELAY  = 500;
const MAX_TYPING_DELAY  = 2500;
const TYPING_SPEED_FACTOR = 80; // ms per 100 chars

const MIN_RECORDING_DELAY = 1000;
const MAX_RECORDING_DELAY = 3000;

const MIN_READ_DELAY  = 800;
const MAX_READ_DELAY  = 2500;
const READ_SPEED_FACTOR = 50;

/**
 * Ensures presence subscription for a JID (required in Baileys 7.x for DMs).
 * Groups handle this differently — presenceSubscribe on a group JID can throw.
 */
async function ensurePresenceSubscribed(sock, jid) {
  try {
    const isGroup = jid.endsWith('@g.us');
    // For DMs, presenceSubscribe is required before sendPresenceUpdate will work.
    // For groups, WhatsApp automatically sees composing/recording — no subscribe needed.
    if (!isGroup && typeof sock.presenceSubscribe === 'function') {
      await sock.presenceSubscribe(jid);
    }
  } catch (e) {
    // Non-fatal — just means presence may not show
    logger.warn(`[Automation] presenceSubscribe failed for ${jid}: ${e.message}`);
  }
}

class AutomationService {

  /**
   * Simulates human-like typing presence before a message is sent.
   * Works in both DMs and groups.
   */
  async autoType(sock, jid, messageContent) {
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const globalSettings = getGroupSettings(botNumber);
    const chatSettings = getChatSettings(botNumber, jid);
    
    const isEnabled = globalSettings.automation?.autotype?.enabled || chatSettings.automation?.autotype?.enabled;
    if (!isEnabled) return;

    // Baileys 7.x: silently drops sendPresenceUpdate if sock.user.name is not set yet.
    if (!sock.user?.id) return;

    const messageLength = messageContent?.length || 50;
    const base = Math.min(messageLength * TYPING_SPEED_FACTOR / 100, MAX_TYPING_DELAY);
    const delay = Math.floor(base + Math.random() * (MAX_TYPING_DELAY - MIN_TYPING_DELAY));

    try {
      await ensurePresenceSubscribed(sock, jid);
      await sock.sendPresenceUpdate('composing', jid);
      await sleep(delay);
      await sock.sendPresenceUpdate('available', jid);
    } catch (error) {
      logger.warn(`[AutoType] Failed for ${jid}: ${error.message}`);
    }
  }

  /**
   * Simulates voice recording presence.
   * Works in both DMs and groups.
   */
  async autoRecord(sock, jid) {
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const globalSettings = getGroupSettings(botNumber);
    const chatSettings = getChatSettings(botNumber, jid);
    
    const isEnabled = globalSettings.automation?.autorecord?.enabled || chatSettings.automation?.autorecord?.enabled;
    if (!isEnabled) return;

    if (!sock.user?.id) return;

    // 90% chance per message — keeps it feeling human
    if (Math.random() > 0.9) return;

    const delay = Math.floor(MIN_RECORDING_DELAY + Math.random() * (MAX_RECORDING_DELAY - MIN_RECORDING_DELAY));

    try {
      await ensurePresenceSubscribed(sock, jid);
      await sock.sendPresenceUpdate('recording', jid);
      await sleep(delay);
      await sock.sendPresenceUpdate('available', jid);
    } catch (error) {
      logger.warn(`[AutoRecord] Failed for ${jid}: ${error.message}`);
    }
  }


  /**
   * Keyword-based auto-reply.
   * FIX 1: In GROUP chats — only fires when the bot is tagged/mentioned.
   * FIX 2: AI replies via OpenAI ChatGPT API (replaces broken prexzyvilla endpoint).
   */
  async autoReply(sock, msg, jid) {
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const globalSettings = getGroupSettings(botNumber);
    const autoreply = globalSettings.automation?.autoreply || {};

    const isEnabled = autoreply.enabled;
    const globalMsgEnabled = autoreply.globalMessageEnabled;
    const globalMessage = autoreply.globalMessage;
    const aiEnabled = autoreply.aiEnabled;
    const aiPrompt = autoreply.aiPrompt;

    if (!isEnabled && !globalMsgEnabled && !aiEnabled) return;

    const messageText = extractMessageText(msg);
    if (!messageText) return;

    // Skip own messages
    if (msg.key.fromMe) return;

    // ── GROUP CHECK: only reply when bot is tagged/mentioned ──────────────
    const isGroup = jid.endsWith('@g.us');
    if (isGroup) {
      const contextInfo =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo ||
        msg.message?.documentMessage?.contextInfo ||
        {};
      const mentionedJids = contextInfo?.mentionedJid || [];
      const isBotMentioned = mentionedJids.some(j => j.split('@')[0] === botNumber);
      if (!isBotMentioned) return; // Not tagged — skip autoreply in groups
    }

    // ── Global away message ───────────────────────────────────────────────
    if (globalMsgEnabled && globalMessage) {
      await sleep(800 + Math.random() * 1500);
      try {
        await sock.sendMessage(jid, { text: globalMessage }, { quoted: msg });
        logger.info(`[AutoReply] Global message sent in ${jid}`);
      } catch (error) {
        logger.error(`[AutoReply] Global message failed in ${jid}: ${error.message}`);
      }
    }

    // ── AI auto-reply via prexzyvilla ────────────────────────────────────
    if (aiEnabled) {
      await sleep(1000 + Math.random() * 2000);
      try {
        const systemContext = aiPrompt ||
          'You are ZENTRIX MD AI, a smart and friendly WhatsApp assistant created by ZENTRIX MD BY ZENTRIX TECH. Reply naturally and concisely.';
        const prompt = `${systemContext}\n\nMessage received: "${messageText}"\n\nReply naturally and briefly.`;
        const endpoints = [
          `https://apis.prexzyvilla.site/ai/gpt-5?text=`,
          `https://apis.prexzyvilla.site/ai/gpt4?text=`,
          `https://apis.prexzyvilla.site/ai/chatbot?text=`,
        ];
        let aiResponse = '';
        for (const endpoint of endpoints) {
          try {
            const res = await axios.get(endpoint + encodeURIComponent(prompt), { timeout: 30000 });
            aiResponse = (res.data?.text || res.data?.result || res.data?.response || '').toString().trim();
            if (aiResponse) break;
          } catch (e) {
            logger.warn(`[AutoReply] AI endpoint failed: ${endpoint} — ${e.message}`);
          }
        }
        if (aiResponse) {
          await sock.sendMessage(jid, { text: aiResponse }, { quoted: msg });
          logger.info(`[AutoReply] AI replied in ${jid}`);
        }
      } catch (error) {
        logger.error(`[AutoReply] AI reply failed in ${jid}: ${error.message}`);
      }
      // Don't return — keyword rules can still fire too
    }

    // ── Keyword rules ─────────────────────────────────────────────────────
    if (!isEnabled) return;

    const rules = autoreply.rules || [];
    const lowerText = messageText.toLowerCase();

    for (const rule of rules) {
      const keyword = (rule.keyword || '').toLowerCase();
      if (!keyword) continue;

      const matches = rule.exact ? lowerText === keyword : lowerText.includes(keyword);

      if (matches) {
        await sleep(800 + Math.random() * 1500);
        try {
          await sock.sendMessage(jid, { text: rule.response }, { quoted: msg });
          logger.info(`[AutoReply] Replied to "${keyword}" in ${jid}`);
        } catch (error) {
          logger.error(`[AutoReply] Failed in ${jid}: ${error.message}`);
        }
        return;
      }
    }
  }
  /**
   * Marks messages as read (blue ticks) and silently captures view-once media.
   */
  async autoView(sock, msg, jid, botNumber, ownerNumber) {
    const globalSettings = getGroupSettings(botNumber);
    const chatSettings = getChatSettings(botNumber, jid);
    
    const isEnabled = globalSettings.automation?.autoview?.enabled || chatSettings.automation?.autoview?.enabled;
    if (!isEnabled) return;

    const messageText = extractMessageText(msg);
    const messageLength = messageText?.length || 0;
    const base = Math.min(messageLength * READ_SPEED_FACTOR / 100, MAX_READ_DELAY);
    const delay = Math.floor(base + Math.random() * (MAX_READ_DELAY - MIN_READ_DELAY));

    await sleep(delay);

    try {
      await sock.readMessages([msg.key]);
      logger.info(`[AutoView] Marked read in ${jid}`);

      const contentType = getContentType(msg.message);
      const isViewOnce = !!(
        msg.message?.viewOnceMessage ||
        msg.message?.viewOnceMessageV2 ||
        msg.message?.viewOnceMessageV2Extension
      );

      if (isViewOnce && contentType) {
        const mediaType = msg.message?.imageMessage ? 'image' : msg.message?.videoMessage ? 'video' : null;
        if (mediaType) {
          const mediaMessage = msg.message[contentType];
          const caption = mediaMessage?.caption || '';

          const stream = await downloadContentFromMessage(mediaMessage, mediaType);
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);

          // Per-session owner routing
          const sessionOwnerJid = botNumber + '@s.whatsapp.net';
          await sock.sendMessage(sessionOwnerJid, {
            [mediaType]: buffer,
            caption: `*ZENTRIX MD AutoView (Silent Capture)*\n\n*From:* ${jid}\n*Sender:* ${normalizeJidToNumber(msg.key.participant || jid, sock)}\n*Type:* ${mediaType}${caption ? `\n*Caption:* ${caption}` : ''}`,
          });
        }
      }
    } catch (error) {
      logger.error(`[AutoView] Failed in ${jid}: ${error.message}`);
    }
  }
}

export const automationService = new AutomationService();
export default automationService;

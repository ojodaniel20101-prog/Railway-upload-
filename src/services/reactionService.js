/**
 * reactionService.js — AI-powered human-like message reaction system v3.2
 * ZENTRIX MD BY ZENTRIX TECH | Forged by UNKNOWN DEV
 *
 * FIXED:
 *  - Shorter, faster AI prompt (fits in 4s timeout reliably)
 *  - Anti-repeat logic properly avoids same emoji
 *  - Fallback emotion covers more keywords
 *  - Groups: reacts to all messages when ON (random chance), always reacts when tagged
 */
import axios from 'axios';
import logger from '../utils/logger.js';
import { extractMessageText, normalizeJidToNumber, sleep } from '../utils/helpers.js';
import { getGroupSettings, getChatSettings } from './databaseService.js';

// Track last 3 emojis per chat to avoid repetition
const recentEmojis = {}; // { [jid]: string[] }

function trackEmoji(jid, emoji) {
  if (!recentEmojis[jid]) recentEmojis[jid] = [];
  recentEmojis[jid].push(emoji);
  if (recentEmojis[jid].length > 3) recentEmojis[jid].shift();
}

function wasRecentlyUsed(jid, emoji) {
  return (recentEmojis[jid] || []).includes(emoji);
}

/**
 * Short, fast prompt — asks AI for a single emoji only.
 */
function buildReactionPrompt(message, mode) {
  const modeHints = {
    genz:      'chaotic/funny (💀😂🔥😭)',
    calm:      'minimal/simple (🙂👍🤔)',
    hype:      'energetic (🔥🚀💯😤)',
    sarcastic: 'ironic (😒🙄💀)'
  };
  const hint = modeHints[mode] || modeHints.genz;
  return `React to this WhatsApp message with ONE emoji only. Style: ${hint}. If not worth reacting to, reply: null. Message: "${message.slice(0, 120)}"`;
}

/**
 * Ask prexzyvilla AI for a single emoji reaction.
 */
async function getAIReaction(message, mode) {
  const prompt = buildReactionPrompt(message, mode);
  const endpoints = [
    { url: 'https://apis.prexzyvilla.site/ai/gpt-5?text=',   extract: r => r.text },
    { url: 'https://apis.prexzyvilla.site/ai/chatbot?text=', extract: r => r.text || r.response },
  ];

  for (const api of endpoints) {
    try {
      const res = await axios.get(api.url + encodeURIComponent(prompt), { timeout: 4000 });
      const output = api.extract(res.data)?.trim();
      if (!output) continue;
      if (output.toLowerCase().includes('null')) return null;
      const match = output.match(/\p{Emoji}/u);
      if (match) return match[0];
    } catch (_) { continue; }
  }
  return null;
}

/**
 * Fast local emotion detection fallback.
 */
function quickEmotion(text) {
  const t = text.toLowerCase();
  if (/haha|lol|funny|joke|😂|💀/.test(t))                         return 'funny';
  if (/wow|amazing|great|cool|fire|🔥|lit/.test(t))                return 'excited';
  if (/thank|thanks|appreciate/.test(t))                           return 'thanks';
  if (/sad|cry|unhappy|sorry|miss|💔/.test(t))                     return 'sad';
  if (/angry|mad|hate|annoyed|frustrated/.test(t))                 return 'angry';
  if (/code|bug|error|fix|programming|dev/.test(t))                return 'coding';
  if (/\?|how|what|why|when|where|who/.test(t))                    return 'question';
  if (/love|heart|cute|beautiful|❤|😍/.test(t))                   return 'love';
  if (/good morning|gm|good night|gn|hello|hi|hey/.test(t))       return 'greeting';
  if (/congrats|well done|nice|perfect|great job/.test(t))         return 'success';
  return 'neutral';
}

function getFallbackEmoji(emotion, jid) {
  const pools = {
    funny:    ['😂', '🤣', '💀', '😭', '🫠'],
    excited:  ['🔥', '🤩', '🚀', '💯', '😤'],
    thanks:   ['🙏', '❤️', '😇', '✨', '💖'],
    sad:      ['😢', '😔', '💔', '🫂', '😞'],
    angry:    ['😤', '😠', '🙄', '😒', '💢'],
    coding:   ['💻', '🧠', '⚙️', '🚀', '🛠️'],
    question: ['🤔', '🧐', '❓', '👀', '💭'],
    love:     ['❤️', '😍', '🥰', '✨', '💕'],
    greeting: ['👋', '😊', '✨', '🙌', '💫'],
    success:  ['✅', '🎉', '🥳', '👏', '💯'],
    neutral:  ['👍', '🙂', '👀', '✨', '💬'],
  };

  const list = pools[emotion] || pools.neutral;
  // Filter out recently used emojis in this chat
  const available = list.filter(e => !wasRecentlyUsed(jid, e));
  const pool = available.length > 0 ? available : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Main entry point — called from messageHandler.
 */
export async function processReaction(sock, msg, jid, isGroup, botNumber) {
  if (msg.key.fromMe) return;

  const messageText = extractMessageText(msg);
  if (!messageText) return;

  const globalSettings = getGroupSettings(botNumber);
  const chatSettings   = getChatSettings(botNumber, jid);

  const autoreactEnabled = globalSettings.automation?.autoreact?.enabled || chatSettings.automation?.autoreact?.enabled;
  if (!autoreactEnabled) return;

  const reactionMode = chatSettings.automation?.autoreact?.mode || globalSettings.automation?.autoreact?.mode || 'genz';

  // Check if bot is mentioned or message is a reply to bot
  const contextInfo  = msg.message?.extendedTextMessage?.contextInfo || {};
  const mentionedJids = contextInfo.mentionedJid || [];
  const isMentioned  = mentionedJids.some(j => j.split('@')[0] === botNumber);
  const isReplyToBot = normalizeJidToNumber(contextInfo.participant, sock) === botNumber;
  const isTagged     = isMentioned || isReplyToBot;

  // Probability: always react when tagged, random chance otherwise
  if (!isTagged) {
    const chance = isGroup ? 0.35 : 0.65;
    if (Math.random() > chance) return;
  }

  // Human-like delay
  await sleep(600 + Math.random() * 1800);

  // Try AI first, fallback to local emotion detection
  let emoji = await getAIReaction(messageText, reactionMode);

  // If AI failed or returned a recently used emoji, use fallback
  if (!emoji || wasRecentlyUsed(jid, emoji)) {
    const emotion = quickEmotion(messageText);
    emoji = getFallbackEmoji(emotion, jid);
  }

  try {
    await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
    trackEmoji(jid, emoji);
    logger.info(`[ReactionService] Reacted ${emoji} in ${jid}`);
  } catch (e) {
    logger.error(`[ReactionService] Failed to react in ${jid}: ${e.message}`);
  }
}

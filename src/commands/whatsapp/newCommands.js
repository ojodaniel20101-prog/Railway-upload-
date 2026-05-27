/**
 * newCommands.js — Additional utility and fun commands for ZENTRIX MD BY ZENTRIX TECH.
 * Implements .character, .groupinfo, .idch, .translate.
 */

import axios from 'axios';
import { normalizeJidToNumber, applyFont } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

export const characterCommand = {
  name: 'character',
  description: 'Analyze a user\'s character based on their profile and messages.',
  usage: '.character [@mention|reply]',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    let targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant || 
                    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                    msg.key.remoteJid;

    if (targetJid.endsWith('@g.us')) targetJid = msg.key.participant || msg.key.remoteJid;

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔍', key: msg.key } });

    try {
      const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => 'https://files.catbox.moe/lgpi82.jpeg');
      const status = await sock.fetchStatus(targetJid).catch(() => ({ status: 'No description available' }));
      const pushName = msg.pushName || 'User';
      
      const prompt = `Analyze the character of a WhatsApp user named "${pushName}" with the following profile description: "${status.status}". Based on this, provide a creative, funny, and professional character analysis including: Personality Type, Strengths, Weaknesses, and a "Vibe" rating.`;
      
      const { data } = await axios.get(`https://apis.prexzyvilla.site/ai/gpt-5?text=${encodeURIComponent(prompt)}`);
      const analysis = data.text || 'Unable to analyze character at this time.';

      const response = `🎭 *CHARACTER ANALYSIS* 🎭\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `👤 *Target:* @${normalizeJidToNumber(targetJid, sock)}\n` +
                       `📝 *About:* ${status.status}\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       `${applyFont(analysis, 'mono')}`;

      await sock.sendMessage(msg.key.remoteJid, { 
        image: { url: ppUrl }, 
        caption: response,
        mentions: [targetJid]
      }, { quoted: msg });
    } catch (error) {
      logger.error('[CharacterCommand] Error:', error);
      throw new Error('Failed to analyze character.');
    }
  }
};

export const groupInfoCommand = {
  name: 'groupinfo',
  description: 'Get detailed information about the current group.',
  usage: '.groupinfo',
  category: 'utility',
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) throw new Error('This command can only be used in groups.');

    const metadata = await sock.groupMetadata(jid);
    const participants = metadata.participants;
    const admins = participants.filter(p => p.admin).length;
    const owner = metadata.owner || 'Unknown';

    const info = `🏢 *GROUP INFORMATION* 🏢\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `📝 *Name:* ${metadata.subject}\n` +
                 `🆔 *ID:* ${metadata.id}\n` +
                 `👑 *Owner:* @${normalizeJidToNumber(owner, sock)}\n` +
                 `👥 *Members:* ${participants.length}\n` +
                 `👮 *Admins:* ${admins}\n` +
                 `📅 *Created:* ${new Date(metadata.creation * 1000).toLocaleDateString()}\n` +
                 `🔒 *Edit Settings:* ${metadata.restrict ? 'Admins Only' : 'Everyone'}\n` +
                 `💬 *Send Messages:* ${metadata.announce ? 'Admins Only' : 'Everyone'}\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `📜 *Description:*\n${metadata.desc || 'No description set.'}`;

    const ppUrl = await sock.profilePictureUrl(jid, 'image').catch(() => 'https://files.catbox.moe/lgpi82.jpeg');

    await sock.sendMessage(jid, { 
      image: { url: ppUrl }, 
      caption: info,
      mentions: [owner]
    }, { quoted: msg });
  }
};

export const idchCommand = {
  name: 'idch',
  description: 'Get metadata for a WhatsApp Channel/Newsletter via link.',
  usage: '.idch [link]',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const link = args[0];
    if (!link || !link.includes('whatsapp.com/channel/')) throw new Error('Please provide a valid WhatsApp Channel link.');

    const inviteCode = link.split('/').pop();
    
    try {
      const metadata = await sock.newsletterMetadata('invite', inviteCode);
      
      const response = `📢 *CHANNEL INFORMATION* 📢\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `🆔 *ID:* ${metadata.id}\n` +
                       `📝 *Name:* ${metadata.name}\n` +
                       `👥 *Followers:* ${metadata.subscribers || 'Unknown'}\n` +
                       `✅ *Verified:* ${metadata.verification === 'VERIFIED' ? 'Verified' : 'Not Verified'}\n` +
                       `🛡️ *Status:* ${metadata.state || 'ACTIVE'}\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `🔗 *Link:* ${link}`;

      await sock.sendMessage(msg.key.remoteJid, { text: response }, { quoted: msg });
    } catch (error) {
      logger.error('[IdchCommand] Error:', error);
      throw new Error('Failed to fetch channel metadata. Ensure the link is correct.');
    }
  }
};

export const translateCommand = {
  name: 'translate',
  description: 'Translate text to a specific language.',
  usage: '.translate [lang_code] [text]',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const targetLang = args[0];
    const text = args.slice(1).join(' ') || (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation);

    if (!targetLang || !text) throw new Error('Usage: .translate [lang_code] [text/reply]');

    try {
      const { data } = await axios.get(`https://api.popcat.xyz/translate?to=${targetLang}&text=${encodeURIComponent(text)}`);
      
      const response = `🌐 *TRANSLATION* 🌐\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `📥 *Input:* ${text}\n` +
                       `📤 *Result (${targetLang}):* ${data.translated}\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(msg.key.remoteJid, { text: response }, { quoted: msg });
    } catch (error) {
      logger.error('[TranslateCommand] Error:', error);
      throw new Error('Translation failed. Check the language code (e.g., en, fr, es).');
    }
  }
};

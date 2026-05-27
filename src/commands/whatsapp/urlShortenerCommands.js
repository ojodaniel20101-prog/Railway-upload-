/**
 * urlShortenerCommands.js — URL shortening commands for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.prexzyvilla.site
 */
import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * Generic URL shortener handler
 */
async function shortenUrl(sock, msg, args, endpoint, providerName) {
  const jid = msg.key.remoteJid;
  const url = args[0];
  const customName = args[1] || '';

  if (!url) {
    throw new Error(`Usage: .${endpoint} <url> [custom_name]\nExample: .${endpoint} https://google.com mylink`);
  }

  // Basic URL validation
  if (!url.startsWith('http')) {
    throw new Error('Please provide a valid URL starting with http:// or https://');
  }

  // React to indicate processing
  await sock.sendMessage(jid, { react: { text: '🔗', key: msg.key } });

  try {
    let apiUrl = `https://apis.prexzyvilla.site/tools/${endpoint}?url=${encodeURIComponent(url)}`;
    if (customName) {
      apiUrl += `&custom_name=${encodeURIComponent(customName)}`;
    }
    
    const response = await axios.get(apiUrl, { timeout: 20000 });
    const data = response.data;

    if (data.status) {
      const result = `✨ *URL Shortener*\n\n🔗 *Original:* ${data.original_url}\n🚀 *Shortened:* ${data.short_url}\n🏢 *Provider:* ${data.provider}\n🛡️ *Status:* SECURE`;
      
      await sock.sendMessage(jid, { text: result }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
    } else {
      throw new Error(data.error || 'Failed to shorten URL.');
    }

  } catch (error) {
    logger.error(`[UrlShortener] Error in ${providerName}:`, error.message);
    
    let errorMessage = `❌ *Shortening Failed*\n\nReason: ${error.message}`;
    if (error.code === 'ECONNABORTED') {
      errorMessage = `❌ *Shortening Timeout*\n\nThe API took too long to respond. Please try again later.`;
    }

    await sock.sendMessage(jid, { text: errorMessage }, { quoted: msg });
    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
  }
}

// Exported commands
export const dagdCommand = {
  name: 'dagd',
  description: 'Shorten URL using da.gd service.',
  execute: async ({ sock, msg, args }) => shortenUrl(sock, msg, args, 'dagd', 'da.gd'),
};

export const vgdCommand = {
  name: 'vgd',
  description: 'Shorten URL using v.gd service.',
  execute: async ({ sock, msg, args }) => shortenUrl(sock, msg, args, 'vgd', 'v.gd'),
};

export const tinubeCommand = {
  name: 'tinube',
  description: 'Shorten URL using tinu.be service.',
  execute: async ({ sock, msg, args }) => shortenUrl(sock, msg, args, 'tinube', 'tinu.be'),
};

export const spooMeCommand = {
  name: 'spoome',
  description: 'Shorten URL using Spoo.me service.',
  execute: async ({ sock, msg, args }) => shortenUrl(sock, msg, args, 'spooMe', 'Spoo.me'),
};

export const spooEmojiCommand = {
  name: 'spooemoji',
  description: 'Shorten URL with emojis using Spoo.me.',
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    const url = args[0];
    const emojis = args[1] || '';

    if (!url) {
      throw new Error('Usage: .spooemoji <url> [emojis]\nExample: .spooemoji https://google.com 🔥🚀');
    }

    await sock.sendMessage(jid, { react: { text: '🔗', key: msg.key } });

    try {
      let apiUrl = `https://apis.prexzyvilla.site/tools/spooEmoji?url=${encodeURIComponent(url)}`;
      if (emojis) apiUrl += `&emojis=${encodeURIComponent(emojis)}`;
      
      const response = await axios.get(apiUrl, { timeout: 20000 });
      const data = response.data;

      if (data.status) {
        const result = `✨ *URL Shortener*\n\n🔗 *Original:* ${data.original_url}\n🚀 *Shortened:* ${data.short_url}\n🏢 *Provider:* Spoo.me Emoji\n🛡️ *Status:* SECURE`;
        await sock.sendMessage(jid, { text: result }, { quoted: msg });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
      } else {
        throw new Error(data.error || 'Failed to shorten URL.');
      }
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ *Shortening Failed*\n\nReason: ${error.message}` }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
  },
};

export const randomShortCommand = {
  name: 'randomshort',
  description: 'Shorten URL using random provider.',
  execute: async ({ sock, msg, args }) => shortenUrl(sock, msg, args, 'random', 'Random Shortener'),
};

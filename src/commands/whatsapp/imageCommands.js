/**
 * imageCommands.js — AI Image generation commands for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.prexzyvilla.site
 */
import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * Generic image generation handler
 */
async function generateImage(sock, msg, args, endpoint, styleName) {
  const jid = msg.key.remoteJid;
  const prompt = args.join(' ');

  if (!prompt) {
    throw new Error(`Usage: .${endpoint} <prompt>\nExample: .${endpoint} a futuristic city`);
  }

  // React to indicate processing
  await sock.sendMessage(jid, { react: { text: '🎨', key: msg.key } });

  try {
    const apiUrl = `https://apis.prexzyvilla.site/ai/${endpoint}?prompt=${encodeURIComponent(prompt)}&negative_prompt=`;
    
    // The API returns the image directly as a buffer or JSON on error
    const response = await axios.get(apiUrl, { 
      responseType: 'arraybuffer',
      timeout: 60000 // 60s timeout for image generation
    });

    const contentType = response.headers['content-type'] || '';

    // If the response is JSON, it's likely an error message
    if (contentType.includes('application/json')) {
      const errorData = JSON.parse(Buffer.from(response.data).toString('utf-8'));
      throw new Error(errorData.error || 'Failed to generate image. The service might be busy.');
    }

    // Send the image
    await sock.sendMessage(jid, {
      image: Buffer.from(response.data),
      caption: `🎨 *${styleName} Generation*\n\n✨ *Prompt:* ${prompt}\n🚀 *Engine:* ZENTRIX MD AI\n🛡️ *Status:* SECURE`
    }, { quoted: msg });

    // Success reaction
    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    logger.error(`[ImageCommand] Error in ${styleName}:`, error.message);
    
    let errorMessage = `❌ *Generation Failed*\n\nReason: ${error.message}`;
    if (error.code === 'ECONNABORTED') {
      errorMessage = `❌ *Generation Timeout*\n\nThe API took too long to respond. Please try again later.`;
    }

    await sock.sendMessage(jid, { text: errorMessage }, { quoted: msg });
    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
  }
}

// Exported commands
export const realisticCommand = {
  name: 'realistic',
  description: 'Generate realistic photographic images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'realistic', 'Realistic'),
};

export const animeCommand = {
  name: 'anime',
  description: 'Generate anime-style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'anime', 'Anime'),
};

export const fantasyCommand = {
  name: 'fantasy',
  description: 'Generate fantasy artistic images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'fantasy', 'Fantasy'),
};

export const cyberpunkCommand = {
  name: 'cyberpunk',
  description: 'Generate cyberpunk futuristic images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'cyberpunk', 'Cyberpunk'),
};

export const watercolorCommand = {
  name: 'watercolor',
  description: 'Generate watercolor painting style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'watercolor', 'Watercolor'),
};

export const oilpaintingCommand = {
  name: 'oil-painting',
  description: 'Generate oil painting style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'oil-painting', 'Oil Painting'),
};

export const pixelartCommand = {
  name: 'pixel-art',
  description: 'Generate pixel art style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'pixel-art', 'Pixel Art'),
};

export const sketchCommand = {
  name: 'sketch',
  description: 'Generate sketch drawing style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'sketch', 'Sketch'),
};

export const cartoonCommand = {
  name: 'cartoon',
  description: 'Generate cartoon style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'cartoon', 'Cartoon'),
};

export const abstractCommand = {
  name: 'abstract',
  description: 'Generate abstract art images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'abstract', 'Abstract'),
};

export const minimalistCommand = {
  name: 'minimalist',
  description: 'Generate minimalist style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'minimalist', 'Minimalist'),
};

export const surrealCommand = {
  name: 'surreal',
  description: 'Generate surreal abstract images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'surreal', 'Surreal'),
};

export const vintageCommand = {
  name: 'vintage',
  description: 'Generate vintage retro style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'vintage', 'Vintage'),
};

export const steampunkCommand = {
  name: 'steampunk',
  description: 'Generate steampunk style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'steampunk', 'Steampunk'),
};

export const horrorCommand = {
  name: 'horror',
  description: 'Generate horror dark style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'horror', 'Horror'),
};

export const scifiCommand = {
  name: 'sci-fi',
  description: 'Generate science fiction style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'sci-fi', 'Sci-Fi'),
};

export const popartCommand = {
  name: 'pop-art',
  description: 'Generate pop art style images.',
  execute: async ({ sock, msg, args }) => generateImage(sock, msg, args, 'pop-art', 'Pop Art'),
};

// ─── MEME COMMANDS (imagecreator endpoints) ───────────────────────────────────

const IMAGECREATOR_URL = 'https://apis.prexzyvilla.site/imagecreator';

export const spongebobCommand = {
  name: 'spongebob',
  description: 'Create SpongeBob "How dare you" brat meme.',
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return sock.sendMessage(jid, {
        text: '🧽 *Usage:* .spongebob <text>\n*Example:* .spongebob when you forget to charge your phone',
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: '🧽', key: msg.key } });

      const imageUrl = `${IMAGECREATOR_URL}/spongebob?text=${encodeURIComponent(text)}`;
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });

      await sock.sendMessage(jid, {
        image: Buffer.from(response.data),
        caption: `🧽 *SpongeBob Meme*\n\n📝 _${text}_`,
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      logger.error('[Spongebob] Error:', err.message);
      await sock.sendMessage(jid, { text: `❌ *Meme Error:* ${err.message}` }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
  },
};

export const memeCommand = {
  name: 'meme',
  description: 'Generate a meme with top and bottom text. Usage: .meme top | bottom',
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    const full = args.join(' ');
    const parts = full.split('|');
    const topText = parts[0]?.trim();
    const bottomText = parts[1]?.trim() || '';

    if (!topText) {
      return sock.sendMessage(jid, {
        text: '🎭 *Usage:* .meme <top text> | <bottom text>\n*Example:* .meme when the bot works | and nobody notices',
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: '🎭', key: msg.key } });

      const imageUrl = `${IMAGECREATOR_URL}/meme?topText=${encodeURIComponent(topText)}&bottomText=${encodeURIComponent(bottomText)}`;
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });

      await sock.sendMessage(jid, {
        image: Buffer.from(response.data),
        caption: `🎭 *Meme Generated*\n\n🔝 _${topText}_\n🔚 _${bottomText || 'none'}_`,
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      logger.error('[Meme] Error:', err.message);
      await sock.sendMessage(jid, { text: `❌ *Meme Error:* ${err.message}` }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
  },
};

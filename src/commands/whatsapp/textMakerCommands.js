/**
 * textMakerCommands.js — Text effect generation commands for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.prexzyvilla.site
 */
import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * Generic text effect generation handler
 */
async function generateTextEffect(sock, msg, args, endpoint, effectName) {
  const jid = msg.key.remoteJid;
  const text = args.join(' ');

  if (!text) {
    throw new Error(`Usage: .${endpoint} <text>\nExample: .${endpoint} ZENTRIX MD BY ZENTRIX TECH`);
  }

  // React to indicate processing
  await sock.sendMessage(jid, { react: { text: '✍️', key: msg.key } });

  try {
    const apiUrl = `https://apis.prexzyvilla.site/${endpoint}?text=${encodeURIComponent(text)}`;
    
    // The API returns the image directly as a buffer
    const response = await axios.get(apiUrl, { 
      responseType: 'arraybuffer',
      timeout: 45000 // 45s timeout
    });

    const contentType = response.headers['content-type'] || '';

    // If the response is JSON, it's likely an error message
    if (contentType.includes('application/json')) {
      const errorData = JSON.parse(Buffer.from(response.data).toString('utf-8'));
      throw new Error(errorData.error || 'Failed to generate effect. The service might be busy.');
    }

    // Send the image
    await sock.sendMessage(jid, {
      image: Buffer.from(response.data),
      caption: `✨ *Text Maker*\n\n🎨 *Effect:* ${effectName}\n📝 *Text:* ${text}\n🚀 *Engine:* ZENTRIX MD BY ZENTRIX TECH Maker\n🛡️ *Status:* SECURE`
    }, { quoted: msg });

    // Success reaction
    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    logger.error(`[TextMaker] Error in ${effectName}:`, error.message);
    
    let errorMessage = `❌ *Generation Failed*\n\nReason: ${error.message}`;
    if (error.code === 'ECONNABORTED') {
      errorMessage = `❌ *Generation Timeout*\n\nThe API took too long to respond. Please try again later.`;
    }

    await sock.sendMessage(jid, { text: errorMessage }, { quoted: msg });
    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
  }
}

// Exported commands
export const glitchTextCommand = {
  name: 'glitchtext',
  description: 'Create digital glitch text effects.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'glitchtext', 'Glitch Text'),
};

export const writeTextCommand = {
  name: 'writetext',
  description: 'Write text on wet glass effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'writetext', 'Wet Glass'),
};

export const advancedGlowCommand = {
  name: 'advancedglow',
  description: 'Advanced glow text effects.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'advancedglow', 'Advanced Glow'),
};

export const typographyTextCommand = {
  name: 'typographytext',
  description: 'Create typography text effect on pavement.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'typographytext', 'Typography'),
};

export const pixelGlitchCommand = {
  name: 'pixelglitch',
  description: 'Create pixel glitch text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'pixelglitch', 'Pixel Glitch'),
};

export const neonGlitchCommand = {
  name: 'neonglitch',
  description: 'Create impressive neon glitch text effects.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'neonglitch', 'Neon Glitch'),
};

export const flagTextCommand = {
  name: 'flagtext',
  description: 'Nigeria 3D flag text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'flagtext', 'Nigeria Flag'),
};

export const flag3dTextCommand = {
  name: 'flag3dtext',
  description: 'American flag 3D text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'flag3dtext', 'American Flag'),
};

export const deletingTextCommand = {
  name: 'deletingtext',
  description: 'Create eraser deleting text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'deletingtext', 'Deleting Text'),
};

export const blackpinkStyleCommand = {
  name: 'blackpinkstyle',
  description: 'Blackpink style logo maker effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'blackpinkstyle', 'Blackpink Style'),
};

export const glowingTextCommand = {
  name: 'glowingtext',
  description: 'Create glowing text effects.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'glowingtext', 'Glowing Text'),
};

export const underwaterTextCommand = {
  name: 'underwatertext',
  description: '3D underwater text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'underwatertext', 'Underwater'),
};

export const logoMakerCommand = {
  name: 'logomaker',
  description: 'Free bear logo maker.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'logomaker', 'Bear Logo'),
};

export const cartoonStyleCommand = {
  name: 'cartoonstyle',
  description: 'Create cartoon style graffiti text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'cartoonstyle', 'Cartoon Graffiti'),
};

export const paperCutStyleCommand = {
  name: 'papercutstyle',
  description: 'Multicolor 3D paper cut style text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'papercutstyle', 'Paper Cut'),
};

export const watercolorTextCommand = {
  name: 'watercolortext',
  description: 'Create a watercolor text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'watercolortext', 'Watercolor'),
};

export const effectCloudsCommand = {
  name: 'effectclouds',
  description: 'Write text effect clouds in the sky.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'effectclouds', 'Clouds'),
};

export const blackpinkLogoCommand = {
  name: 'blackpinklogo',
  description: 'Create Blackpink logo online.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'blackpinklogo', 'Blackpink Logo'),
};

export const gradientTextCommand = {
  name: 'gradienttext',
  description: 'Create 3D gradient text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'gradienttext', '3D Gradient'),
};

export const summerBeachCommand = {
  name: 'summerbeach',
  description: 'Write in sand summer beach.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'summerbeach', 'Summer Beach'),
};

export const luxuryGoldCommand = {
  name: 'luxurygold',
  description: 'Create a luxury gold text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'luxurygold', 'Luxury Gold'),
};

export const multicoloredNeonCommand = {
  name: 'multicoloredneon',
  description: 'Create multicolored neon light signatures.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'multicoloredneon', 'Multicolored Neon'),
};

export const sandSummerCommand = {
  name: 'sandsummer',
  description: 'Write in sand summer beach.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'sandsummer', 'Sand Summer'),
};

export const galaxyWallpaperCommand = {
  name: 'galaxywallpaper',
  description: 'Create galaxy wallpaper mobile.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'galaxywallpaper', 'Galaxy Wallpaper'),
};

export const style1917Command = {
  name: 'style1917',
  description: '1917 style text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'style1917', '1917 Style'),
};

export const makingNeonCommand = {
  name: 'makingneon',
  description: 'Making neon light text effect with galaxy style.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'makingneon', 'Galaxy Neon'),
};

export const royalTextCommand = {
  name: 'royaltext',
  description: 'Royal text effect online.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'royaltext', 'Royal Text'),
};

export const freeCreateCommand = {
  name: 'freecreate',
  description: 'Free create a 3D hologram text effect.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'freecreate', '3D Hologram'),
};

export const galaxyStyleCommand = {
  name: 'galaxystyle',
  description: 'Create galaxy style free name logo.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'galaxystyle', 'Galaxy Logo'),
};

export const lightEffectsCommand = {
  name: 'lighteffects',
  description: 'Create light effects green neon.',
  execute: async ({ sock, msg, args }) => generateTextEffect(sock, msg, args, 'lighteffects', 'Green Neon'),
};

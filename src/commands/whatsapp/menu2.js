/**
 * .menu2 command — Displays a carousel-style command menu.
 */

import { menuService } from '../../services/menuService.js';
import { commandRouter } from '../../handlers/commandRouter.js';
import { getPrefixForSession, getBotNameForSession, getFontForSession, getMenuImageForSession, getUserXpData } from '../../services/databaseService.js';
import { normalizeJidToNumber, applyFont } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';
import baileysPkg from '@whiskeysockets/baileys';
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = baileysPkg;

const CAT_HEADERS = menuService.CAT_HEADERS;
const CAT_ORDER = menuService.CAT_ORDER;

export default {
  name: 'menu2',
  description: 'Displays a carousel-style command menu.',
  category: 'general',
  subCategory: 'info',
  execute: async ({ sock, msg, isOwner, phoneNumber, userId: ctxUserId }) => {
    const jid = msg.key.remoteJid;
    const userId = ctxUserId || msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || 'User';

    let isAdmin = false;
    if (jid.endsWith('@g.us')) {
      try {
        const metadata = await sock.groupMetadata(jid);
        const participant = metadata.participants.find(p => p.id === userId);
        if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
          isAdmin = true;
        }
      } catch (e) { /* default to user */ }
    }

    await menuService.initialize();
    await commandRouter.loadCommands();
    const commandRegistry = commandRouter.getCommandRegistry();

    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix = getPrefixForSession(botNumber);
    const botName = getBotNameForSession(botNumber);
    const fontStyle = getFontForSession(botNumber);

    const categories = CAT_ORDER.filter(cat => {
      const cmdsInCat = commandRegistry.filter(cmd => cmd.category === cat);
      return cmdsInCat.length > 0;
    });

    // Default images for categories if specific ones aren't available
    const catImages = {
      general: "https://files.catbox.moe/4al1e6.jpg",
      owner: "https://files.catbox.moe/ruxjd3.jpg",
      admin: "https://files.catbox.moe/df7l8m.jpg",
      group: "https://files.catbox.moe/w6u1mh.jpg",
      media: "https://files.catbox.moe/qrhkwi.jpg",
      ai: "https://files.catbox.moe/8lb75p.jpg",
      tools: "https://files.catbox.moe/w6u1mh.jpg",
      fun: "https://files.catbox.moe/qrhkwi.jpg",
      download: "https://files.catbox.moe/qrhkwi.jpg",
    };

    try {
      const carouselCards = await Promise.all(
        categories.map(async (cat, index) => {
          const cmdsInCat = commandRegistry.filter(cmd => cmd.category === cat);
          const sortedCmds = cmdsInCat.sort((a, b) => a.name.localeCompare(b.name));
          
          let desc = `> ┏━━━━━━━━━━━━━━\n`;
          for (const cmd of sortedCmds.slice(0, 15)) { // Limit to 15 commands per card for readability
            desc += `> ┃༆ ${cmd.name}\n`;
          }
          if (sortedCmds.length > 15) {
            desc += `> ┃... and ${sortedCmds.length - 15} more\n`;
          }
          desc += `> ┗━━━━━━━━━━━━━━━─`;

          const imageUrl = catImages[cat] || "https://files.catbox.moe/4q9lsg.jpg";
          
          let imgField = {};
          try {
            imgField = await prepareWAMessageMedia(
              { image: { url: imageUrl } },
              { upload: sock.waUploadToServer }
            );
          } catch (e) {
            logger.warn(`[menu2] Failed to prepare image for category ${cat}: ${e.message}`);
          }

          return {
            header: proto.Message.InteractiveMessage.Header.fromObject({
              title: applyFont(CAT_HEADERS[cat] || cat.toUpperCase(), fontStyle),
              hasMediaAttachment: !!imgField.imageMessage,
              ...imgField,
            }),
            body: proto.Message.InteractiveMessage.Body.fromObject({
              text: desc
            }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({
              text: `Page ${index + 1} of ${categories.length}`
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "JOIN CHANNEL",
                    url: "https://whatsapp.com/channel/0029Vb65Ggl6RGJQrvOLKj36",
                    merchant_url: "https://whatsapp.com/channel/0029Vb65Ggl6RGJQrvOLKj36"
                  })
                }
              ]
            })
          };
        })
      );

      const interactiveMsg = await generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.fromObject({
                text: `*${applyFont(botName, fontStyle)}*\n\nSwipe ⬅️➡️ to explore all command categories!`
              }),
              footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: "𝚉𝙴𝙽𝚃𝚁𝙸𝚇 𝚃𝙴𝙲𝙷 ✦"
              }),
              carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                cards: carouselCards
              })
            }),
          }
        }
      }, { quoted: msg });

      await sock.relayMessage(jid, interactiveMsg.message, { messageId: interactiveMsg.key.id });

    } catch (e) {
      logger.error(`[menu2] Carousel message failed: ${e.message}`);
      await sock.sendMessage(jid, { text: "⚠️ Failed to load carousel menu. Please use .menu or .menu3 instead." }, { quoted: msg });
    }
  },
};

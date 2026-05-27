/**
 * .menu3 command — Displays a categorized command menu using interactive messages.
 */

import { menuService } from '../../services/menuService.js';
import { commandRouter } from '../../handlers/commandRouter.js';
import { getPrefixForSession, getBotNameForSession, getFontForSession, getMenuImageForSession, getUserXpData, getGlobalXpStore, setUserProfilePic, getUserLang, getCachedMenu, setCachedMenu } from '../../services/databaseService.js';
import { normalizeJidToNumber, applyFont } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';
import { sessionManager } from '../../core/sessionManager.js';
import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import baileysPkg from '@whiskeysockets/baileys';
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = baileysPkg;

const CAT_HEADERS = menuService.CAT_HEADERS; // Re-use category headers from menuService
const CAT_ORDER = menuService.CAT_ORDER;   // Re-use category order

export default {
  execute: async ({ sock, msg, isOwner, phoneNumber, userId: ctxUserId, args }) => {
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

    await menuService.initialize(); // Ensure menuService is initialized
    await commandRouter.loadCommands();
    const commandRegistry = commandRouter.getCommandRegistry();

    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix = getPrefixForSession(botNumber);
    const botName = getBotNameForSession(botNumber);
    const fontStyle = getFontForSession(botNumber);
    const menuImage = getMenuImageForSession(botNumber);

    const { level, currentXp, nextXp } = getUserXpData(userId, botNumber);
    const commandCount = getGlobalXpStore(userId, botNumber)?.commandCount || 0;

    let profilePicUrl = getUserXpData(userId, botNumber).profilePic || '';
    const isUserJid = userId && !userId.endsWith('@g.us') && !userId.endsWith('@newsletter') && !userId.includes('_');
    if (isUserJid) {
      try {
        const fresh = await sock.profilePictureUrl(userId, 'image');
        if (fresh) {
          profilePicUrl = fresh;
          setUserProfilePic(userId, botNumber, fresh);
        }
      } catch { /* use cached or none */ }
    }

    const role = menuService.getRole(isOwner, isAdmin);
    const uptime = menuService.formatUptime();
    const greeting = menuService.getGreeting();
    const display = (pushName || 'User').toUpperCase();

    const line28 = '─'.repeat(28);
    let profileBox = '';
    profileBox += `┌ 〔 *${applyFont(botName, fontStyle)}* 〕\n`;
    profileBox += `│ ⚡ ${applyFont(greeting, fontStyle)}\n`;
    profileBox += `│ 👤 USER: *${display}*\n`;
    profileBox += `│ 🧬 ROLE: ${applyFont(role, fontStyle)}\n`;
    profileBox += `│ 📊 LEVEL: ${level}\n`;
    profileBox += `│ 🎯 XP: ${currentXp} / ${nextXp}\n`;
    profileBox += `│ 🎮 COMMANDS USED: ${commandCount}\n`;
    profileBox += `│ ⏱️ UPTIME: ${uptime}\n`;
    profileBox += `│ 📅 ${menuService.getFormattedDate()}\n`;
    profileBox += `└${line28}┘\n\n`;

    const selectedCategory = args[0] ? args[0].toLowerCase() : null;

    if (!selectedCategory) {
      // Display categories
      const categories = CAT_ORDER.filter(cat => {
        const cmdsInCat = commandRegistry.filter(cmd => cmd.category === cat);
        return cmdsInCat.length > 0; // Only show categories with commands
      });

      const sections = [
        {
          title: 'COMMAND CATEGORIES',
          rows: categories.map(cat => ({
            title: CAT_HEADERS[cat] || cat.toUpperCase(),
            description: `View commands in ${cat} category`,
            id: `.menu3 ${cat}`,
          })),
        },
      ];

      // Prepare image buffer for proper proto serialization (same pattern as getbot.js)
      let imgField = {};
      if (menuImage) {
        try {
          const res = await axios.get(menuImage, { responseType: 'arraybuffer', timeout: 15000 });
          imgField = await prepareWAMessageMedia(
            { image: Buffer.from(res.data) },
            { upload: sock.waUploadToServer }
          );
        } catch (e) {
          logger.warn(`[menu3] Failed to prepare menu image: ${e.message}`);
        }
      }

      try {
        const interactiveMsg = await generateWAMessageFromContent(jid, {
          viewOnceMessage: {
            message: {
              messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                body: proto.Message.InteractiveMessage.Body.fromObject({
                  text: profileBox + `*Please select a command category:*\n\n`
                }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                  title: botName,
                  hasMediaAttachment: !!imgField.imageMessage,
                  ...imgField,
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                  buttons: [
                    {
                      name: "single_select",
                      buttonParamsJson: JSON.stringify({
                        title: "SELECT CATEGORY",
                        sections: sections,
                      })
                    }
                  ],
                }),
                contextInfo: {},
              }),
            }
          }
        }, { quoted: msg });

        await sock.relayMessage(jid, interactiveMsg.message, { messageId: interactiveMsg.key.id });
      } catch (e) {
        logger.warn(`[menu3] Interactive message failed, falling back: ${e.message}`);
        // Fallback: plain text category list
        const catList = categories.map(cat => `• ${CAT_HEADERS[cat] || cat.toUpperCase()}`).join('\n');
        await sock.sendMessage(jid, {
          text: profileBox + `*Command Categories:*\n\n${catList}\n\n_Type ${prefix}menu3 <category> to view commands_`
        }, { quoted: msg });
      }

    } else {
      // Display commands for the selected category
      const categoryCommands = commandRegistry.filter(cmd => cmd.category === selectedCategory);

      if (categoryCommands.length === 0) {
        await sock.sendMessage(jid, { text: `❌ No commands found for category: *${selectedCategory}*` }, { quoted: msg });
        return;
      }

      const categorizedCommands = categoryCommands.reduce((acc, cmd) => {
        const sub = cmd.subCategory || 'general';
        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(cmd);
        return acc;
      }, {});

      let commandListText = `┌ 〔 *${applyFont(CAT_HEADERS[selectedCategory] || selectedCategory.toUpperCase(), fontStyle)} COMMANDS* 〕\n`;

      for (const sub of Object.keys(categorizedCommands).sort()) {
        const label = menuService.SUB_LABELS[sub] || sub.charAt(0).toUpperCase() + sub.slice(1);
        commandListText += `├─ _${label}_\n`;

        const sorted = categorizedCommands[sub].sort((a, b) => a.name.localeCompare(b.name));
        for (const cmd of sorted) {
          let status = '';
          // Add status logic if needed (e.g., disabled commands, automation status)
          commandListText += `│  🔹 ${applyFont(prefix + cmd.name, fontStyle)}${status}\n`;
        }
      }
      commandListText += `└${line28}┘\n\n`;
      commandListText += `> _Type ${prefix}menu3 to see categories_`;

      const isBase64Image = menuImage && menuImage.startsWith('data:');
      const imagePayload = isBase64Image
        ? { image: Buffer.from(menuImage.split(',')[1], 'base64') }
        : { image: { url: menuImage } };

      await sock.sendMessage(jid, {
        ...imagePayload,
        caption: profileBox + commandListText,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: '𝚉𝙴𝙽𝚃𝚁𝙸𝚇 𝚃𝙴𝙲𝙷 ✦',
            body: `Lv.${level} • ${currentXp}/${nextXp} XP • ${commandCount} cmds`,
            thumbnailUrl: profilePicUrl || 'https://files.catbox.moe/4q9lsg.jpg',
            sourceUrl: '',
            renderLargerThumbnail: false,
          },
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363425412882254@newsletter',
            newsletterName: '𝐙𝐄𝐍𝐓𝐑𝐈𝐗 𝐓𝐄𝐂𝐇 𓅯',
            serverMessageId: -1,
          },
        },
      }, { quoted: msg });
    }
  },
};

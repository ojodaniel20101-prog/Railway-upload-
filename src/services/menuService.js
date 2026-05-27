/**
 * menuService.js — Dynamic Menu Renderer for ZENTRIX MD BY ZENTRIX TECH.
 *
 * Styled after Lady-Trish: sends image+caption PLUS a PDF document
 * named "ZENTRIX_MD_Menu.pdf" containing the full command list.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { commandRouter } from '../handlers/commandRouter.js';
import { getGroupSettings, getPrefixForSession, getBotNameForSession, getFontForSession, getMenuImageForSession, getUserXpData, getGlobalXpStore, setUserProfilePic, getUserLang, getCachedMenu, setCachedMenu } from './databaseService.js';
import { normalizeJidToNumber, applyFont } from '../utils/helpers.js';
import { translateLongText } from '../utils/translator.js';
import logger from '../utils/logger.js';
import { sessionManager } from '../core/sessionManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MENU_CONFIG_PATH = path.join(__dirname, '../config/menu_config.json');

// ─── Category / Sub-label Maps ────────────────────────────────────────────────
export const CAT_HEADERS = {
  'automation':          '⚙️ AUTOMATION',
  'group management':    '👥 GROUP MANAGEMENT',
  'moderation':          '🛡️ MODERATION',
  'ai':                  '🤖 AI COMMANDS',
  'ai image generation': '🎨 AI IMAGE GEN',
  'media':               '⬇️ MEDIA & DOWNLOADS',
  'fun & anime':         '🎉 FUN & ANIME',
  'system':              '🖥️ SYSTEM',
  'general':             '✨ GENERAL',
  'utility':             '🛠️ UTILITY TOOLS',
  'search':              '🔍 SEARCH',
  'tools2':              '⚒️ EXTRA TOOLS',
  'memes':               '🧽 MEMES',
  'stalk':               '🕵️ STALK',
  'nsfw':                '🔞 NSFW (18+)',
};

export const SUB_LABELS = {
  'moderation': 'Moderation', 'settings': 'Settings', 'protection': 'Protection',
  'automation': 'Automation', 'conversation': 'Conversation', 'image': 'Image Generation',
  'downloader': 'Downloaders', 'fun': 'Fun', 'anime gifs': 'Anime GIFs',
  'general': 'General', 'diagnostics': 'Diagnostics', 'errors': 'Command Errors',
  'media': 'Media Tools', 'editor': 'Media Editor', 'status': 'Status Automation',
  'group': 'Group Events', 'tools': 'Utility Tools', 'utility': 'Utility',
  'tools2': 'Extra Tools', 'memes': 'Memes', 'stalk': 'Stalk', 'control': 'Control',
  'creative': 'Creative', 'development': 'Development', 'info': 'Info',
  'owner': 'Owner', 'reasoning': 'Reasoning', 'text maker': 'Text Maker', 'adult': 'Adult Content',
};

export const CAT_ORDER = [
  'automation', 'group management', 'moderation', 'ai', 'ai image generation',
  'media', 'fun & anime', 'system', 'general', 'utility', 'search', 'tools2',
  'stalk', 'memes', 'nsfw',
];

// ─── XP / Level helpers ───────────────────────────────────────────────────────
// (XP is now persisted in databaseService — see getUserXpData / awardMenuXp)

function getRole(isOwner, isAdmin) {
  if (isOwner) return 'OWNER 👑';
  if (isAdmin) return 'ADMIN 🔰';
  return 'NEWBIE ☺';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '🌅 GOOD MORNING';
  if (h < 17) return '☀️ GOOD AFTERNOON';
  if (h < 21) return '🌆 GOOD EVENING';
  return '🌙 GOOD NIGHT';
}

// ─── Menu Service ─────────────────────────────────────────────────────────────
class MenuService {
  constructor() {
    this.menuImageUrl  = 'https://i.ibb.co/9ksGqGXy/6d14e5d20a3c.jpg';
    this.menuHeader    = 'ZENTRIX MD BY ZENTRIX TECH';
    this.menuFooter    = 'Powered by ZENTRIX MD BY ZENTRIX TECH';
    this.menuInitialized = false;
    this.startTime     = Date.now();
    this.SUB_LABELS    = SUB_LABELS;
    this.CAT_HEADERS   = CAT_HEADERS;
    this.CAT_ORDER     = CAT_ORDER;
  }

  getRole(isOwner, isAdmin) {
    if (isOwner) return 'OWNER 👑';
    if (isAdmin) return 'ADMIN 🔰';
    return 'NEWBIE ☺';
  }

  getFormattedDate() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).toUpperCase();
  }

  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return '🌅 GOOD MORNING';
    if (h < 17) return '☀️ GOOD AFTERNOON';
    if (h < 21) return '🌆 GOOD EVENING';
    return '🌙 GOOD NIGHT';
  }

  async initialize() {
    if (this.menuInitialized) return;
    try {
      const config = JSON.parse(await fs.readFile(MENU_CONFIG_PATH, 'utf-8'));
      this.menuImageUrl = config.menuImageUrl || this.menuImageUrl;
      this.menuHeader   = config.menuHeader   || this.menuHeader;
      this.menuFooter   = config.menuFooter   || this.menuFooter;
    } catch { /* use defaults */ }
    this.menuInitialized = true;
  }

  formatUptime() {
    const s = Math.floor((Date.now() - this.startTime) / 1000);
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  getRamUsage() {
    const used  = process.memoryUsage().rss / 1024 / 1024;
    const total = os.totalmem() / 1024 / 1024;
    return `${used.toFixed(1)}MB / ${total.toFixed(0)}MB`;
  }

  async sendMenu(sock, jid, userId, userName, isOwner, isAdmin, activeSessions, msg = null) {
    await this.initialize();
    await commandRouter.loadCommands();
    const commandRegistry = commandRouter.getCommandRegistry();

    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix    = getPrefixForSession(botNumber);
    const botName   = getBotNameForSession(botNumber);
    const fontStyle  = getFontForSession(botNumber);
    const menuImage  = getMenuImageForSession(botNumber);

    // ── Read live XP stats (XP is earned per command, not on menu open) ──────
    const { level, currentXp, nextXp } = getUserXpData(userId, botNumber);
    const commandCount = getGlobalXpStore(userId, botNumber)?.commandCount || 0;

    // ── Fetch & cache profile picture ────────────────────────────────────────
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

    const role      = this.getRole(isOwner, isAdmin);
    const uptime    = this.formatUptime();
    const greeting  = this.getGreeting();
    const display   = (userName || 'User').toUpperCase();

    // ── Profile box (WhatsApp caption) ──────────────────────────────────────
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
    profileBox += `│ 📅 ${this.getFormattedDate()}\n`;
    profileBox += `└${line28}┘\n\n`;

    // ── Main Protocol (caption) ──────────────────────────────────────────────
    let mainProtocol = '';
    mainProtocol += `┌ 〔 *${applyFont('MAIN PROTOCOL', fontStyle)}* 〕\n`;
    mainProtocol += `│ • ${prefix}menu          – Show this menu\n`;
    mainProtocol += `│ • ${prefix}getbot        – Get your own bot 🤖\n`;
    mainProtocol += `│ • ${prefix}help [cmd]    – Command info\n`;
    mainProtocol += `│ • ${prefix}ping          – Bot speed\n`;
    mainProtocol += `│ • ${prefix}uptime        – Bot uptime\n`;
    mainProtocol += `│ • ${prefix}stats         – Statistics\n`;
    mainProtocol += `│ • ${prefix}levelup       – Your XP rank card 📊\n`;
    if (isOwner || isAdmin) {
      mainProtocol += `│ • ${prefix}mode          – Public/private toggle\n`;
      mainProtocol += `│ • ${prefix}enable/disable – Toggle commands\n`;
    }
    mainProtocol += `└${line28}┘\n\n`;

    // ── Command list (caption) ───────────────────────────────────────────────
    const menuBody = await this.generateMenuText(
      jid, isOwner, isAdmin, commandRegistry, botNumber, sock, userId, fontStyle
    );

    let caption =
      profileBox +
      mainProtocol +
      menuBody +
      `\n╼${'╼'.repeat(27)}╼\n` +
      `⚡ *${applyFont('Powered by', fontStyle)} ${applyFont(botName, fontStyle)}*\n` +
      `> _Type ${prefix}getbot to get your own bot_ 🤖`;

    // ── Language translation ─────────────────────────────────────────────────
    const userLang = getUserLang(userId, botNumber);
    if (userLang && userLang !== 'en') {
      try {
        // Check cache first
        let cached = getCachedMenu(`${userLang}_${userId}`);
        if (cached) {
          caption = cached;
        } else {
          logger.info(`[MenuService] Translating menu to ${userLang} for ${userId}...`);
          caption = await translateLongText(caption, userLang);
          setCachedMenu(`${userLang}_${userId}`, caption);
          logger.info(`[MenuService] Menu translated and cached for ${userId} (${userLang})`);
        }
      } catch (err) {
        logger.warn(`[MenuService] Menu translation failed, using English: ${err.message}`);
      }
    }

    // ── Send menu — profile pic shown as thumbnail in externalAdReply ────────
    const isBase64Menu = menuImage && menuImage.startsWith('data:');
    const imagePayload = isBase64Menu
      ? { image: Buffer.from(menuImage.split(',')[1], 'base64') }
      : { image: { url: menuImage } };

    await sock.sendMessage(jid, {
      ...imagePayload,
      caption,
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

  async prepareMenuImage(sock, menuImageUrl) {
    try {
      const { prepareWAMessageMedia } = await import("@whiskeysockets/baileys");
      const isBase64 = menuImageUrl && menuImageUrl.startsWith('data:');
      const imageInput = isBase64
        ? { image: Buffer.from(menuImageUrl.split(',')[1], 'base64') }
        : { image: { url: menuImageUrl } };
      const media = await prepareWAMessageMedia(
        imageInput,
        { upload: sock.waUploadToServer }
      );
      return media.imageMessage;
    } catch (e) {
      logger.error(`[MenuService] Failed to prepare menu image: ${e.message}`);
      return null;
    }
  }

  async generateMenuText(jid, isOwner, isAdmin, commandRegistry, botNumber, sock, userId, fontStyle = 'bold') {
    const { getChatSettings, getGlobalSettings, getPrefixForSession } =
      await import('./databaseService.js');
    const settings       = getChatSettings(botNumber, jid);
    const globalSettings = getGlobalSettings();
    const menuPrefix     = getPrefixForSession(botNumber);
    const isGroup        = jid.endsWith('@g.us');

    const developerNumber = '254741930247';
    const senderNumber    = userId ? userId.split('@')[0] : '';
    const isDeveloper     = senderNumber === developerNumber;

    const categorizedCommands = commandRegistry.reduce((acc, cmd) => {
      if (cmd.name === 'disable' && !isDeveloper) return acc;
      if (cmd.roleRequired === 'owner' && !isOwner) return acc;
      if (cmd.roleRequired === 'admin' && !isAdmin && !isOwner) return acc;
      if (cmd.groupOnly && !isGroup) return acc;

      const cat = cmd.category    || 'general';
      const sub = cmd.subCategory || 'general';
      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][sub]) acc[cat][sub] = [];
      acc[cat][sub].push(cmd);
      return acc;
    }, {});

    const sortedCats = Object.keys(categorizedCommands).sort(
      (a, b) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b)
    );

    let menu = '';
    for (const cat of sortedCats) {
      const subs = categorizedCommands[cat];
      menu += `\n┌ ${applyFont(CAT_HEADERS[cat] || cat.toUpperCase(), fontStyle)}\n`;

      for (const sub of Object.keys(subs).sort()) {
        const label = SUB_LABELS[sub] || sub.charAt(0).toUpperCase() + sub.slice(1);
        menu += `├─ _${label}_\n`;

        const sorted = subs[sub].sort((a, b) => a.name.localeCompare(b.name));
        for (const cmd of sorted) {
          let status = '';
          const isDisabled = globalSettings.disabledCommands?.includes(cmd.name);
          if (isDisabled) {
            status = ' ❌';
          } else if (cmd.category === 'automation') {
            const auto = settings.automation?.[cmd.name];
            if (auto) status = auto.enabled ? ' ✅' : ' 🔴';
          }
          menu += `│  🔹 ${applyFont(menuPrefix + cmd.name, fontStyle)}${status}\n`;
        }
      }
      menu += `└${'─'.repeat(28)}┘\n`;
    }

    return menu;
  }
}

export const menuService = new MenuService();

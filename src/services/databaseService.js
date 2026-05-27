/**
 * databaseService.js — Persistent group settings storage for ZENTRIX MD BY ZENTRIX TECH.
 * Uses JSON file-based storage with in-memory caching.
 */

import { promises as fs } from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'database');
const GROUP_SETTINGS_FILE = path.join(DB_DIR, 'groupSettings.json');
const SESSION_CHAT_PREFIX = 'session_chat::';

let groupSettingsCache = {};
let globalSettings = { disabledCommands: [], users: [] };
let saveTimeout = null;
const GLOBAL_SETTINGS_FILE = path.join(DB_DIR, 'globalSettings.json');

// Anti-Delete Message Store (In-memory for performance, session-isolated)
// Structure: { [botNumber]: { [chatId]: { [messageId]: messageContent } } }
const messageStore = {};
const MAX_MESSAGES_PER_CHAT = 500;
const MESSAGE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Default settings template for new groups
function getDefaultSettings() {
  return {
    protection: {
      antilink: { enabled: false, mode: 'warn' },
      antitag: { enabled: false, mode: 'warn' },
      antibadwords: { enabled: false, mode: 'warn', words: [] },
      antiflood: { enabled: false, mode: 'warn' },
      antiinvite: { enabled: false, mode: 'warn' },
      antipromote: { enabled: false, mode: 'demote' },
      raidEnabled: false,    // PHASE 3: Manual raid shield toggle (.raid on/off)
      joinHistory: []        // PHASE 3: Tracks recent joins for coordinated-join detection
    },
    automation: {
      antibot: { mode: 'off' },
      vv3: { enabled: false },
      autotype: { enabled: false },
      autorecord: { enabled: false },
      autoreact: { enabled: false, mode: 'genz' },
      autoview: { enabled: false },
      aichat: { enabled: false },
      voicemode: { enabled: false, lang: 'en' },
      autoreply: { enabled: false, rules: [] },
      antidelete: { enabled: false, mode: 'all' },
      antimedia: { enabled: false, expiry: null },
      antigroupmention: { enabled: false, expiry: null },
      autostatus: { enabled: false },
      welcome: { enabled: false },
      goodbye: { enabled: false }
    },
    system: {
      mode: 'public' // Default system mode
    },
    warnings: {},
    blacklist: [], // Persistent ban list for the group
    mutedMembers: [], // New: List of muted members in the group
    floodTracker: {},
    disabledCommands: [] // List of disabled command names
  };
}

/**
 * Deep merges source into target, preserving existing nested values.
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

async function initDatabase() {
  await fs.mkdir(DB_DIR, { recursive: true });
  
  // Load Group Settings
  try {
    const data = await fs.readFile(GROUP_SETTINGS_FILE, 'utf-8');
    groupSettingsCache = JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(GROUP_SETTINGS_FILE, JSON.stringify({}), 'utf-8');
    } else {
      console.error('Failed to initialize group settings database:', error);
    }
  }

  // Load Global Settings
  try {
    const globalData = await fs.readFile(GLOBAL_SETTINGS_FILE, 'utf-8');
    globalSettings = JSON.parse(globalData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(GLOBAL_SETTINGS_FILE, JSON.stringify(globalSettings), 'utf-8');
    } else {
      console.error('Failed to initialize global settings database:', error);
    }
  }
}

// Debounced save to avoid excessive disk writes
function saveGroupSettings() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await fs.writeFile(GROUP_SETTINGS_FILE, JSON.stringify(groupSettingsCache, null, 2), 'utf-8');
      await fs.writeFile(GLOBAL_SETTINGS_FILE, JSON.stringify(globalSettings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, 1000);
}

function getGlobalSettings() {
  return globalSettings;
}

function updateGlobalSettings(newSettings) {
  globalSettings = { ...globalSettings, ...newSettings };
  saveGroupSettings();
}

function getGroupSettings(groupId) {
  if (!groupSettingsCache[groupId]) {
    groupSettingsCache[groupId] = getDefaultSettings();
    saveGroupSettings();
  } else {
    // Ensure new fields are present for existing groups (migration)
    const defaults = getDefaultSettings();
    groupSettingsCache[groupId] = deepMerge(defaults, groupSettingsCache[groupId]);
  }
  return groupSettingsCache[groupId];
}

function buildSessionChatKey(botNumber, chatId) {
  return `${SESSION_CHAT_PREFIX}${botNumber}::${chatId}`;
}

function getChatSettings(botNumber, chatId) {
  if (!botNumber || !chatId) return getDefaultSettings();

  const scopedKey = buildSessionChatKey(botNumber, chatId);
  if (!groupSettingsCache[scopedKey]) {
    const defaults = getDefaultSettings();
    const legacySettings = groupSettingsCache[chatId];
    groupSettingsCache[scopedKey] = legacySettings
      ? deepMerge(defaults, legacySettings)
      : defaults;
    saveGroupSettings();
  } else {
    const defaults = getDefaultSettings();
    groupSettingsCache[scopedKey] = deepMerge(defaults, groupSettingsCache[scopedKey]);
  }

  return groupSettingsCache[scopedKey];
}

function updateGroupSettings(groupId, newSettings) {
  if (!groupSettingsCache[groupId]) {
    groupSettingsCache[groupId] = getDefaultSettings();
  }
  groupSettingsCache[groupId] = deepMerge(groupSettingsCache[groupId], newSettings);
  saveGroupSettings();
}

function updateChatSettings(botNumber, chatId, newSettings) {
  const scopedKey = buildSessionChatKey(botNumber, chatId);
  if (!groupSettingsCache[scopedKey]) {
    getChatSettings(botNumber, chatId);
  }
  groupSettingsCache[scopedKey] = deepMerge(groupSettingsCache[scopedKey], newSettings);
  saveGroupSettings();
}

/**
 * Stores a message for potential recovery by Anti-Delete.
 * Isolated by botNumber to support multi-session.
 */
function storeMessage(botNumber, chatId, msg) {
  if (!messageStore[botNumber]) messageStore[botNumber] = {};
  if (!messageStore[botNumber][chatId]) messageStore[botNumber][chatId] = new Map();

  const chatStore = messageStore[botNumber][chatId];
  const msgId = msg.key.id;

  // Store the message
  chatStore.set(msgId, {
    msg,
    timestamp: Date.now()
  });

  // Cleanup: Limit size per chat
  if (chatStore.size > MAX_MESSAGES_PER_CHAT) {
    const firstKey = chatStore.keys().next().value;
    chatStore.delete(firstKey);
  }

  // Cleanup: TTL (run occasionally)
  if (Math.random() < 0.01) { // 1% chance per store to trigger TTL cleanup
    const now = Date.now();
    for (const [id, data] of chatStore.entries()) {
      if (now - data.timestamp > MESSAGE_TTL) {
        chatStore.delete(id);
      }
    }
  }
}

/**
 * Retrieves a stored message by ID.
 */
function getStoredMessage(botNumber, chatId, msgId) {
  return messageStore[botNumber]?.[chatId]?.get(msgId)?.msg;
}

// ─── Per-Session Prefix Store ─────────────────────────────────────────────────
// Stored in globalSettings.sessionPrefixes: { [botNumber]: prefix }

const DEFAULT_PREFIX = process.env.WHATSAPP_COMMAND_PREFIX || '.';

function getPrefixForSession(botNumber) {
  if (!botNumber) return DEFAULT_PREFIX;
  return globalSettings?.sessionPrefixes?.[botNumber] || DEFAULT_PREFIX;
}

function setPrefixForSession(botNumber, prefix) {
  if (!botNumber || !prefix) return;
  if (!globalSettings.sessionPrefixes) globalSettings.sessionPrefixes = {};
  globalSettings.sessionPrefixes[botNumber] = prefix;
  saveGroupSettings(); // reuses the debounced save (writes globalSettings.json)
}

export { 
  initDatabase, 
  getGroupSettings,
  getChatSettings,
  updateGroupSettings,
  updateChatSettings,
  getGlobalSettings,
  updateGlobalSettings,
  storeMessage,
  getStoredMessage,
  getPrefixForSession,
  setPrefixForSession,
};

// ─── Per-Session Bot Name Store ───────────────────────────────────────────────
// Stored in globalSettings.sessionBotNames: { [botNumber]: customName }
// The brand "ZENTRIX MD BY ZENTRIX TECH" is always appended so it never disappears.

const DEFAULT_BOT_NAME = 'ZENTRIX MD BY ZENTRIX TECH';

function getBotNameForSession(botNumber) {
  if (!botNumber) return DEFAULT_BOT_NAME;
  const custom = globalSettings?.sessionBotNames?.[botNumber];
  // If custom name set: show as "CustomName | ZENTRIX MD BY ZENTRIX TECH"
  return custom ? `${custom} | ZENTRIX MD BY ZENTRIX TECH` : DEFAULT_BOT_NAME;
}

function setBotNameForSession(botNumber, name) {
  if (!botNumber || !name) return;
  if (!globalSettings.sessionBotNames) globalSettings.sessionBotNames = {};
  globalSettings.sessionBotNames[botNumber] = name;
  saveGroupSettings();
}

function clearBotNameForSession(botNumber) {
  if (!botNumber) return;
  if (globalSettings.sessionBotNames) {
    delete globalSettings.sessionBotNames[botNumber];
    saveGroupSettings();
  }
}

export { getBotNameForSession, setBotNameForSession, clearBotNameForSession };

// ─── Per-User Menu Preference Store ───────────────────────────────────────────
// Stored in globalSettings.userMenus: { [botNumber::userId]: menuType }

function getUserMenu(userId, botNumber) {
  if (!userId || !botNumber) return 'menu1';
  const key = `${botNumber}::${userId}`;
  return globalSettings?.userMenus?.[key] || 'menu1';
}

function setUserMenu(userId, botNumber, menuType) {
  if (!userId || !botNumber || !menuType) return;
  if (!globalSettings.userMenus) globalSettings.userMenus = {};
  const key = `${botNumber}::${userId}`;
  globalSettings.userMenus[key] = menuType;
  saveGroupSettings();
}

export { getUserMenu, setUserMenu };

// ─── Per-Session Font Store ───────────────────────────────────────────────────
// Stored in globalSettings.sessionFonts: { [botNumber]: fontName }

const DEFAULT_FONT = 'bold';
const VALID_FONTS  = ['bold', 'italic', 'boldItalic', 'fraktur', 'doublestruck', 'monospace', 'smallcaps'];

function getFontForSession(botNumber) {
  if (!botNumber) return DEFAULT_FONT;
  const f = globalSettings?.sessionFonts?.[botNumber];
  return VALID_FONTS.includes(f) ? f : DEFAULT_FONT;
}

function setFontForSession(botNumber, fontName) {
  if (!botNumber || !VALID_FONTS.includes(fontName)) return false;
  if (!globalSettings.sessionFonts) globalSettings.sessionFonts = {};
  globalSettings.sessionFonts[botNumber] = fontName;
  saveGroupSettings();
  return true;
}

export { getFontForSession, setFontForSession, VALID_FONTS };

// ─── User Account Management ──────────────────────────────────────────────────

function findUser(username) {
  return globalSettings.users?.find(u => u.username === username);
}

function createUser(username, password) {
  if (findUser(username)) return { success: false, message: 'User already exists' };
  if (!globalSettings.users) globalSettings.users = [];
  globalSettings.users.push({ username, password, createdAt: new Date() });
  saveGroupSettings();
  return { success: true };
}

function validateUser(username, password) {
  const user = findUser(username);
  if (user && user.password === password) return true;
  return false;
}

export { createUser, validateUser, findUser };

// ─── Per-Session Menu Image Store ─────────────────────────────────────────────
// Stored in globalSettings.sessionMenuImages: { [botNumber]: imageUrl }

const DEFAULT_MENU_IMAGE = 'https://i.ibb.co/9ksGqGXy/6d14e5d20a3c.jpg';

function getMenuImageForSession(botNumber) {
  if (!botNumber) return DEFAULT_MENU_IMAGE;
  return globalSettings?.sessionMenuImages?.[botNumber] || DEFAULT_MENU_IMAGE;
}

function setMenuImageForSession(botNumber, url) {
  if (!botNumber || !url) return;
  if (!globalSettings.sessionMenuImages) globalSettings.sessionMenuImages = {};
  globalSettings.sessionMenuImages[botNumber] = url;
  saveGroupSettings();
}

function clearMenuImageForSession(botNumber) {
  if (!botNumber) return;
  if (globalSettings.sessionMenuImages) {
    delete globalSettings.sessionMenuImages[botNumber];
    saveGroupSettings();
  }
}

export { getMenuImageForSession, setMenuImageForSession, clearMenuImageForSession };

// ─── Per-User XP / Level Store ────────────────────────────────────────────────
// Stored in globalSettings.userXp: { [userId]: { totalXp, lastLevelUp, profilePic } }

// ── Scope helper — isolates XP and registry per bot session ─────────────────
// Key format: "botNumber::userJid"  e.g.  "2349057467015::2348123456789@s.whatsapp.net"
function _xpKey(userId, botNumber) {
  if (!botNumber) return userId; // fallback (should never happen)
  return `${botNumber}::${userId}`;
}

// XP required to REACH each level (index = level number, 20 levels total)
const XP_TABLE = [
  0,     // Lv 0
  100,   // Lv 1
  250,   // Lv 2
  500,   // Lv 3
  900,   // Lv 4
  1400,  // Lv 5
  2100,  // Lv 6
  3000,  // Lv 7
  4200,  // Lv 8
  5700,  // Lv 9
  7500,  // Lv 10
  9800,  // Lv 11
  12600, // Lv 12
  16000, // Lv 13
  20000, // Lv 14
  25000, // Lv 15
  31000, // Lv 16
  38500, // Lv 17
  47500, // Lv 18
  58000, // Lv 19
  70000, // Lv 20 — MAX
];

function _computeLevel(totalXp) {
  let level = 0;
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (totalXp >= XP_TABLE[i]) { level = i; break; }
  }
  const currentXp = totalXp - XP_TABLE[level];
  const nextXp    = level < XP_TABLE.length - 1 ? XP_TABLE[level + 1] - XP_TABLE[level] : 999;
  return { level, currentXp, nextXp };
}

function getUserXpData(userId, botNumber = '') {
  if (!userId) return { totalXp: 0, level: 0, currentXp: 0, nextXp: 100, lastLevelUp: null, profilePic: null };
  const key  = _xpKey(userId, botNumber);
  const data = globalSettings?.userXp?.[key] || { totalXp: 0, lastLevelUp: null, profilePic: null };
  const { level, currentXp, nextXp } = _computeLevel(data.totalXp || 0);
  return { totalXp: data.totalXp || 0, level, currentXp, nextXp, lastLevelUp: data.lastLevelUp || null, profilePic: data.profilePic || null };
}

function awardMenuXp(userId, botNumber = '') {
  if (!userId) return getUserXpData(userId, botNumber);
  const key = _xpKey(userId, botNumber);
  if (!globalSettings.userXp) globalSettings.userXp = {};
  if (!globalSettings.userXp[key]) globalSettings.userXp[key] = { totalXp: 0, lastLevelUp: null, profilePic: null };
  const gain = Math.floor(Math.random() * 5) + 3;
  globalSettings.userXp[key].totalXp = (globalSettings.userXp[key].totalXp || 0) + gain;
  saveGroupSettings();
  return getUserXpData(userId, botNumber);
}

// In-memory cooldown map: userId -> last awarded timestamp (ms)
// Prevents XP farming by spamming one command repeatedly.
const _xpCooldowns = new Map();
const XP_COOLDOWN_MS  = 60_000; // 60 seconds between awards
const XP_COMMANDS_EXCLUDED = new Set(['levelup', 'lvlup', 'register', 'reg']); // no XP for these

/**
 * awardCommandXp — called by commandRouter after every successful command.
 * Awards 3–8 XP, subject to a 60s per-user cooldown.
 * Returns { awarded, xpGain, leveledUp, oldLevel, newLevel, data }
 */
function awardCommandXp(userId, botNumber = '', commandName = '') {
  if (!userId) return { awarded: false, xpGain: 0, leveledUp: false, data: getUserXpData(userId, botNumber) };

  // Skip XP for meta-commands
  if (XP_COMMANDS_EXCLUDED.has(commandName.toLowerCase())) {
    return { awarded: false, xpGain: 0, leveledUp: false, data: getUserXpData(userId, botNumber) };
  }

  // Cooldown check — keyed per bot+user pair
  const cooldownKey = _xpKey(userId, botNumber);
  const now  = Date.now();
  const last = _xpCooldowns.get(cooldownKey) || 0;
  if (now - last < XP_COOLDOWN_MS) {
    return { awarded: false, xpGain: 0, leveledUp: false, data: getUserXpData(userId, botNumber) };
  }
  _xpCooldowns.set(cooldownKey, now);

  const key = _xpKey(userId, botNumber);
  if (!globalSettings.userXp) globalSettings.userXp = {};
  if (!globalSettings.userXp[key]) {
    globalSettings.userXp[key] = { totalXp: 0, lastActive: null, profilePic: null };
  }

  const record   = globalSettings.userXp[key];
  const oldData  = getUserXpData(userId, botNumber);
  const oldLevel = oldData.level;

  const xpGain        = Math.floor(Math.random() * 6) + 3; // 3–8 XP
  record.totalXp      = (record.totalXp || 0) + xpGain;
  record.lastActive   = new Date().toISOString();
  record.commandCount = (record.commandCount || 0) + 1;
  saveGroupSettings();

  const newData   = getUserXpData(userId, botNumber);
  const leveledUp = newData.level > oldLevel;

  return { awarded: true, xpGain, leveledUp, oldLevel, newLevel: newData.level, data: newData };
}

function setUserProfilePic(userId, botNumber = '', url) {
  if (!userId || !url) return;
  const key = _xpKey(userId, botNumber);
  if (!globalSettings.userXp)      globalSettings.userXp      = {};
  if (!globalSettings.userXp[key]) globalSettings.userXp[key] = { totalXp: 0, lastLevelUp: null };
  globalSettings.userXp[key].profilePic = url;
  saveGroupSettings();
}

export { getUserXpData, awardMenuXp, awardCommandXp, setUserProfilePic, XP_TABLE, XP_COMMANDS_EXCLUDED };
// ── User Registration ─────────────────────────────────────────────────────────
// Stored in globalSettings.userRegistry: { [userId]: { name, age, registeredAt } }
// userId is the full JID (e.g. "2349057467015@s.whatsapp.net") — fully isolated per person.

function registerUser(userId, botNumber = '', { name, age }) {
  if (!userId) return;
  const regKey = _xpKey(userId, botNumber);
  if (!globalSettings.userRegistry) globalSettings.userRegistry = {};
  globalSettings.userRegistry[regKey] = {
    name: name.trim(),
    age:  parseInt(age, 10),
    registeredAt: new Date().toISOString(),
  };
  // Also initialise their XP record scoped to this bot
  const xpKey = _xpKey(userId, botNumber);
  if (!globalSettings.userXp) globalSettings.userXp = {};
  if (!globalSettings.userXp[xpKey]) {
    globalSettings.userXp[xpKey] = { totalXp: 0, lastLevelUp: null, profilePic: null };
  }
  saveGroupSettings();
}

function getRegisteredUser(userId, botNumber = '') {
  if (!userId) return null;
  const key = _xpKey(userId, botNumber);
  return globalSettings.userRegistry?.[key] || null;
}

/**
 * getGlobalXpStore — returns the raw XP record for a user (for commandCount etc.)
 */
function getGlobalXpStore(userId, botNumber = '') {
  if (!userId) return null;
  const key = _xpKey(userId, botNumber);
  return globalSettings?.userXp?.[key] || null;
}

export { registerUser, getRegisteredUser, getGlobalXpStore };


// ─── Per-User Language Store ──────────────────────────────────────────────────
// Stored in globalSettings.userLangs: { [userId]: langCode }
// GLOBAL per user — same language setting applies across all bot sessions/chats.

const DEFAULT_LANG = 'en';

function getUserLang(userId, botNumber = '') {
  if (!userId) return DEFAULT_LANG;
  // Use userId only (strip @s.whatsapp.net if present) so lang is global per user
  const key = userId.replace(/@.+$/, '');
  return globalSettings?.userLangs?.[key] || DEFAULT_LANG;
}

function setUserLang(userId, botNumber = '', langCode) {
  if (!userId || !langCode) return;
  const key = userId.replace(/@.+$/, '');
  if (!globalSettings.userLangs) globalSettings.userLangs = {};
  globalSettings.userLangs[key] = langCode.toLowerCase();
  saveGroupSettings();
}

function clearUserLang(userId, botNumber = '') {
  if (!userId) return;
  const key = userId.replace(/@.+$/, '');
  if (globalSettings.userLangs) {
    delete globalSettings.userLangs[key];
    saveGroupSettings();
  }
}

// ─── Translated Menu Cache ────────────────────────────────────────────────────
// Stored in globalSettings.menuCache: { [langCode]: translatedMenuText }
// Avoids re-translating the menu every time a user opens it.

function getCachedMenu(langCode) {
  if (!langCode || langCode === DEFAULT_LANG) return null;
  return globalSettings?.menuCache?.[langCode] || null;
}

function setCachedMenu(langCode, text) {
  if (!langCode || !text) return;
  if (!globalSettings.menuCache) globalSettings.menuCache = {};
  globalSettings.menuCache[langCode] = text;
  saveGroupSettings();
}

function clearMenuCache(langCode = null) {
  if (!globalSettings.menuCache) return;
  if (langCode) {
    delete globalSettings.menuCache[langCode];
  } else {
    globalSettings.menuCache = {};
  }
  saveGroupSettings();
}

export { getUserLang, setUserLang, clearUserLang, getCachedMenu, setCachedMenu, clearMenuCache, DEFAULT_LANG };

// ─── Global Per-User Sticker Commands ────────────────────────────────────────
// Stored in globalSettings.userStickerCmds: { [userId]: { [fingerprint]: cmd } }
// GLOBAL per user — sticker bindings work across ALL chats, not just one chat.

function getUserStickerCmds(userId) {
  if (!userId) return {};
  const key = userId.replace(/@.+$/, '');
  return globalSettings?.userStickerCmds?.[key] || {};
}

function setUserStickerCmd(userId, fingerprint, cmdName) {
  if (!userId || !fingerprint || !cmdName) return;
  const key = userId.replace(/@.+$/, '');
  if (!globalSettings.userStickerCmds) globalSettings.userStickerCmds = {};
  if (!globalSettings.userStickerCmds[key]) globalSettings.userStickerCmds[key] = {};
  globalSettings.userStickerCmds[key][fingerprint] = cmdName;
  saveGroupSettings();
}

function removeUserStickerCmd(userId, fingerprint) {
  if (!userId || !fingerprint) return;
  const key = userId.replace(/@.+$/, '');
  if (globalSettings?.userStickerCmds?.[key]) {
    delete globalSettings.userStickerCmds[key][fingerprint];
    saveGroupSettings();
  }
}

function clearUserStickerCmds(userId) {
  if (!userId) return;
  const key = userId.replace(/@.+$/, '');
  if (globalSettings?.userStickerCmds?.[key]) {
    globalSettings.userStickerCmds[key] = {};
    saveGroupSettings();
  }
}

export { getUserStickerCmds, setUserStickerCmd, removeUserStickerCmd, clearUserStickerCmds };

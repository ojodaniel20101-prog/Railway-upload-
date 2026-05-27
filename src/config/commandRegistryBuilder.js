/**
 * commandRegistryBuilder.js — Dynamic Command Registry Builder for ZENTRIX MD BY ZENTRIX TECH.
 * 
 * This module automatically scans ALL command files in src/commands/whatsapp/ and its subfolders
 * and builds a complete registry. This means:
 * - Every command is always in the menu, even newly added ones
 * - No manual registry updates needed when adding new commands
 * - Commands are auto-categorized based on their name, explicit metadata, or file path.
 * - Enhanced error reporting for failed command loads.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for WhatsApp commands
const WHATSAPP_COMMANDS_BASE_DIR = path.join(__dirname, '../commands/whatsapp');

// --- Command Metadata Rules (Explicitly defined commands take precedence) ---
// These rules provide explicit categorization and metadata for specific commands.
// If a command is not listed here, auto-categorization will be used.
const COMMAND_RULES = {
  // Group Management & Moderation
  kick:          { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  add:           { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  promote:       { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  demote:        { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  warn:          { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  warnings:      { category: 'group management', subCategory: 'moderation', roleRequired: 'user',  groupOnly: true, emoji: '⚔️' },
  clearwarnings: { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  mute:          { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  unmute:        { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  delete:        { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  tagall:        { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  hidetag:       { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '⚔️' },
  ban:           { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '🚫' },
  unban:         { category: 'group management', subCategory: 'moderation', roleRequired: 'admin', groupOnly: true, emoji: '✅' },
  // Group Settings
  setname:       { category: 'group management', subCategory: 'settings',   roleRequired: 'admin', groupOnly: true, emoji: '⚙️' },
  setdesc:       { category: 'group management', subCategory: 'settings',   roleRequired: 'admin', groupOnly: true, emoji: '⚙️' },
  revoke:        { category: 'group management', subCategory: 'settings',   roleRequired: 'admin', groupOnly: true, emoji: '⚙️' },
  resetlink:     { category: 'group management', subCategory: 'settings',   roleRequired: 'admin', groupOnly: true, emoji: '⚙️' },
  open:          { category: 'group management', subCategory: 'settings',   roleRequired: 'admin', groupOnly: true, emoji: '⚙️' },
  close:         { category: 'group management', subCategory: 'settings',   roleRequired: 'admin', groupOnly: true, emoji: '⚙️' },
  setgp:         { category: 'group management', subCategory: 'settings',   roleRequired: 'admin', groupOnly: true, emoji: '⚙️' },
  admincheck:    { category: 'group management', subCategory: 'settings',   roleRequired: 'user',  groupOnly: true, emoji: '⚙️' },
  // Protection
  antilink:      { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  antiinvite:    { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  antitag:       { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  antibadwords:  { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  antiflood:     { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  antibot:       { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  antihijack:    { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  antipromote:   { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  raid:          { category: 'group management', subCategory: 'protection', roleRequired: 'admin', groupOnly: true, emoji: '🛡️' },
  hijack:        { category: 'group management', subCategory: 'moderation', roleRequired: 'owner', groupOnly: true, emoji: '☢️' },
  // Automation
  aichat:        { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🔥' },
  voicemode:     { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🎙️' },
  s:             { category: 'media', subCategory: 'sticker', roleRequired: 'user',  groupOnly: false, emoji: '🎨' },
  toimg:         { category: 'media', subCategory: 'sticker', roleRequired: 'user',  groupOnly: false, emoji: '🖼️' },
  calendar:      { category: 'utility', subCategory: 'tools', roleRequired: 'user',  groupOnly: false, emoji: '📅' },
  getnumber:     { category: 'utility', subCategory: 'tools', roleRequired: 'user',  groupOnly: false, emoji: '📱' },
  checksms:      { category: 'utility', subCategory: 'tools', roleRequired: 'user',  groupOnly: false, emoji: '📩' },
  qimgcreate:    { category: 'ai', subCategory: 'image',   roleRequired: 'owner', groupOnly: false, emoji: '🖼️' },
  chatbot:       { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🤖' },
  autoreact:     { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🔥' },
  autotype:      { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🔥' },
  autorecord:    { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🔥' },
  autoview:      { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🔥' },
  autoreply:     { category: 'automation', subCategory: 'ai', roleRequired: 'admin', groupOnly: false, emoji: '🔥' },
  vv3:           { category: 'automation', subCategory: 'media', roleRequired: 'admin', groupOnly: false, emoji: '🔥' }, // VV3 is autoview-once
  antidelete:    { category: 'automation', subCategory: 'protection', roleRequired: 'admin', groupOnly: false, emoji: '🚫' }, // New antidelete command
  welcome:       { category: 'automation', subCategory: 'group', roleRequired: 'admin', groupOnly: true, emoji: '👋' },
  goodbye:       { category: 'automation', subCategory: 'group', roleRequired: 'admin', groupOnly: true, emoji: '👋' },
  autostatus:    { category: 'automation', subCategory: 'status', roleRequired: 'owner', groupOnly: false, emoji: '👁️' },
  // AI Commands
  think:         { category: 'ai', subCategory: 'conversation', roleRequired: 'user', groupOnly: false, emoji: '🧠' },
  logic:         { category: 'ai', subCategory: 'conversation', roleRequired: 'user', groupOnly: false, emoji: '🧠' },
  gpt:           { category: 'ai', subCategory: 'conversation', roleRequired: 'user', groupOnly: false, emoji: '🤖' },
  codeai:        { category: 'ai', subCategory: 'conversation', roleRequired: 'user', groupOnly: false, emoji: '💻' },
  chatx:         { category: 'ai', subCategory: 'conversation', roleRequired: 'user', groupOnly: false, emoji: '🤖' },
  nano:          { category: 'ai', subCategory: 'image generation', roleRequired: 'user', groupOnly: false, emoji: '🍌' },
  nanopro:       { category: 'ai', subCategory: 'image generation', roleRequired: 'user', groupOnly: false, emoji: '🍌' },
  rch:           { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '⚡' },
  reactch:       { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '⚡' },
  realistic:     { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  anime:         { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  fantasy:       { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  cyberpunk:     { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  watercolor:    { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  sketch:        { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  cartoon:       { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  abstract:      { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  minimalist:    { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  surreal:       { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  vintage:       { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  steampunk:     { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  horror:        { category: 'ai', subCategory: 'image', roleRequired: 'user', groupOnly: false, emoji: '🖼️' },
  // Meme Commands
  spongebob:     { category: 'memes', subCategory: 'memes', roleRequired: 'user', groupOnly: false, emoji: '🧽' },
  meme:          { category: 'memes', subCategory: 'memes', roleRequired: 'user', groupOnly: false, emoji: '🎭' },
  // Domain & IP Tools (tools2)
  domainsearch:  { category: 'tools2', subCategory: 'tools2', roleRequired: 'user', groupOnly: false, emoji: '🌐' },
  // Stalk Commands
  igstalk:       { category: 'stalk', subCategory: 'stalk', roleRequired: 'user', groupOnly: false, emoji: '📸' },
  ttstalk:       { category: 'stalk', subCategory: 'stalk', roleRequired: 'user', groupOnly: false, emoji: '🎵' },
  twitterstalk:  { category: 'stalk', subCategory: 'stalk', roleRequired: 'user', groupOnly: false, emoji: '🐦' },
  ytstalk:       { category: 'stalk', subCategory: 'stalk', roleRequired: 'user', groupOnly: false, emoji: '📺' },
  ffstalk:       { category: 'stalk', subCategory: 'stalk', roleRequired: 'user', groupOnly: false, emoji: '🔥' },
  // Screenshot Commands
  screenshot:    { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '📸' },
  ss:            { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '📸' },
  ssflash:       { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '⚡' },
  sslayer:       { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '🌐' },
  // Prefix Control
  setprefix:     { category: 'system', subCategory: 'settings', roleRequired: 'owner', groupOnly: false, emoji: '⚙️' },
  getbot:        { category: 'general', subCategory: 'general',  roleRequired: 'user',  groupOnly: false, emoji: '🤖' },
  levelup:       { category: 'general', subCategory: 'general',  roleRequired: 'owner', groupOnly: false, emoji: '📊' },
  setbotname:    { category: 'system', subCategory: 'settings', roleRequired: 'owner', groupOnly: false, emoji: '🏷️' },
  setfont:       { category: 'system', subCategory: 'settings', roleRequired: 'owner', groupOnly: false, emoji: '🎨' },
  setmenuimage:  { category: 'system', subCategory: 'settings', roleRequired: 'owner', groupOnly: false, emoji: '🖼️' },
  setlang:       { category: 'general', subCategory: 'settings', roleRequired: 'user',  groupOnly: false, emoji: '🌐' },
  // System & Utility
  menu:          { category: 'general', subCategory: 'info',       roleRequired: 'user',  groupOnly: false, emoji: '📜' },
  menu3:         { category: 'general', subCategory: 'info',       roleRequired: 'owner', groupOnly: false, emoji: '📜' },
  help:          { category: 'system', subCategory: 'general',     roleRequired: 'user',  groupOnly: false, emoji: '❓' },
  ping:          { category: 'system', subCategory: 'general',     roleRequired: 'user',  groupOnly: false, emoji: '🏓' },
  getgp:         { category: 'system', subCategory: 'general',     roleRequired: 'user',  groupOnly: true,  emoji: '📸' },
  getpp:         { category: 'system', subCategory: 'general',     roleRequired: 'user',  groupOnly: false, emoji: '📸' },
  uptime:        { category: 'system', subCategory: 'diagnostics', roleRequired: 'user',  groupOnly: false, emoji: '⏱️' },
  stats:         { category: 'system', subCategory: 'diagnostics', roleRequired: 'user',  groupOnly: false, emoji: '📊' },
  system:        { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '🧬' },
  logs:          { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '🧾' },
  mode:          { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '🔧' },
  disable:       { category: 'system', subCategory: 'settings',    roleRequired: 'owner', groupOnly: false, emoji: '🚫' },
  broadcast:     { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '📢' },
  setpp:         { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '🖼️' },
  setname2:      { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '✏️' },
  setname3:      { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '✏️' },
  setdesc2:      { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '✏️' },
  setdesc3:      { category: 'system', subCategory: 'diagnostics', roleRequired: 'owner', groupOnly: false, emoji: '✏️' },
  block:         { category: 'group management', subCategory: 'moderation', roleRequired: 'owner', groupOnly: false, emoji: '🚫' },
  unblock:       { category: 'group management', subCategory: 'moderation', roleRequired: 'owner', groupOnly: false, emoji: '🔓' },
  // Downloaders
  tiktok:        { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  instagram:     { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  facebook:      { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  twitter:       { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  ytmp4:         { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  ytmp3:         { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '🎵' },
  vv:            { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '👁️' },
  vv2:           { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '👁️' },
  aio:           { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  capcut:        { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  doods:         { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  douyin:        { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  mediafire:     { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  pinterest:     { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  rednote:       { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  sfile:         { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  soundcloud:    { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  spotify:       { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  terabox:       { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  threads:       { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  ytdownload:    { category: 'media', subCategory: 'downloader', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  // Utility Tools (New Category for URL Shorteners)
  dagd:          { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🔗' },
  vgd:           { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🔗' },
  tinube:        { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🔗' },
  spoome:        { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🔗' },
  spooemoji:     { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🔗' },
  randomshort:   { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🔗' },
  translate:     { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🌐' },
  idch:          { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '📢' },
  groupinfo:     { category: 'group management', subCategory: 'utility', roleRequired: 'user', groupOnly: true, emoji: '🏢' },
  // Media Editor
  imageblur:     { category: 'media', subCategory: 'editor', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  sticker:       { category: 'media', subCategory: 'editor', roleRequired: 'user', groupOnly: false, emoji: '🎨' },
  take:          { category: 'media', subCategory: 'editor', roleRequired: 'user', groupOnly: false, emoji: '📸' },
  ocr:           { category: 'ai', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '🔍' },
  upscale:       { category: 'ai', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  rembg:         { category: 'ai', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '✂️' },
  tempmail:      { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '📧' },
  gitclone:      { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '📥' },
  webpdf:        { category: 'utility', subCategory: 'tools', roleRequired: 'user', groupOnly: false, emoji: '📄' },
  sha512:        { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '🔐' },
  uuid:          { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '🆔' },
  genpass:       { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '🔑' },
  ipinfo:        { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '🌐' },
  npm:           { category: 'tools', subCategory: 'utility', roleRequired: 'user', groupOnly: false, emoji: '📦' },
  encjs:         { category: 'tools', subCategory: 'encryption', roleRequired: 'user', groupOnly: false, emoji: '🔐' },
  enchtml:       { category: 'tools', subCategory: 'encryption', roleRequired: 'user', groupOnly: false, emoji: '🔐' },
  encpy:         { category: 'tools', subCategory: 'encryption', roleRequired: 'user', groupOnly: false, emoji: '🔐' },
  encjson:       { category: 'tools', subCategory: 'encryption', roleRequired: 'user', groupOnly: false, emoji: '🔐' },
  decjs:         { category: 'tools', subCategory: 'encryption', roleRequired: 'user', groupOnly: false, emoji: '🔓' },
  dechtml:       { category: 'tools', subCategory: 'encryption', roleRequired: 'user', groupOnly: false, emoji: '🔓' },
  // Search Category
  android1:      { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udcf1' },
  applemusic:    { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83c\udf4e' },
  cuaca:         { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83c\udf24\ufe0f' },
  ghrepo:        { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udcbb' },
  ghuser:        { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udcbb' },
  imdb:          { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83c\udfac' },
  lyrics:        { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83c\udfb6' },
  pinterest:     { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udccc' },
  wallpaper:     { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\uddbc\ufe0f' },
  soundcloudsearch: { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\u2601\ufe0f' },
  tgsearch:      { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udce2' },
  tiktoksearch:  { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udcf1' },
  wagroup:       { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udcac' },
  ytsearch:      { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udcfa' },
  ytmonet:       { category: 'search', subCategory: 'general', roleRequired: 'user', groupOnly: false, emoji: '\ud83d\udcb0' },
  // Fun & Anime Category
  quote:         { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '💬' },
  '8ball':       { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '🎱' },
  flip:          { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '🪙' },
  roll:          { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '🎲' },
  ship:          { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '💕' },
  roast:         { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '🔥' },
  compliment:    { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '💐' },
  dare:          { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '😈' },
  truth:         { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '🤔' },
  fact:          { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '📚' },
  rizz:          { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '😏' },
  character:     { category: 'fun & anime', subCategory: 'fun', roleRequired: 'user', groupOnly: false, emoji: '🎭' },
  hug:           { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '🫂' },
  slap:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '👋' },
  pat:           { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: ' petting' },
  cry:           { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😭' },
  kill:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '🔪' },
  bite:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '🦷' },
  yeet:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '🤸' },
  bully:         { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😾' },
  bonk:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '🔨' },
  wink:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😉' },
  poke:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '👉' },
  nom:           { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😋' },
  smile:         { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😊' },
  wave:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '👋' },
  awoo:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '🐺' },
  blush:         { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: ' blushing' },
  smug:          { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😏' },
  glomp:         { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '🤗' },
  happy:         { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😄' },
  dance:         { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '💃' },
  cringe:        { category: 'fun & anime', subCategory: 'anime gifs', roleRequired: 'user', groupOnly: false, emoji: '😬' },
  // Text Maker (General Category in v13)
  glitchtext:    { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  writetext:     { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  advancedglow:  { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  typographytext:{ category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  pixelglitch:   { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  neonglitch:    { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  flagtext:      { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  flag3dtext:    { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  deletingtext:  { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  blackpinkstyle:{ category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  glowingtext:   { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  underwatertext:{ category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  logomaker:     { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  cartoonstyle:  { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  papercutstyle: { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  watercolortext:{ category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  effectclouds:  { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  blackpinklogo: { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  gradienttext:  { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  summerbeach:   { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  luxurygold:    { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  multicoloredneon:{ category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  sandsummer:    { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  galaxywallpaper:{ category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  style1917:     { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  makingneon:    { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  royaltext:     { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  freecreate:    { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  galaxystyle:   { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  lighteffects:  { category: 'general', subCategory: 'text maker', roleRequired: 'user', groupOnly: false, emoji: '✨' },
  // In COMMAND_RULES inside commandRegistryBuilder.js:
crash: {
  category: 'tools',
  subCategory: 'exploit',
  roleRequired: 'owner',   // owner-only — never exposed to regular users
  groupOnly: false,
  emoji: '⚡'
},
addcmd: {
  category: 'system',
  subCategory: 'owner',
  roleRequired: 'owner',
  groupOnly: false,
  emoji: '🛠️'
},
rgetfile: {
  category: 'system',
  subCategory: 'owner',
  roleRequired: 'owner',
  groupOnly: false,
  emoji: '📁'
},
};

/**
 * Recursively find all command files in a directory.
 * @param {string} dir - The directory to scan.
 * @returns {string[]} - An array of absolute file paths.
 */
async function getCommandFiles(dir) {
  let files = [];
  const items = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(await getCommandFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Builds a dynamic registry of all commands by scanning command files.
 * This function is the core of the automatic command registration system.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of command objects.
 */
export async function buildDynamicRegistry() {
  const registry = [];
  const seenNames = new Set();
  const commandFiles = await getCommandFiles(WHATSAPP_COMMANDS_BASE_DIR);

  for (const filePath of commandFiles) {
    const relativePath = path.relative(WHATSAPP_COMMANDS_BASE_DIR, filePath);
    const commandNameFromFile = path.basename(filePath, '.js');

    try {
      const modulePath = `file://${filePath}`;
      const module = await import(modulePath);

      // Handle default exports
      if (module.default && typeof module.default.execute === 'function') {
        const cmd = module.default;
        const name = cmd.name || commandNameFromFile;
        if (!seenNames.has(name)) {
          seenNames.add(name);
          registry.push(buildEntry(cmd, name, relativePath));
        }
      }

      // Handle named exports (e.g., hugCommand, eightBallCommand)
      const namedExports = Object.entries(module).filter(
        ([key, val]) => key !== 'default' && typeof val === 'object' && val !== null && typeof val.execute === 'function'
      );

      for (const [exportName, handler] of namedExports) {
        let cmdName = handler.name || exportName.replace(/Command$/, '');
        // Special handling for '8ball' if needed, or other non-standard names
        if (exportName === 'eightBallCommand' || cmdName === 'eightBall') cmdName = '8ball';

        if (!seenNames.has(cmdName)) {
          seenNames.add(cmdName);
          registry.push(buildEntry(handler, cmdName, relativePath));
        }
      }
    } catch (error) {
      logger.error(`[RegistryBuilder] Failed to load command from ${relativePath}: ${error.message}`);
      // Add a placeholder entry for failed commands to report them in the menu
      registry.push({
        name: commandNameFromFile,
        category: 'system',
        subCategory: 'errors',
        roleRequired: 'owner',
        groupOnly: false,
        emoji: '❌',
        description: `Error loading command: ${error.message.substring(0, 100)}...`,
        usage: `.${commandNameFromFile} (Error)`,
        error: true,
        errorMessage: error.message,
      });
    }
  }

  return registry;
}

/**
 * Builds a command entry with metadata, applying explicit rules or auto-categorization.
 * @param {Object} cmd - The command module/handler.
 * @param {string} name - The command name.
 * @param {string} relativePath - The relative path to the command file.
 * @returns {Object} - The structured command entry for the registry.
 */
function buildEntry(cmd, name, relativePath) {
  const rule = COMMAND_RULES[name] || COMMAND_RULES[name.toLowerCase()] || {};
  
  // Prioritize metadata defined within the command handler itself
  const category    = cmd.category    || rule.category    || autoCategory(name, relativePath);
  const subCategory = cmd.subCategory || rule.subCategory || autoSubCategory(name, relativePath);
  const roleRequired= cmd.roleRequired|| rule.roleRequired|| 'user';
  const groupOnly   = cmd.groupOnly   !== undefined ? cmd.groupOnly : (rule.groupOnly || false);
  const emoji       = cmd.emoji       || rule.emoji       || autoEmoji(name, category, subCategory);

  return {
    name,
    category,
    subCategory,
    roleRequired,
    groupOnly,
    emoji,
    description: cmd.description || `Executes the .${name} command.`,
    usage: cmd.usage || `.${name}`,
    filePath: relativePath, // Store file path for debugging/tracking
  };
}

/**
 * Automatically determines the main category for a command.
 * @param {string} name - Command name.
 * @param {string} relativePath - Relative path to the command file.
 * @returns {string} - The determined category.
 */
function autoCategory(name, relativePath) {
  const n = name.toLowerCase();
  if (n.startsWith('anti') || n.includes('group') || n.includes('admin') || n.includes('moderation')) return 'group management';
  if (n.startsWith('auto') || n.includes('automation') || n === 'vv3') return 'automation';
  if (n.includes('ai') || n.includes('gpt') || n.includes('chat') || n.includes('think') || n.includes('logic') || n.includes('code')) return 'ai';
  if (n.includes('download') || n.includes('media') || n.includes('yt') || n.includes('tiktok') || n.includes('instagram') || n.includes('facebook') || n.includes('twitter') || n.includes('pinterest') || n.includes('spotify') || n.includes('soundcloud') || n.includes('capcut') || n.includes('terabox') || n.includes('threads') || n.includes('sfile') || n.includes('mediafire') || n.includes('rednote') || n.includes('doods')) return 'media & downloads';
  if (n.includes('image') || n.includes('img') || n.includes('photo') || n.includes('pic') || n.includes('realistic') || n.includes('anime') || n.includes('fantasy') || n.includes('cyberpunk') || n.includes('watercolor') || n.includes('sketch') || n.includes('cartoon') || n.includes('abstract') || n.includes('minimalist') || n.includes('surreal') || n.includes('vintage') || n.includes('steampunk') || n.includes('horror')) return 'ai image generation';
  if (n.includes('fun') || n.includes('joke') || n.includes('8ball') || n.includes('flip') || n.includes('roll') || n.includes('ship') || n.includes('roast') || n.includes('compliment') || n.includes('dare') || n.includes('truth') || n.includes('fact') || n.includes('rizz') || n.includes('hug') || n.includes('slap') || n.includes('pat') || n.includes('cry') || n.includes('kill') || n.includes('bite') || n.includes('yeet') || n.includes('bully') || n.includes('bonk') || n.includes('wink') || n.includes('poke') || n.includes('nom') || n.includes('smile') || n.includes('wave') || n.includes('awoo') || n.includes('blush') || n.includes('smug') || n.includes('glomp') || n.includes('happy') || n.includes('dance') || n.includes('cringe')) return 'fun & anime';
  if (n.includes('menu') || n.includes('help') || n.includes('ping') || n.includes('uptime') || n.includes('stats') || n.includes('system') || n.includes('logs') || n.includes('mode') || n.includes('broadcast') || n.includes('setpp') || n.includes('getgp') || n.includes('getpp')) return 'system & utility';
  
  // Fallback based on folder structure
  if (relativePath.includes('group')) return 'group management';
  if (relativePath.includes('ai')) return 'ai';
  if (relativePath.includes('downloader')) return 'media & downloads';
  if (relativePath.includes('fun')) return 'fun & anime';
  if (relativePath.includes('tools2')) return 'tools2';
  
  return 'general'; // Default category
}

/**
 * Automatically determines the sub-category for a command.
 * @param {string} name - Command name.
 * @param {string} relativePath - Relative path to the command file.
 * @returns {string} - The determined sub-category.
 */
function autoSubCategory(name, relativePath) {
  const n = name.toLowerCase();
  if (n.startsWith('anti') || n === 'raid') return 'protection';
  if (['autoreact','autotype','autorecord','autoview','autoreply','aichat','vv3', 'antidelete'].includes(n)) return 'automation';
  if (['kick','add','promote','demote','warn','warnings','clearwarnings','mute','unmute','delete','tagall','hidetag','ban','unban'].includes(n)) return 'moderation';
  if (['setname','setdesc','revoke','open','close','resetlink','setgp','admincheck', 'setpp', 'setname2', 'setname3', 'setdesc2', 'setdesc3'].includes(n)) return 'settings';
  if (['think','logic','gpt','codeai','chatx'].includes(n)) return 'conversation';
  if (['realistic','anime','fantasy','cyberpunk','watercolor','sketch','cartoon','abstract','minimalist','surreal','vintage','steampunk','horror'].includes(n)) return 'image generation';
  if (['menu','help','ping','getgp','getpp'].includes(n)) return 'general';
  if (['uptime','stats','system','logs','mode','broadcast'].includes(n)) return 'diagnostics';
  if (['tiktok','instagram','facebook','twitter','ytmp4','ytmp3','vv','vv2', 'aio','capcut','doods','douyin','mediafire','pinterest','rednote','sfile','soundcloud','spotify','terabox','threads','ytdownload','ytDownloader'].includes(n)) return 'downloaders';
  if (['joke','quote','8ball','flip','roll','ship','roast','compliment','dare','truth','fact','rizz','character'].includes(n)) return 'fun';
  if (['hug','slap','pat','cry','kill','bite','yeet','bully','bonk','wink','poke','nom','smile','wave','awoo','blush','smug','glomp','happy','dance','cringe'].includes(n)) return 'anime gifs';
  if (['dagd','vgd','tinube','spoome','spooemoji','randomshort','translate','idch'].includes(n)) return 'tools';

  // Fallback based on folder structure
  if (relativePath.includes('moderation')) return 'moderation';
  if (relativePath.includes('settings')) return 'settings';
  if (relativePath.includes('protection')) return 'protection';
  if (relativePath.includes('automation')) return 'automation';
  if (relativePath.includes('ai')) return 'conversation';
  if (relativePath.includes('image')) return 'image generation';
  if (relativePath.includes('downloader')) return 'downloaders';
  if (relativePath.includes('fun')) return 'fun';
  if (relativePath.includes('anime')) return 'anime gifs';
  if (relativePath.includes('tools2')) return 'tools2';
  
  return 'general'; // Default sub-category
}

/**
 * Automatically determines the emoji for a command.
 * @param {string} name - Command name.
 * @param {string} category - Determined category.
 * @param {string} subCategory - Determined sub-category.
 * @returns {string} - The determined emoji.
 */
function autoEmoji(name, category, subCategory) {
  const n = name.toLowerCase();
  if (COMMAND_RULES[n] && COMMAND_RULES[n].emoji) return COMMAND_RULES[n].emoji; // Use explicit rule emoji first

  if (subCategory === 'protection') return '🛡️';
  if (subCategory === 'automation') return '⚙️';
  if (subCategory === 'moderation') return '⚔️';
  if (subCategory === 'settings') return '🔧';
  if (subCategory === 'conversation') return '💬';
  if (subCategory === 'image generation') return '🖼️';
  if (subCategory === 'downloaders') return '📥';
  if (subCategory === 'fun') return '😂';
  if (subCategory === 'anime gifs') return '🎬';
  if (subCategory === 'diagnostics') return '📊';
  if (subCategory === 'system') return '💻';
  if (subCategory === 'tools') return '🛠️';

  // Fallback based on general category
  if (category === 'group management') return '👥';
  if (category === 'ai') return '🤖';
  if (category === 'media & downloads') return '⬇️';
  if (category === 'fun & anime') return '🎉';
  if (category === 'system & utility') return '🛠️';
  if (category === 'tools2') return '🛠️';
  
  return '⚡'; // Generic default
}

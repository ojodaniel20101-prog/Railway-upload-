/**
 * linkDetector.js — Comprehensive URL and link detection for WhatsApp bot protection.
 * Detects: HTTP/HTTPS URLs, WhatsApp invites, Telegram links, social media,
 * shortened URLs, and generic domain patterns.
 *
 * IMPORTANT: All regex patterns use the 'i' flag only (case-insensitive, NOT global).
 * Using the 'g' flag on module-level regex makes them stateful (lastIndex persists),
 * which causes alternating false positives/negatives across calls. We use .test()
 * which is safe with non-global regex.
 */

// Full URL regex — matches http://, https://, and www. prefixed URLs
// No 'g' flag to avoid stateful lastIndex issues
const FULL_URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/i;

// WhatsApp group invite link
const WHATSAPP_INVITE_REGEX = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/i;

// Telegram links
const TELEGRAM_REGEX = /(?:t\.me|telegram\.me|telegram\.org)\/[^\s<>"']*/i;

// Common social media domains
const SOCIAL_MEDIA_REGEX = /(?:facebook\.com|fb\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|youtu\.be|snapchat\.com|linkedin\.com|pinterest\.com|reddit\.com|discord\.gg|discord\.com\/invite)\/[^\s<>"']*/i;

// URL shorteners
const SHORTENER_REGEX = /(?:bit\.ly|tinyurl\.com|goo\.gl|ow\.ly|t\.co|is\.gd|buff\.ly|adf\.ly|shorte\.st|linktr\.ee|rb\.gy|cutt\.ly|short\.io|tiny\.cc|v\.gd|clck\.ru|qr\.ae|u\.to|j\.mp|shorturl\.at|soo\.gd|s2r\.co|clicky\.me|youtu\.be)\/[^\s<>"']*/i;

/**
 * Detects if a text contains any link/URL.
 * Checks multiple regex patterns — all non-stateful (no 'g' flag).
 *
 * @param {string} text - The message text to check
 * @returns {boolean} - True if a link is detected
 */
export function containsLink(text) {
  if (!text || typeof text !== 'string') return false;

  return (
    WHATSAPP_INVITE_REGEX.test(text) ||
    TELEGRAM_REGEX.test(text) ||
    SOCIAL_MEDIA_REGEX.test(text) ||
    SHORTENER_REGEX.test(text) ||
    FULL_URL_REGEX.test(text)
  );
}

/**
 * Detects if a text contains a WhatsApp group invite link specifically.
 *
 * @param {string} text - The message text to check
 * @returns {boolean}
 */
export function containsWhatsAppInvite(text) {
  if (!text || typeof text !== 'string') return false;
  return WHATSAPP_INVITE_REGEX.test(text);
}

/**
 * Detects if a text contains a Telegram link.
 *
 * @param {string} text - The message text to check
 * @returns {boolean}
 */
export function containsTelegramLink(text) {
  if (!text || typeof text !== 'string') return false;
  return TELEGRAM_REGEX.test(text);
}

/**
 * Returns all detected links from a text.
 * Uses a fresh regex instance each call to avoid stateful issues.
 *
 * @param {string} text - The message text
 * @returns {string[]} - Array of detected link strings
 */
export function extractLinks(text) {
  if (!text || typeof text !== 'string') return [];
  // Use a fresh regex with 'g' flag for extraction (new instance = fresh lastIndex)
  const regex = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
  return text.match(regex) || [];
}

/**
 * Extracts full message text from a Baileys message object,
 * including captions from media messages.
 *
 * @param {object} msg - Baileys WAMessage object
 * @returns {string}
 */
export function extractFullText(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.documentMessage?.caption ||
    msg?.message?.buttonsMessage?.contentText ||
    msg?.message?.listMessage?.description ||
    ''
  );
}

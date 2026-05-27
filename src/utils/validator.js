/**
 * validator.js — Input validation utilities for the ZENTRIX MD BY ZENTRIX TECH platform.
 */

/**
 * Validates that a phone number is in the expected E.164-like format:
 * digits only, between 10 and 15 characters.
 *
 * @param {string} number - The phone number to validate.
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePhoneNumber(number) {
  if (!number || typeof number !== 'string') {
    return { valid: false, reason: 'Phone number must be a non-empty string.' };
  }
  if (!/^\d+$/.test(number)) {
    return { valid: false, reason: 'Phone number must contain digits only (no spaces, dashes, or +).' };
  }
  if (number.length < 10 || number.length > 15) {
    return { valid: false, reason: 'Phone number must be between 10 and 15 digits.' };
  }
  return { valid: true };
}

/**
 * Validates that a Telegram message object has the required fields.
 *
 * @param {object} msg - The Telegram message object.
 * @returns {boolean}
 */
export function isValidTelegramMessage(msg) {
  return !!(msg && msg.chat && msg.chat.id && msg.from && msg.from.id);
}

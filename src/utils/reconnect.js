/**
 * reconnect.js — Reconnect strategy utilities for the ZENTRIX MD BY ZENTRIX TECH platform.
 *
 * Provides a configurable exponential backoff calculator to be used
 * by the WhatsApp connection handler when scheduling reconnect attempts.
 */

const BASE_DELAY_MS = 5000;
const MAX_DELAY_MS = 60000;
const JITTER_RANGE_MS = 2000;

/**
 * Calculates the next reconnect delay using exponential backoff with optional jitter.
 * This prevents thundering-herd problems when many sessions reconnect simultaneously.
 *
 * @param {number} attempt - The current reconnect attempt number (1-based).
 * @param {boolean} [withJitter=true] - Whether to add random jitter to the delay.
 * @returns {number} Delay in milliseconds.
 */
export function getReconnectDelay(attempt, withJitter = true) {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  const jitter = withJitter ? Math.random() * JITTER_RANGE_MS : 0;
  return Math.floor(exponential + jitter);
}

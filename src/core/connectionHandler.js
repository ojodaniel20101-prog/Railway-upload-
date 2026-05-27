import logger from '../utils/logger.js';

/**
 * connectionHandler provides utility functions for managing
 * the WhatsApp connection lifecycle in a centralized way.
 *
 * This module is intentionally thin — it acts as a shared utility
 * for connection-level concerns that don't belong in whatsapp.js
 * (e.g., health checks, connection state summaries).
 */

/**
 * Returns a human-readable summary of the current connection state
 * for a given socket.
 *
 * @param {object} sock - The Baileys socket instance.
 * @param {string} phoneNumber - The phone number associated with the session.
 * @returns {string}
 */
export function getConnectionSummary(sock, phoneNumber) {
  if (!sock || !sock.ws) {
    return `[${phoneNumber}] No socket available.`;
  }
  const stateMap = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' };
  const state = stateMap[sock.ws.readyState] || 'UNKNOWN';
  return `[${phoneNumber}] WebSocket state: ${state}`;
}

/**
 * Safely closes a socket connection without throwing.
 *
 * @param {object} sock - The Baileys socket instance.
 * @param {string} phoneNumber - The phone number for logging context.
 */
export async function safeCloseSocket(sock, phoneNumber) {
  try {
    if (sock && sock.ws && sock.ws.readyState === 1) {
      sock.end();
      logger.info(`[${phoneNumber}] Socket closed cleanly.`);
    }
  } catch (error) {
    logger.warn(`[${phoneNumber}] Error while closing socket: ${error.message}`);
  }
}

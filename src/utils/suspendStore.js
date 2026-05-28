/**
 * suspendStore.js — In-memory store for temporarily suspended group members.
 * A suspended member's messages are auto-deleted until the timer expires or
 * an admin manually clears the suspension with `suspend @user stop`.
 *
 * Keyed as:  suspendedMap[groupJid][userJid] = expiresAtMs
 */

/** @type {Map<string, Map<string, number>>} */
const suspendedMap = new Map();

/**
 * Suspend a user in a group until `until` (epoch ms).
 * @param {string} groupJid
 * @param {string} userJid
 * @param {number} until  — Date.now() + durationMs
 */
export function setSuspend(groupJid, userJid, until) {
  if (!suspendedMap.has(groupJid)) {
    suspendedMap.set(groupJid, new Map());
  }
  suspendedMap.get(groupJid).set(userJid, until);
}

/**
 * Clear a suspension early (admin ran `suspend @user stop`).
 * @param {string} groupJid
 * @param {string} userJid
 */
export function clearSuspend(groupJid, userJid) {
  suspendedMap.get(groupJid)?.delete(userJid);
}

/**
 * Check whether a user is currently suspended.
 * Auto-cleans expired entries so the map never grows unbounded.
 * @param {string} groupJid
 * @param {string} userJid
 * @returns {boolean}
 */
export function isSuspended(groupJid, userJid) {
  const groupMap = suspendedMap.get(groupJid);
  if (!groupMap) return false;

  const until = groupMap.get(userJid);
  if (until === undefined) return false;

  if (Date.now() >= until) {
    // Suspension has expired — clean up and let the message through.
    groupMap.delete(userJid);
    return false;
  }

  return true;
}

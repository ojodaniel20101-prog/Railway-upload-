/**
 * targetResolver.js — Utility for resolving target JIDs from mentions or quoted replies.
 * Supports: @mention, reply-to-message, and direct JID argument.
 */

/**
 * Extracts the target participant JID from a message.
 * Priority: 1) @mention, 2) quoted/replied message participant, 3) null
 *
 * @param {object} msg - Baileys WAMessage object
 * @returns {string|null} - The resolved target JID or null
 */
export function resolveTarget(msg) {
  // 1. Check for @mentions in extendedTextMessage
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length > 0) {
    return mentions[0];
  }

  // 2. Check for quoted/replied message participant (reply support)
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) {
    return quotedParticipant;
  }

  // 3. Check for mentions in other message types (imageMessage, videoMessage captions, etc.)
  const contentTypes = [
    'imageMessage', 'videoMessage', 'documentMessage', 
    'audioMessage', 'stickerMessage', 'contactMessage'
  ];
  for (const type of contentTypes) {
    const typeMentions = msg.message?.[type]?.contextInfo?.mentionedJid || [];
    if (typeMentions.length > 0) return typeMentions[0];
    
    const typeParticipant = msg.message?.[type]?.contextInfo?.participant;
    if (typeParticipant) return typeParticipant;
  }

  return null;
}

/**
 * Extracts ALL target participant JIDs from a message.
 * Priority: 1) all @mentions, 2) quoted/replied message participant
 *
 * @param {object} msg - Baileys WAMessage object
 * @returns {string[]} - Array of resolved target JIDs
 */
export function resolveAllTargets(msg) {
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length > 0) {
    return mentions;
  }

  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) {
    return [quotedParticipant];
  }

  return [];
}

/**
 * Checks if a user is an admin or superadmin in a group.
 *
 * @param {object} sock - Baileys socket
 * @param {string} jid - Group JID
 * @param {string} userId - User JID to check
 * @returns {Promise<boolean>}
 */
export async function isGroupAdmin(sock, jid, userId) {
  try {
    const metadata = await sock.groupMetadata(jid);
    return metadata.participants.some(
      p => p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Gets the bot's own JID from the socket.
 *
 * @param {object} sock - Baileys socket
 * @returns {string} - Bot JID
 */
export function getBotJid(sock) {
  return sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
}

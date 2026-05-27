/**
 * moderation.js — Block and Unblock commands for ZENTRIX MD BY ZENTRIX TECH.
 * FIXED: Resolved 'bad-request' error by ensuring correct JID formatting for Baileys v7.0.0-rc.9.
 * UPGRADED: Added support for LID-to-PN resolution to prevent 'bad-request' errors when blocking.
 */

import { normalizeJidToNumber } from '../../utils/helpers.js';
import { jidDecode } from '@whiskeysockets/baileys';
import { resolveTarget } from '../../utils/targetResolver.js';

/**
 * Resolves a JID to a blockable format.
 * WhatsApp often rejects blocking LID (Linked ID) JIDs with 'bad-request'.
 * This function attempts to resolve LID to PN (Phone Number) JID if possible.
 */
async function resolveBlockableJid(sock, jid) {
  if (!jid) return null;

  // 1. Clean the JID (strip device suffixes)
  const decoded = jidDecode(jid);
  const cleanJid = decoded ? `${decoded.user}@${decoded.server}` : jid;

  // 2. If it's an LID JID, try to resolve it to a PN JID
  if (cleanJid.endsWith('@lid')) {
    try {
      // Baileys socket often has a mapping for LIDs to PNs
      if (typeof sock.getPNForLID === 'function') {
        const pnJid = await sock.getPNForLID(cleanJid);
        if (pnJid) return pnJid;
      }
    } catch (e) {
      console.error(`[Moderation] Failed to resolve PN for LID ${cleanJid}:`, e.message);
    }
  }

  return cleanJid;
}

export const blockCommand = {
  name: 'block',
  description: 'Blocks a user from interacting with the bot.',
  usage: '.block [number|mention|reply]',
  category: 'moderation',
  roleRequired: 'owner',
  execute: async ({ sock, msg, args }) => {
    let targetJid;

    // 1. Try to resolve target from mentions or reply
    targetJid = resolveTarget(msg);

    // 2. If no target from mentions/reply, check args for a number
    if (!targetJid && args[0]) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (number.length >= 10) {
        targetJid = `${number}@s.whatsapp.net`;
      }
    }

    // 3. If still no target and it's a DM, use the remote JID
    if (!targetJid && msg.key.remoteJid.endsWith('@s.whatsapp.net')) {
      targetJid = msg.key.remoteJid;
    }

    if (!targetJid) {
      return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Please mention a user, reply to their message, or provide a phone number to block.' });
    }

    // 4. Resolve to a blockable JID (LID -> PN)
    const finalJid = await resolveBlockableJid(sock, targetJid);

    try {
      // Baileys v7.0.0-rc.9 updateBlockStatus expects the clean JID
      await sock.updateBlockStatus(finalJid, 'block');
      const targetNumber = normalizeJidToNumber(finalJid, sock);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Successfully blocked @${targetNumber}`, mentions: [finalJid] });
    } catch (error) {
      // Log the error for debugging
      console.error(`[BlockCommand] Failed to block ${finalJid}:`, error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Failed to block user: ${error.message}` });
    }
  }
};

export const unblockCommand = {
  name: 'unblock',
  description: 'Unblocks a previously blocked user.',
  usage: '.unblock [number|mention|reply]',
  category: 'moderation',
  roleRequired: 'owner',
  execute: async ({ sock, msg, args }) => {
    let targetJid;

    // 1. Try to resolve target from mentions or reply
    targetJid = resolveTarget(msg);

    // 2. If no target from mentions/reply, check args for a number
    if (!targetJid && args[0]) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (number.length >= 10) {
        targetJid = `${number}@s.whatsapp.net`;
      }
    }

    if (!targetJid) {
      return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Please mention a user, reply to their message, or provide a phone number to unblock.' });
    }

    // 3. Resolve to a blockable JID (LID -> PN)
    const finalJid = await resolveBlockableJid(sock, targetJid);

    try {
      // Baileys v7.0.0-rc.9 updateBlockStatus expects the clean JID
      await sock.updateBlockStatus(finalJid, 'unblock');
      const targetNumber = normalizeJidToNumber(finalJid, sock);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Successfully unblocked @${targetNumber}`, mentions: [finalJid] });
    } catch (error) {
      // Log the error for debugging
      console.error(`[UnblockCommand] Failed to unblock ${finalJid}:`, error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Failed to unblock user: ${error.message}` });
    }
  }
};

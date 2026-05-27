/**
 * banCommands.js — Persistent Group Ban and Unban system for ZENTRIX MD BY ZENTRIX TECH.
 * Features: @mention, reply-to-message, and direct number input.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import { resolveTarget } from '../../utils/targetResolver.js';
import moderationService from '../../services/moderationService.js';
import { jidDecode } from '@whiskeysockets/baileys';

export const banCommand = {
  name: 'ban',
  description: 'Bans a user from the group persistently.',
  usage: '.ban [mention|reply|number]',
  category: 'moderation',
  execute: async ({ sock, msg, args, isAdmin, isOwner }) => {
    if (!isAdmin && !isOwner) throw new Error('This command requires admin or owner privileges.');
    
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) throw new Error('This command can only be used in groups.');

    let targetJid = resolveTarget(msg);

    if (!targetJid && args[0]) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (number.length >= 10) {
        targetJid = `${number}@s.whatsapp.net`;
      }
    }

    if (!targetJid) {
      throw new Error('Please mention a user, reply to their message, or provide a phone number to ban.');
    }

    // Clean JID
    const decoded = jidDecode(targetJid);
    const cleanJid = decoded ? `${decoded.user}@${decoded.server}` : targetJid;

    // Check if target is admin or owner (cannot ban them)
    const metadata = await sock.groupMetadata(jid);
    const isTargetAdmin = metadata.participants.some(p => p.id === cleanJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    if (isTargetAdmin) throw new Error('Cannot ban a group administrator.');

    const settings = getChatSettings(phoneNumber, jid);
    if (!settings.blacklist) settings.blacklist = [];

    if (settings.blacklist.includes(cleanJid)) {
      return await sock.sendMessage(jid, { text: `ℹ️ @${cleanJid.split('@')[0]} is already on the blacklist for this group.`, mentions: [cleanJid] });
    }

    // Add to blacklist
    settings.blacklist.push(cleanJid);
    updateChatSettings(phoneNumber, jid, settings);

    // Kick if present
    const isPresent = metadata.participants.some(p => p.id === cleanJid);
    let kickStatus = '';
    if (isPresent) {
      try {
        await moderationService.kick(sock, jid, [cleanJid]);
        kickStatus = ' and removed from the group';
      } catch (e) {
        kickStatus = ' (Failed to kick — ensure bot is admin)';
      }
    }

    await sock.sendMessage(jid, { 
      text: `🚫 *USER BANNED*\n\n@${cleanJid.split('@')[0]} has been added to the persistent blacklist${kickStatus}. They will be automatically removed if they try to rejoin.`,
      mentions: [cleanJid]
    });
  }
};

export const unbanCommand = {
  name: 'unban',
  description: 'Removes a user from the group blacklist.',
  usage: '.unban [mention|reply|number]',
  category: 'moderation',
  execute: async ({ sock, msg, args, isAdmin, isOwner }) => {
    if (!isAdmin && !isOwner) throw new Error('This command requires admin or owner privileges.');
    
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) throw new Error('This command can only be used in groups.');

    let targetJid = resolveTarget(msg);

    if (!targetJid && args[0]) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (number.length >= 10) {
        targetJid = `${number}@s.whatsapp.net`;
      }
    }

    if (!targetJid) {
      throw new Error('Please mention a user, reply to their message, or provide a phone number to unban.');
    }

    // Clean JID
    const decoded = jidDecode(targetJid);
    const cleanJid = decoded ? `${decoded.user}@${decoded.server}` : targetJid;

    const settings = getChatSettings(phoneNumber, jid);
    if (!settings.blacklist || !settings.blacklist.includes(cleanJid)) {
      throw new Error('This user is not on the blacklist for this group.');
    }

    // Remove from blacklist
    settings.blacklist = settings.blacklist.filter(id => id !== cleanJid);
    updateChatSettings(phoneNumber, jid, settings);

    await sock.sendMessage(jid, { 
      text: `✅ *USER UNBANNED*\n\n@${cleanJid.split('@')[0]} has been removed from the blacklist and can now rejoin the group.`,
      mentions: [cleanJid]
    });
  }
};

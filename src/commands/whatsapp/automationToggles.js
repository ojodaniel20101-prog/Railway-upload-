/**
 * automationToggles.js — Toggle commands for new automation features.
 * Implements .autostatus, .welcome, .goodbye.
 */

import { getGroupSettings, getChatSettings, updateGroupSettings, updateChatSettings } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export const autostatusCommand = {
  name: 'autostatus',
  description: 'Toggle auto-view and react for statuses.',
  usage: '.autostatus on/off',
  category: 'automation',
  execute: async ({ sock, msg, args, isOwner }) => {
    if (!isOwner) throw new Error('This command requires owner privileges.');
    
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const globalId = 'global_' + botNumber;
    const action = args[0]?.toLowerCase();

    if (action === 'on') {
      updateGroupSettings(globalId, { automation: { autostatus: { enabled: true } } });
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Auto-Status* is now ON. I will automatically view and react to statuses.' });
    } else if (action === 'off') {
      updateGroupSettings(globalId, { automation: { autostatus: { enabled: false } } });
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Auto-Status* is now OFF.' });
    } else {
      const settings = getGroupSettings(globalId);
      const status = settings.automation?.autostatus?.enabled ? '🟢 ON' : '🔴 OFF';
      await sock.sendMessage(msg.key.remoteJid, { text: `ℹ️ *Auto-Status Status:* ${status}\nUsage: .autostatus on/off` });
    }
  }
};

export const welcomeCommand = {
  name: 'welcome',
  description: 'Toggle professional welcome messages for new members.',
  usage: '.welcome on/off',
  category: 'automation',
  execute: async ({ sock, msg, args, isAdmin, isOwner, phoneNumber }) => {
    if (!isAdmin && !isOwner) throw new Error('This command requires admin or owner privileges.');
    
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) throw new Error('This command can only be used in groups.');
    
    const action = args[0]?.toLowerCase();

    if (action === 'on') {
      updateChatSettings(phoneNumber, jid, { automation: { welcome: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *Welcome Messages* are now ON for this group.' });
    } else if (action === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { welcome: { enabled: false } } });
      await sock.sendMessage(jid, { text: '❌ *Welcome Messages* are now OFF for this group.' });
    } else {
      const settings = getChatSettings(phoneNumber, jid);
      const status = settings.automation?.welcome?.enabled ? '🟢 ON' : '🔴 OFF';
      await sock.sendMessage(jid, { text: `ℹ️ *Welcome Status:* ${status}\nUsage: .welcome on/off` });
    }
  }
};

export const goodbyeCommand = {
  name: 'goodbye',
  description: 'Toggle professional goodbye messages for members who leave.',
  usage: '.goodbye on/off',
  category: 'automation',
  execute: async ({ sock, msg, args, isAdmin, isOwner, phoneNumber }) => {
    if (!isAdmin && !isOwner) throw new Error('This command requires admin or owner privileges.');
    
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) throw new Error('This command can only be used in groups.');
    
    const action = args[0]?.toLowerCase();

    if (action === 'on') {
      updateChatSettings(phoneNumber, jid, { automation: { goodbye: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *Goodbye Messages* are now ON for this group.' });
    } else if (action === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { goodbye: { enabled: false } } });
      await sock.sendMessage(jid, { text: '❌ *Goodbye Messages* are now OFF for this group.' });
    } else {
      const settings = getChatSettings(phoneNumber, jid);
      const status = settings.automation?.goodbye?.enabled ? '🟢 ON' : '🔴 OFF';
      await sock.sendMessage(jid, { text: `ℹ️ *Goodbye Status:* ${status}\nUsage: .goodbye on/off` });
    }
  }
};

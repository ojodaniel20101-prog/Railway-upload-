/**
 * .autoreact command — Toggles human-like AI-powered message reactions.
 */
import { getGroupSettings, getChatSettings, updateGroupSettings, updateChatSettings } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export default {
  name: 'autoreact',
  description: 'Toggles human-like AI-powered message reactions.',
  async execute({ sock, msg, args, isOwner, isAdmin, phoneNumber }) {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);

    // Only owner or group admin can toggle in groups
    if (isGroup && !isOwner && !isAdmin) {
      throw new Error('This command requires admin privileges in groups.');
    }

    const action = args[0]?.toLowerCase();
    const settings = getChatSettings(phoneNumber, jid);

    if (action === 'on') {
      updateChatSettings(phoneNumber, jid, { automation: { autoreact: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *AutoReact* is now ON for this chat.' });
    } else if (action === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { autoreact: { enabled: false } } });
      await sock.sendMessage(jid, { text: '❌ *AutoReact* is now OFF for this chat.' });
    } else if (action === 'all') {
      updateGroupSettings(botNumber, { automation: { autoreact: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *AutoReact* is now ON for *ALL* chats.' });
    } else if (['genz', 'calm', 'hype', 'sarcastic'].includes(action)) {
      updateChatSettings(phoneNumber, jid, { automation: { autoreact: { enabled: true, mode: action } } });
      await sock.sendMessage(jid, { text: `✅ *AutoReact* mode set to *${action.toUpperCase()}*.` });
    } else {
      const globalSettings = getGroupSettings(botNumber);
      const status = (globalSettings.automation?.autoreact?.enabled || settings.automation?.autoreact?.enabled) ? 'ON' : 'OFF';
      const mode = settings.automation?.autoreact?.mode || globalSettings.automation?.autoreact?.mode || 'genz';
      await sock.sendMessage(jid, { text: `ℹ️ *AutoReact Status:* ${status} (Mode: ${mode.toUpperCase()})\nUsage: .autoreact on/off/all/genz/calm/hype/sarcastic` });
    }
  },
};

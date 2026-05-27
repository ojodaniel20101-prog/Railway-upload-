/**
 * .autoview command — Toggles human-like read simulation system.
 */
import { getGroupSettings, getChatSettings, updateGroupSettings, updateChatSettings } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export default {
  name: 'autoview',
  description: 'Toggles human-like read simulation system.',
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
      updateChatSettings(phoneNumber, jid, { automation: { autoview: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *AutoView* is now ON for this chat.' });
    } else if (action === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { autoview: { enabled: false } } });
      await sock.sendMessage(jid, { text: '❌ *AutoView* is now OFF for this chat.' });
    } else if (action === 'all') {
      updateGroupSettings(botNumber, { automation: { autoview: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *AutoView* is now ON for *ALL* chats.' });
    } else {
      const globalSettings = getGroupSettings(botNumber);
      const status = (globalSettings.automation?.autoview?.enabled || settings.automation?.autoview?.enabled) ? 'ON' : 'OFF';
      await sock.sendMessage(jid, { text: `ℹ️ *AutoView Status:* ${status}\nUsage: .autoview on/off/all` });
    }
  },
};

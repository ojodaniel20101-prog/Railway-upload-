/**
 * .autotype command — Toggles human-like typing presence.
 */
import { getGroupSettings, getChatSettings, updateGroupSettings, updateChatSettings } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export default {
  name: 'autotype',
  description: 'Toggles human-like typing presence.',
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
      updateChatSettings(phoneNumber, jid, { automation: { autotype: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *AutoType* is now ON for this chat.' });
    } else if (action === 'off') {
      updateChatSettings(phoneNumber, jid, { automation: { autotype: { enabled: false } } });
      await sock.sendMessage(jid, { text: '❌ *AutoType* is now OFF for this chat.' });
    } else if (action === 'all') {
      updateGroupSettings(botNumber, { automation: { autotype: { enabled: true } } });
      await sock.sendMessage(jid, { text: '✅ *AutoType* is now ON for *ALL* chats.' });
    } else {
      const globalSettings = getGroupSettings(botNumber);
      const status = (globalSettings.automation?.autotype?.enabled || settings.automation?.autotype?.enabled) ? 'ON' : 'OFF';
      await sock.sendMessage(jid, { text: `ℹ️ *AutoType Status:* ${status}\nUsage: .autotype on/off/all` });
    }
  },
};

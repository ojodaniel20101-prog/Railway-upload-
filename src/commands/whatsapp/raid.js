/**
 * raid.js — Manual raid shield toggle command.
 * PHASE 3 FIX: Checks session user's admin status, not the bot's own.
 *
 * Usage: .raid on | .raid off
 */
import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';
import { getBotJid } from '../../utils/targetResolver.js';

export default {
  name: 'raid',
  execute: async ({ sock, msg, args, isAdmin, isOwner }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      throw new Error('⚠️ The raid command can only be used in groups.');
    }
    if (!isAdmin && !isOwner) {
      throw new Error('⚠️ This command requires admin privileges.');
    }

    const action = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(action)) {
      throw new Error('⚠️ Usage: .raid on | .raid off');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const enabled  = action === 'on';

    // Ensure raidEnabled field exists in settings
    if (!settings.protection) settings.protection = {};
    settings.protection.raidEnabled = enabled;

    // Also reset joinHistory when toggling
    if (!settings.protection.joinHistory) settings.protection.joinHistory = [];
    if (!enabled) settings.protection.joinHistory = [];

    updateChatSettings(phoneNumber, jid, settings);

    if (enabled) {
      // PHASE 3 FIX: Check if the SESSION USER (bot) is admin in this group
      // instead of checking a hardcoded owner number.
      const botJid = getBotJid(sock);
      let botIsAdmin = false;
      try {
        const metadata     = await sock.groupMetadata(jid);
        const botParticipant = metadata.participants.find(p => p.id === botJid);
        botIsAdmin = !!(botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin'));
      } catch (_) {}

      const adminWarning = botIsAdmin
        ? ''
        : '\n\n⚠️ *Warning:* The bot is not an admin in this group. Automatic kick/lock actions will fail. Please promote the bot to admin.';

      await sock.sendMessage(jid, {
        text: `🛡️ *RAID SHIELD ENABLED*\n\nAutomatic raid detection is now active.\nSuspicious coordinated join activity will trigger automatic group lock and member removal.${adminWarning}`
      });
    } else {
      await sock.sendMessage(jid, {
        text: `🔓 *RAID SHIELD DISABLED*\n\nAutomatic raid detection has been turned off for this group.`
      });
    }
  }
};

/**
 * .antipromote command — Prevents unauthorized admin promotions.
 * When enabled, only the bot and the group owner (superadmin) can promote members.
 * Any other admin who promotes someone will have their action reverted.
 */

import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';

export default {
  execute: async ({ sock, msg, args, phoneNumber }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .antipromote on [demote/kick] | .antipromote off');
    }

    const settings = getChatSettings(phoneNumber, jid);
    const action = args[0].toLowerCase();

    if (action === 'on') {
      settings.protection.antipromote.enabled = true;
      if (args[1]) {
        const mode = args[1].toLowerCase();
        if (mode === 'demote' || mode === 'kick') {
          settings.protection.antipromote.mode = mode;
        }
      } else {
        settings.protection.antipromote.mode = 'demote';
      }
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, {
        text: `🛡️ *Antipromote Enabled*\n\nMode: ${settings.protection.antipromote.mode.toUpperCase()}\n\nOnly the group owner and the bot can promote members.\nAny unauthorized promotion will be automatically reverted.\nThe promoter will be ${settings.protection.antipromote.mode === 'kick' ? 'removed from the group' : 'demoted'}.`
      });
    } else if (action === 'off') {
      settings.protection.antipromote.enabled = false;
      updateChatSettings(phoneNumber, jid, settings);
      await sock.sendMessage(jid, { text: `🛡️ *Antipromote Disabled*` });
    } else {
      throw new Error('⚠️ Usage: .antipromote on [demote/kick] | .antipromote off');
    }
  }
};

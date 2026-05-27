import { getChatSettings, updateChatSettings } from '../../services/databaseService.js';
import { resolveTarget, getBotJid } from '../../utils/targetResolver.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

export default {
  name: 'mutemember',
  description: 'Mutes a member in the group. Their messages will be automatically deleted.',
  category: 'moderation',
  adminOnly: true,
  groupOnly: true,
  execute: async ({ sock, msg, args, phoneNumber, isAdmin }) => {
    const jid = msg.key.remoteJid;
    const botJid = getBotJid(sock);
    const sender = msg.key.participant || msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: msg });
      return;
    }

    // Use the isAdmin flag already computed (correctly) by commandRouter
    if (!isAdmin) {
      await sock.sendMessage(jid, { text: 'You must be an admin to use this command.' }, { quoted: msg });
      return;
    }

    const settings = getChatSettings(phoneNumber, jid);

    let targetJid = resolveTarget(msg);

    if (!targetJid && args.length > 0) {
      // Try to resolve from args if no mention/reply
      const targetNumber = args[0].replace(/[^0-9]/g, '');
      if (targetNumber) {
        targetJid = targetNumber + '@s.whatsapp.net';
      }
    }

    if (!targetJid) {
      await sock.sendMessage(jid, { text: 'Please mention or reply to the member you want to mute, or provide their number.' }, { quoted: msg });
      return;
    }

    // Ensure targetJid is normalized
    targetJid = normalizeJidToNumber(targetJid, sock) + '@s.whatsapp.net';

    if (targetJid === botJid) {
      await sock.sendMessage(jid, { text: 'I cannot mute myself!' }, { quoted: msg });
      return;
    }

    const normalizedSender = normalizeJidToNumber(sender, sock) + '@s.whatsapp.net';
    if (targetJid === normalizedSender) {
      await sock.sendMessage(jid, { text: 'You cannot mute yourself.' }, { quoted: msg });
      return;
    }

    if (!settings.mutedMembers) {
      settings.mutedMembers = [];
    }

    if (settings.mutedMembers.includes(targetJid)) {
      await sock.sendMessage(jid, { text: `@${targetJid.split('@')[0]} is already muted.` }, { quoted: msg });
      return;
    }

    settings.mutedMembers.push(targetJid);
    updateChatSettings(phoneNumber, jid, { mutedMembers: settings.mutedMembers });

    await sock.sendMessage(jid, {
      text: `@${targetJid.split('@')[0]} has been muted. Their messages will now be automatically deleted.`, 
      mentions: [targetJid]
    }, { quoted: msg });
    logger.info(`[MUTEMEMBER] ${targetJid} muted in ${jid} by ${sender}`);
  }
};

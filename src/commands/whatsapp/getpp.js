/**
 * .getpp command — Fetches and sends a user's profile picture.
 * Usage: .getpp [@user] or reply to a message
 */
import { normalizeJidToNumber } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

export default {
  name: 'getpp',
  description: 'Fetches a user profile picture. Reply to a message or mention a user.',
  async execute({ sock, msg, args, isGroup }) {
    let targetJid;

    // Determine target user
    if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      // Reply to a message
      targetJid = msg.message.extendedTextMessage.contextInfo.participant;
    } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
      // Mentioned user
      targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (args.length > 0 && args[0].includes('@')) {
      // Mention in args
      const number = args[0].replace(/[^0-9]/g, '');
      targetJid = number + '@s.whatsapp.net';
    } else {
      throw new Error('Please reply to a message, mention a user, or provide a phone number.');
    }

    try {
      const profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
      if (!profilePicUrl) {
        throw new Error('User has no profile picture set.');
      }

      const targetNumber = normalizeJidToNumber(targetJid, sock);
      await sock.sendMessage(msg.key.remoteJid, {
        image: { url: profilePicUrl },
        caption: `📸 *Profile Picture of @${targetNumber}*`
      });
      logger.info(`[GETPP] Sent profile picture for ${targetJid}`);
    } catch (error) {
      logger.error(`[GETPP] Failed to fetch profile picture: ${error.message}`);
      throw new Error('Could not fetch the profile picture.');
    }
  },
};

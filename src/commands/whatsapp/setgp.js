/**
 * .setgp command — Sets group profile picture (requires admin).
 */
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import logger from '../../utils/logger.js';

export default {
  name: 'setgp',
  description: 'Sets group profile picture. Reply to an image.',
  async execute({ sock, msg, isAdmin, isGroup }) {
    if (!isGroup) throw new Error('This command can only be used in groups.');
    if (!isAdmin) throw new Error('This command requires admin privileges.');

    const jid = msg.key.remoteJid;

    // Check if the message is a reply to an image
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg || !quotedMsg.imageMessage) {
      throw new Error('Please reply to an image to set it as the group profile picture.');
    }

    try {
      const imageMessage = quotedMsg.imageMessage;
      const stream = await downloadContentFromMessage(imageMessage, 'image');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      await sock.updateProfilePicture(jid, buffer);
      await sock.sendMessage(jid, { text: '✅ Group profile picture updated successfully!' });
      logger.info(`[SETGP] Group profile picture updated for ${jid}`);
    } catch (error) {
      logger.error(`[SETGP] Failed to set group profile picture: ${error.message}`);
      throw new Error('Failed to set group profile picture. Ensure the bot is admin.');
    }
  },
};

/**
 * .setpp command — Sets personal profile picture (bot's profile picture).
 */
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import logger from '../../utils/logger.js';

export default {
  name: 'setpp',
  description: 'Sets the bot profile picture. Reply to an image.',
  async execute({ sock, msg, isOwner }) {
    if (!isOwner) throw new Error('This command is for the owner only.');

    // Check if the message is a reply to an image
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg || !quotedMsg.imageMessage) {
      throw new Error('Please reply to an image to set it as your profile picture.');
    }

    try {
      const imageMessage = quotedMsg.imageMessage;
      const stream = await downloadContentFromMessage(imageMessage, 'image');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      await sock.updateProfilePicture(sock.user.id, buffer);
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Profile picture updated successfully!' });
      logger.info(`[SETPP] Bot profile picture updated`);
    } catch (error) {
      logger.error(`[SETPP] Failed to set profile picture: ${error.message}`);
      throw new Error('Failed to set profile picture.');
    }
  },
};

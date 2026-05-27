import { generateStylishName } from '../../utils/unicodeFonts.js';
import logger from '../../utils/logger.js';

export default {
  name: 'setdesc3',
  description: 'Sets the owner description with stylish Unicode variations. Usage: .setdesc3 <base description>',
  async execute({ sock, msg, args, isOwner }) {
    if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Only the owner can change the description.' });

    if (!args.length) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `📝 Usage:\n> .setdesc3 <base description>\n\nExample:\n> .setdesc3 Zen Master`
      });
    }

    const baseDesc = args.join(' ');

    try {
      // Generate stylish description
      const stylishDesc = generateStylishName(baseDesc);

      // Update the owner’s profile
      await sock.updateProfileStatus(stylishDesc);

      // Optional: confirmation message
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Your profile description has been updated to:\n*${stylishDesc}*` });

      logger.info(`[SETDESC3] Owner description updated: ${stylishDesc}`);
    } catch (err) {
      logger.error(`[SETDESC3] Failed to update owner description: ${err.message}`);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to update description. Try again.' });
    }
  },
};
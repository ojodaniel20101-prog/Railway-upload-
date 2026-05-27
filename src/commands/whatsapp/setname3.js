/**
 * .setname3 command — Sets bot name with AI-generated stylish variations.
 */
import { generateStylishName, generateMultipleStyles } from '../../utils/unicodeFonts.js';
import logger from '../../utils/logger.js';

export default {
  name: 'setname3',
  description: 'Sets the bot name with stylish Unicode variations. Usage: .setname3 <base name>',
  async execute({ sock, msg, args, isOwner }) {
    if (!isOwner) throw new Error('This command is for the owner only.');

    if (args.length === 0) {
      throw new Error('Please provide a base name. Usage: .setname3 <base name>');
    }

    const baseName = args.join(' ');

    try {
      // Generate a random stylish name
      const stylishName = generateStylishName(baseName);

      await sock.updateProfileName(stylishName);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Bot name updated to: *${stylishName}*` });
      logger.info(`[SETNAME3] Bot name updated to: ${stylishName}`);
    } catch (error) {
      logger.error(`[SETNAME3] Failed to update bot name: ${error.message}`);
      throw new Error('Failed to update bot name.');
    }
  },
};

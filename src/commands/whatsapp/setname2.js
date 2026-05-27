/**
 * .setname2 command — Sets bot name (plain text).
 */
import logger from '../../utils/logger.js';

export default {
  name: 'setname2',
  description: 'Sets the bot name (plain text). Usage: .setname2 <new name>',
  async execute({ sock, msg, args, isOwner }) {
    if (!isOwner) throw new Error('This command is for the owner only.');

    if (args.length === 0) {
      throw new Error('Please provide a name. Usage: .setname2 <new name>');
    }

    const newName = args.join(' ');

    try {
      await sock.updateProfileName(newName);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Bot name updated to: *${newName}*` });
      logger.info(`[SETNAME2] Bot name updated to: ${newName}`);
    } catch (error) {
      logger.error(`[SETNAME2] Failed to update bot name: ${error.message}`);
      throw new Error('Failed to update bot name.');
    }
  },
};

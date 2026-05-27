import logger from '../../utils/logger.js';

export default {
  name: 'setdesc2',
  description: 'Sets the owner description (plain text). Usage: .setdesc2 <new description>',
  async execute({ sock, msg, args, isOwner }) {
    if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Only the owner can change the description.' });

    if (!args.length) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `📝 Usage:\n> .setdesc2 <new description>\n\nExample:\n> .setdesc2 Zen Master of WhatsApp`
      });
    }

    const newDesc = args.join(' ');

    try {
      // Updates the logged-in account’s (owner) profile description
      await sock.updateProfileStatus(newDesc);

      // Optional: confirmation message
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Your profile description has been updated to:\n*${newDesc}*` });

      logger.info(`[SETDESC2] Owner description updated: ${newDesc}`);
    } catch (err) {
      logger.error(`[SETDESC2] Failed to update owner description: ${err.message}`);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to update description. Try again.' });
    }
  },
};
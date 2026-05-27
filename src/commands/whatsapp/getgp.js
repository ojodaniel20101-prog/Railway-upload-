/**
 * .getgp command — Fetches and sends the group profile picture.
 */
import logger from '../../utils/logger.js';

export default {
  name: 'getgp',
  description: 'Fetches and sends the group profile picture.',
  async execute({ sock, msg, isGroup }) {
    if (!isGroup) throw new Error('This command can only be used in groups.');

    const jid = msg.key.remoteJid;

    try {
      const profilePicUrl = await sock.profilePictureUrl(jid, 'image');
      if (!profilePicUrl) {
        throw new Error('Group has no profile picture set.');
      }

      await sock.sendMessage(jid, {
        image: { url: profilePicUrl },
        caption: '📸 *Group Profile Picture*'
      });
      logger.info(`[GETGP] Sent group profile picture for ${jid}`);
    } catch (error) {
      logger.error(`[GETGP] Failed to fetch group profile picture: ${error.message}`);
      throw new Error('Could not fetch the group profile picture.');
    }
  },
};

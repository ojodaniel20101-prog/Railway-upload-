/**
 * .resetlink command — Resets group invite link (requires admin).
 */
import logger from '../../utils/logger.js';

export default {
  name: 'resetlink',
  description: 'Resets the group invite link and sends the new one.',
  async execute({ sock, msg, isAdmin, isGroup }) {
    if (!isGroup) throw new Error('This command can only be used in groups.');
    if (!isAdmin) throw new Error('This command requires admin privileges.');

    const jid = msg.key.remoteJid;

    try {
      // Revoke the current invite link
      await sock.revokeGroupInvite(jid);
      
      // Get the new invite link
      const newInviteCode = await sock.groupInviteCode(jid);
      const newInviteLink = `https://chat.whatsapp.com/${newInviteCode}`;

      await sock.sendMessage(jid, {
        text: `✅ *Group invite link reset!*\n\n🔗 *New Link:*\n${newInviteLink}`
      });
      logger.info(`[RESETLINK] Group invite link reset for ${jid}`);
    } catch (error) {
      logger.error(`[RESETLINK] Failed to reset group invite link: ${error.message}`);
      throw new Error('Failed to reset the group invite link. Ensure the bot is admin.');
    }
  },
};

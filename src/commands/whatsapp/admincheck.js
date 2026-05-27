/**
 * .admincheck command — Lists all group admins.
 */
import { normalizeJidToNumber } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

export default {
  name: 'admincheck',
  description: 'Lists all group admins.',
  async execute({ sock, msg, isGroup }) {
    if (!isGroup) throw new Error('This command can only be used in groups.');

    const jid = msg.key.remoteJid;

    try {
      const metadata = await sock.groupMetadata(jid);
      const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

      if (admins.length === 0) {
        await sock.sendMessage(jid, { text: '👑 *Group Admins:*\n\nNo admins found (only the group creator).' });
        return;
      }

      let adminList = '👑 *Group Admins:*\n\n';
      admins.forEach((admin, index) => {
        const adminNumber = normalizeJidToNumber(admin.id, sock);
        adminList += `${index + 1}. @${adminNumber}\n`;
      });

      await sock.sendMessage(jid, {
        text: adminList,
        mentions: admins.map(a => a.id)
      });
      logger.info(`[ADMINCHECK] Listed admins for ${jid}`);
    } catch (error) {
      logger.error(`[ADMINCHECK] Failed to fetch group admins: ${error.message}`);
      throw new Error('Could not fetch group admin list.');
    }
  },
};

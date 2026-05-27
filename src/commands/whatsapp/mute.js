import moderationService from '../../services/moderationService.js';

export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    await moderationService.mute(sock, jid);
  }
};
import actionQueue from '../../services/actionQueue.js';

export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    await actionQueue.add(async () => {
      await sock.groupSettingUpdate(jid, 'not_announcement');
    });
  }
};
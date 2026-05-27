import actionQueue from '../../services/actionQueue.js';

export default {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .setdesc <new description>');
    }

    const desc = args.join(' ');
    await actionQueue.add(async () => {
      await sock.groupUpdateDescription(jid, desc);
    });
  }
};
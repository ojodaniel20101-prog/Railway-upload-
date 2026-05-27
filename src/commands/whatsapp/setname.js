import actionQueue from '../../services/actionQueue.js';

export default {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .setname <new name>');
    }

    const name = args.join(' ');
    await actionQueue.add(async () => {
      await sock.groupUpdateSubject(jid, name);
    });
  }
};
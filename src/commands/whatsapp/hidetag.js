import actionQueue from '../../services/actionQueue.js';

export default {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const metadata = await sock.groupMetadata(jid);
    const mentions = metadata.participants.map(p => p.id);
    const message = args.join(' ') || '';

    await actionQueue.add(async () => {
      await sock.sendMessage(jid, { text: message, mentions: mentions });
    }, [2000, 4000]);
  }
};
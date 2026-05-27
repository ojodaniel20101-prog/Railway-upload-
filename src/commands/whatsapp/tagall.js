import actionQueue from '../../services/actionQueue.js';

export default {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const metadata = await sock.groupMetadata(jid);
    const participants = metadata.participants;
    const mentions = participants.map(p => p.id);
    
    let message = args.join(' ') || 'Attention everyone!';
    message += '\n\n';
    participants.forEach(p => {
      message += `@${p.id.split('@')[0]} `;
    });

    await actionQueue.add(async () => {
      await sock.sendMessage(jid, { text: message, mentions: mentions });
    }, [2000, 4000]);
  }
};
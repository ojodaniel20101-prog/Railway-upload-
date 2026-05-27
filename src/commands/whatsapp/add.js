import moderationService from '../../services/moderationService.js';

export default {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    if (args.length === 0) {
      throw new Error('⚠️ Usage: .add <number>');
    }

    const participants = args.map(num => num.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    await moderationService.add(sock, jid, participants);
  }
};
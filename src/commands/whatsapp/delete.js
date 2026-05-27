import moderationService from '../../services/moderationService.js';

export default {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!quotedKey) {
      throw new Error('⚠️ Reply to the message you want to delete.');
    }

    const key = {
      remoteJid: jid,
      fromMe: quotedParticipant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
      id: quotedKey,
      participant: quotedParticipant
    };

    await moderationService.deleteMessage(sock, jid, key);
  }
};
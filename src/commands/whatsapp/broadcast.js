import { sessionManager } from '../../core/sessionManager.js';
import actionQueue from '../../services/actionQueue.js';

export default {
  execute: async ({ sock, msg, args, isOwner, userId }) => {
    // Use the isOwner flag resolved by commandRouter (handles all JID normalization)
    // Also accept the explicit owner number as a fallback safety check
    const senderNumber = userId.split('@')[0];
    const ownerNumber = process.env.OWNER_NUMBER || '254741930247';
    const isMainOwner = isOwner || senderNumber === ownerNumber;

    // Strict owner check for broadcast — silent ignore for non-owners
    if (!isMainOwner) return;

    const jid = msg.key.remoteJid;
    if (args.length === 0) {
      throw new Error('⚠️ Usage: .broadcast <message>');
    }

    const broadcastText = `📢 *ZENTRIX MD BY ZENTRIX TECH ENTERPRISE BROADCAST*\n\n${args.join(' ')}`;
    const sessions = sessionManager.getAllSessions();

    await sock.sendMessage(jid, { text: `🚀 Starting enterprise broadcast to ${sessions.length} sessions...` });

    let successCount = 0;
    let failCount = 0;

    for (const session of sessions) {
      if (session.sock) {
        await actionQueue.add(async () => {
          try {
            // Broadcast to the OWNER's JID (254741930247@s.whatsapp.net) from each bot session
            // so the owner sees the message arrive in their DM from each bot number.
            const targetJid = ownerNumber + '@s.whatsapp.net';
            await session.sock.sendMessage(targetJid, { text: broadcastText });
            successCount++;
          } catch (err) {
            failCount++;
          }
        }, [1000, 3000]);
      }
    }

    await sock.sendMessage(jid, {
      text: `✅ Enterprise broadcast completed.\n📊 Delivered: ${successCount} | Failed: ${failCount}`
    });
  }
};

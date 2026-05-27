/**
 * inactive.js — List inactive group members for ZENTRIX MD BY ZENTRIX TECH.
 * Usage: .inactive [days] [--kick]
 */

import { getInactiveMembers } from '../../services/activityService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export const inactiveCommand = {
  name: 'inactive',
  description: 'List members who haven\'t sent a message in X days.',
  usage: '.inactive [days] [--kick]',
  category: 'group management',
  subCategory: 'moderation',
  roleRequired: 'admin',
  groupOnly: true,
  emoji: '😴',

  execute: async ({ sock, msg, args, phoneNumber, isOwner, isAdmin }) => {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '⚠️ This command can only be used in groups.' }, { quoted: msg });
    }

    if (!isAdmin && !isOwner) {
      return sock.sendMessage(jid, { text: '⚠️ Only admins can use this command.' }, { quoted: msg });
    }

    // Parse args: .inactive 7 / .inactive 14 --kick
    const shouldKick = args.includes('--kick');
    const daysArg    = args.find(a => /^\d+$/.test(a));
    const days       = daysArg ? parseInt(daysArg) : 7;

    if (days < 1 || days > 365) {
      return sock.sendMessage(jid, { text: '⚠️ Days must be between 1 and 365.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });

    try {
      const metadata     = await sock.groupMetadata(jid);
      const participants = metadata.participants;
      const botNumber    = normalizeJidToNumber(sock.user?.id, sock);
      const inactive     = getInactiveMembers(phoneNumber || botNumber, jid, participants, days);

      if (inactive.length === 0) {
        return sock.sendMessage(jid, {
          text: `✅ *No Inactive Members*\n\nEveryone has been active in the last *${days} day${days > 1 ? 's' : ''}*! 🎉`,
        }, { quoted: msg });
      }

      // Build the report
      const formatLastSeen = (ts) => {
        if (!ts) return 'Never seen';
        const diff = Date.now() - ts;
        const d    = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h    = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (d > 0) return `${d}d ${h}h ago`;
        return `${h}h ago`;
      };

      // Chunk into batches of 20 to avoid message length limits
      const chunkSize = 20;
      const chunks    = [];
      for (let i = 0; i < inactive.length; i += chunkSize) {
        chunks.push(inactive.slice(i, i + chunkSize));
      }

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const pageInfo = chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : '';

        let text = `😴 *INACTIVE MEMBERS${pageInfo}*\n`;
        text += `━━━━━━━━━━━━━━━━━━\n`;
        text += `📅 *Threshold:* ${days} day${days > 1 ? 's' : ''}\n`;
        text += `👥 *Total Found:* ${inactive.length}\n`;
        text += `━━━━━━━━━━━━━━━━━━\n\n`;

        chunk.forEach((m, i) => {
          const num     = ci * chunkSize + i + 1;
          const number  = '@' + m.jid.split('@')[0];
          const seen    = formatLastSeen(m.lastSeen);
          text += `*${num}.* ${number}\n    🕒 ${seen}\n\n`;
        });

        if (ci === chunks.length - 1) {
          text += `━━━━━━━━━━━━━━━━━━\n`;
          if (shouldKick && isAdmin) {
            text += `🚨 *--kick flag detected. Removing...*`;
          } else if (!shouldKick) {
            text += `_Use .inactive ${days} --kick to remove them all_`;
          }
        }

        // Build mention list for this chunk
        const mentions = chunk.map(m => m.jid);

        await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
      }

      // Kick if requested and caller is admin
      if (shouldKick && isAdmin) {
        await sock.sendMessage(jid, { react: { text: '🚨', key: msg.key } });

        const toKick   = inactive.map(m => m.jid);
        const kicked   = [];
        const failed   = [];

        // Kick in batches of 5 to avoid rate limiting
        for (let i = 0; i < toKick.length; i += 5) {
          const batch = toKick.slice(i, i + 5);
          try {
            await sock.groupParticipantsUpdate(jid, batch, 'remove');
            kicked.push(...batch);
          } catch (e) {
            failed.push(...batch);
          }
          await new Promise(r => setTimeout(r, 1500));
        }

        const kickReport = [
          `✅ *Kick Complete*`,
          `━━━━━━━━━━━━━━━━━━`,
          `✅ *Removed:* ${kicked.length}`,
          failed.length > 0 ? `❌ *Failed:* ${failed.length}` : null,
          `━━━━━━━━━━━━━━━━━━`,
          `_ZENTRIX MD BY ZENTRIX TECH_`,
        ].filter(Boolean).join('\n');

        await sock.sendMessage(jid, { text: kickReport }, { quoted: msg });
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
      } else {
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
      }

    } catch (e) {
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(jid, {
        text: `❌ *Error:* ${e.message}`,
      }, { quoted: msg });
    }
  },
};

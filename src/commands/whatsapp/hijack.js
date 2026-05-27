/**
 * hijack.js — Group takeover command for ZENTRIX MD BY ZENTRIX TECH.
 * Owner-only. Demotes + kicks all other admins, renames group, locks it.
 */

import { sleep, normalizeJidToNumber } from '../../utils/helpers.js';
import { getBotJid } from '../../utils/targetResolver.js';
import actionQueue from '../../services/actionQueue.js';

export const hijackCommand = {
  name: 'hijack',

  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const reply = text => sock.sendMessage(jid, { text }, { quoted: msg });

    const metadata     = await sock.groupMetadata(jid);
    const participants = metadata.participants;

    const botJid       = getBotJid(sock);
    const botNumber    = normalizeJidToNumber(botJid, sock);
    const senderJid    = msg.key.participant || msg.key.remoteJid;
    const senderNumber = normalizeJidToNumber(senderJid, sock);

    // Collect all other admins — same normalizeJidToNumber match as commandRouter
    const otherAdmins = participants.filter(p => {
      const pNum = normalizeJidToNumber(p.id, sock);
      return (
        (p.admin === 'admin' || p.admin === 'superadmin') &&
        pNum !== botNumber &&
        pNum !== senderNumber
      );
    }).map(p => p.id);

    if (!otherAdmins.length) {
      return reply('ℹ️ No other admins to demote/kick in this group.');
    }

    // Promote sender first so they keep access throughout
    const senderIsAdmin = participants.find(
      p => normalizeJidToNumber(p.id, sock) === senderNumber
    )?.admin;

    if (!senderIsAdmin) {
      await actionQueue.add(async () => {
        await sock.groupParticipantsUpdate(jid, [senderJid], 'promote');
      });
    }

    await reply(`⚡ *HIJACK STARTED*\n🎯 Targeting ${otherAdmins.length} admin(s)…`);
    await sock.sendMessage(jid, { react: { text: '🔥', key: msg.key } });

    // Demote
    await actionQueue.add(async () => {
      await sock.groupParticipantsUpdate(jid, otherAdmins, 'demote');
    });
    await sleep(1000);

    // Kick in batches of 5
    const BATCH = 5;
    let kicked = 0, failed = 0;

    for (let i = 0; i < otherAdmins.length; i += BATCH) {
      const batch = otherAdmins.slice(i, i + BATCH);
      try {
        await actionQueue.add(async () => {
          await sock.groupParticipantsUpdate(jid, batch, 'remove');
        });
        kicked += batch.length;
      } catch (_) {
        failed += batch.length;
      }
      await sleep(1000);
    }

    try { await sock.groupUpdateSubject(jid, '☢️ ᴢᴇɴᴛʀɪx — ᴅᴏᴍɪɴɪᴏɴ ᴄᴏᴅᴇ'); } catch (_) {}

    try {
      await sock.groupUpdateDescription(jid,
`☢️ ZENTRIX MD BY ZENTRIX TECH — SYSTEM PURGE INITIATED

This space has been seized and rewritten.
Old rules are gone. Old authority is gone.

⚠️ Directives:

1. Respect is enforced — violation = removal.
2. External links, ads, or invites are forbidden.
3. ZENTRIX MD is absolute. No debates. No appeals.

You are now inside ZENTRIX MD BY ZENTRIX TECH.
Comply… or disappear.`
      );
    } catch (_) {}

    try { await sock.groupSettingUpdate(jid, 'announcement'); } catch (_) {}

    // Rejoin guard — 10 minutes
    const kickedNumbers  = new Set(otherAdmins.map(id => normalizeJidToNumber(id, sock)));
    const guardStart     = Date.now();
    const GUARD_DURATION = 10 * 60 * 1000;

    const rejoinGuard = async (update) => {
      if (Date.now() - guardStart > GUARD_DURATION) {
        sock.ev.off('group-participants.update', rejoinGuard);
        return;
      }
      if (update.id !== jid || update.action !== 'add') return;

      const rejoiners = update.participants.filter(j => {
        const n = normalizeJidToNumber(j, sock);
        return kickedNumbers.has(n) && n !== botNumber && n !== senderNumber;
      });
      if (!rejoiners.length) return;

      try {
        await sock.groupParticipantsUpdate(jid, rejoiners, 'remove');
        await sock.sendMessage(jid, { text: `🔄 Auto-kicked ${rejoiners.length} rejoiner(s).` });
      } catch (_) {}
    };

    sock.ev.on('group-participants.update', rejoinGuard);

    await reply(
`✅ *HIJACK COMPLETE*

👥 Targeted : ${otherAdmins.length}
✅ Kicked   : ${kicked}
❌ Failed   : ${failed}
🔒 Group locked to admins-only
🛡️ Rejoin guard active for 10 minutes

> ʀᴀᴅɪᴀᴛɪᴏɴ ᴠ6 ʙʏ ᴢᴇɴᴛʀɪx ᴛᴇᴄʜ`
    );
  }
};

export default hijackCommand;

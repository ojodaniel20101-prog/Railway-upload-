/**
 * .kick command — Removes a user from the group.
 * Supports: @mention or reply to a message.
 */

import moderationService from '../../services/moderationService.js';
import { resolveAllTargets, isGroupAdmin, getBotJid } from '../../utils/targetResolver.js';

export default {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const targets = resolveAllTargets(msg);

    if (targets.length === 0) {
      throw new Error('⚠️ Usage: .kick @user  OR  reply to their message with .kick');
    }

    // Prevent kicking the bot itself
    const botJid = getBotJid(sock);
    const filteredTargets = targets.filter(t => t !== botJid);

    if (filteredTargets.length === 0) {
      throw new Error('⚠️ Cannot kick the bot itself.');
    }

    // Prevent kicking admins/superadmins
    const metadata = await sock.groupMetadata(jid);
    const safeTargets = filteredTargets.filter(t => {
      const p = metadata.participants.find(p => p.id === t);
      return !p || (p.admin !== 'admin' && p.admin !== 'superadmin');
    });

    if (safeTargets.length === 0) {
      throw new Error('⚠️ Cannot kick a group admin.');
    }

    await moderationService.kick(sock, jid, safeTargets);

    const names = safeTargets.map(t => `@${t.split('@')[0]}`).join(', ');
    await sock.sendMessage(jid, {
      text: `✅ ${names} has been removed from the group.`,
      mentions: safeTargets
    });
  }
};

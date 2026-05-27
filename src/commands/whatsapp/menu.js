/**
 * .menu command — Displays the full ZENTRIX_MD command menu.
 */

import { menuService } from '../../services/menuService.js';
import { sessionManager } from '../../core/sessionManager.js';
import { getUserMenu } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export default {
  execute: async (context) => {
    const { sock, msg, isOwner, userId: ctxUserId, pushName: ctxPushName } = context;
    const jid = msg.key.remoteJid;
    const userId = ctxUserId || msg.key.participant || msg.key.remoteJid;
    const pushName = ctxPushName || msg.pushName || 'User';
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    
    // Get user's preferred menu style
    const preferredMenu = getUserMenu(userId, botNumber);
    
    if (preferredMenu === 'menu2') {
      const menu2 = await import('./menu2.js');
      return await menu2.default.execute(context);
    } else if (preferredMenu === 'menu3') {
      const menu3 = await import('./menu3.js');
      return await menu3.default.execute(context);
    }

    // Default to menu1 (standard menuService)
    let isAdmin = false;
    if (jid.endsWith('@g.us')) {
      try {
        const metadata = await sock.groupMetadata(jid);
        const participant = metadata.participants.find(p => p.id === userId);
        if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
          isAdmin = true;
        }
      } catch (e) { /* default to false */ }
    }
    
    const activeSessions = sessionManager.getAllSessions().length;
    await menuService.sendMenu(sock, jid, userId, pushName, isOwner, isAdmin, activeSessions, msg);
  }
};
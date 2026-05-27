/**
 * .mode command — Sets the command execution mode (self/public).
 * 
 * Note: While Telegram commands for mode were removed, the internal WhatsApp logic
 * for self/public mode is retained for session-level security.
 */

import logger from '../../utils/logger.js';

export default {
  name: 'mode',
  description: 'Sets the command execution mode (self/public).',
  async execute({ sock, msg, args, isOwner, sessionManager, phoneNumber }) {
    const remoteJid = msg.key.remoteJid;

    if (!isOwner) {
      logger.warn(`[SECURITY] Non-owner ${remoteJid} attempted to change command mode for ${phoneNumber}.`);
      return; // Silently ignore
    }

    const newMode = args[0]?.toLowerCase();

    if (newMode === 'self' || newMode === 'public') {
      // Update session metadata (in-memory)
      sessionManager.setSessionMetadata(phoneNumber, { commandMode: newMode });
      
      // Update database (persistent)
      const { updateGroupSettings } = await import('../../services/databaseService.js');
      updateGroupSettings(phoneNumber, { system: { mode: newMode } });

      await sock.sendMessage(remoteJid, {
        text: `Command mode set to *${newMode.toUpperCase()}*. ${newMode === 'self' ? 'Only you can use commands now.' : 'Everyone can use commands.'}`,
      });
      logger.info(`[MODE] Command mode for ${phoneNumber} set to ${newMode.toUpperCase()} by owner.`);
    } else {
      await sock.sendMessage(remoteJid, {
        text: 'Invalid mode. Use `.mode self` or `.mode public`.'
      });
    }
  },
};

/**
 * disable.js — Developer-only command to globally enable/disable individual commands.
 */

import { getGlobalSettings, updateGlobalSettings } from '../../services/databaseService.js';
import { commandRouter } from '../../handlers/commandRouter.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export default {
  name: 'disable',
  description: 'Globally enable or disable a specific command (Developer only).',
  category: 'system',
  subCategory: 'settings',
  roleRequired: 'owner',
  groupOnly: false,
  usage: '.disable <command_name>',
  emoji: '🚫',

  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Strict developer check
    const developerNumber = '254741930247';
    
    // Get sender number accurately
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = normalizeJidToNumber(senderJid, sock);
    
    // Check if sender is the developer
    if (senderNumber !== developerNumber) {
      // Silently ignore if not the developer
      return;
    }

    if (!args[0]) {
      return sock.sendMessage(jid, { text: '❌ Please specify a command name to disable/enable globally.\nUsage: .disable <command_name>' });
    }

    const targetCommand = args[0].toLowerCase();
    
    // Prevent disabling the disable command itself
    if (targetCommand === 'disable') {
      return sock.sendMessage(jid, { text: '❌ You cannot disable the *disable* command.' });
    }

    // Check if command exists in registry
    const registry = commandRouter.getCommandRegistry();
    const commandExists = registry.some(cmd => cmd.name === targetCommand);
    
    if (!commandExists) {
      return sock.sendMessage(jid, { text: `❌ Command *${targetCommand}* not found in the registry.` });
    }

    const globalSettings = getGlobalSettings();
    let disabledCommands = globalSettings.disabledCommands || [];

    let message = '';
    if (disabledCommands.includes(targetCommand)) {
      // Enable it
      disabledCommands = disabledCommands.filter(cmd => cmd !== targetCommand);
      message = `✅ Command *${targetCommand}* has been globally re-enabled.`;
    } else {
      // Disable it
      disabledCommands.push(targetCommand);
      message = `🚫 Command *${targetCommand}* has been globally disabled due to technical reasons and upgrades.`;
    }

    updateGlobalSettings({ disabledCommands });

    await sock.sendMessage(jid, { text: message });
  }
};

/**
 * antidelete.js — Command to manage the Anti-Delete feature.
 * Allows enabling/disabling and configuring the mode for capturing deleted messages.
 */

import { antideleteService } from '../../services/antideleteService.js';

export const antideleteCommand = {
  name: 'antidelete',
  description: 'Manages the Anti-Delete feature to recover deleted messages.',
  usage: '.antidelete [on|off|mode|status] [mode_type]',
  category: 'automation',
  subCategory: 'protection',
  roleRequired: 'admin', // Admins can manage this feature
  groupOnly: false, // Can be used in groups and DMs
  emoji: '🚫',
  execute: async (context) => {
    await antideleteService.toggleAntidelete(context);
  },
};

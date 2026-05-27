/**
 * .setmenu command — Allows users to pick their preferred menu style.
 */

import { getUserMenu, setUserMenu, getPrefixForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber, applyFont } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

export default {
  name: 'setmenu',
  description: 'Set your preferred menu style (menu1, menu2, or menu3)',
  category: 'general',
  subCategory: 'settings',
  roleRequired: 'user',
  execute: async ({ sock, msg, userId, args }) => {
    const jid = msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix = getPrefixForSession(botNumber);

    const validMenus = ['menu1', 'menu2', 'menu3'];
    const currentMenu = getUserMenu(userId, botNumber);

    if (!args[0]) {
      return await sock.sendMessage(jid, {
        text: `*Current Menu:* ${currentMenu}\n\n*Available Menus:*\n- menu1 (Plain List)\n- menu2 (Carousel)\n- menu3 (Button/Interactive)\n\n_Type ${prefix}listmenu to see more details._\n\n*Usage:* ${prefix}setmenu <menu_name>\nExample: ${prefix}setmenu menu2`
      }, { quoted: msg });
    }

    const selected = args[0].toLowerCase();
    if (!validMenus.includes(selected)) {
      return await sock.sendMessage(jid, {
        text: `❌ Invalid menu style. Please choose from: ${validMenus.join(', ')}`
      }, { quoted: msg });
    }

    setUserMenu(userId, botNumber, selected);
    
    await sock.sendMessage(jid, {
      text: `✅ Your menu style has been set to *${selected}*.\nType ${prefix}menu to see the change!`
    }, { quoted: msg });
  }
};

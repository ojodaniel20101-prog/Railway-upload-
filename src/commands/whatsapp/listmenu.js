/**
 * .listmenu command — Displays available menu styles and their descriptions.
 */

import { getPrefixForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber, applyFont } from '../../utils/helpers.js';

export default {
  name: 'listmenu',
  description: 'Show available menu styles and their types',
  category: 'general',
  subCategory: 'info',
  roleRequired: 'user',
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const prefix = getPrefixForSession(botNumber);

    const menuList = `┌ 〔 *AVAILABLE MENUS* 〕
│
│ 🔹 *menu1* : Plain List Menu
│ 🔹 *menu2* : Carousel Style Menu
│ 🔹 *menu3* : Button/Interactive Menu
│
└──────────────────────────┘

*How to change:*
Type \`${prefix}setmenu <name>\`
Example: \`${prefix}setmenu menu2\``;

    await sock.sendMessage(jid, { text: menuList }, { quoted: msg });
  }
};

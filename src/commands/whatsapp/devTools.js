/**
 * devTools.js — Developer and Encryption commands based on dev-commands.js.
 */

import { createHash, randomUUID, randomBytes } from 'crypto';
import axios from 'axios';
import { normalizeJidToNumber } from '../../utils/helpers.js';

export const sha512Command = {
  name: 'sha512',
  description: 'Generate SHA512 hash of text.',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .sha512 <text>');
    const hash = createHash('sha512').update(text).digest('hex');
    await sock.sendMessage(msg.key.remoteJid, { text: `🔐 *SHA512:*\n\n${hash}` }, { quoted: msg });
  }
};

export const uuidCommand = {
  name: 'uuid',
  description: 'Generate random UUIDs.',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const count = Math.min(parseInt(args[0]) || 1, 10);
    const list = Array.from({ length: count }, () => randomUUID()).join('\n');
    await sock.sendMessage(msg.key.remoteJid, { text: `🆔 *UUID${count > 1 ? 's' : ''}:*\n\n${list}` }, { quoted: msg });
  }
};

export const genpassCommand = {
  name: 'genpass',
  description: 'Generate a random secure password.',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const len = Math.min(parseInt(args[0]) || 16, 64);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    const bytes = randomBytes(len);
    const pass = Array.from(bytes, b => chars[b % chars.length]).join('');
    await sock.sendMessage(msg.key.remoteJid, { text: `🔑 *Generated Password (${len} chars):*\n\n\`${pass}\`` }, { quoted: msg });
  }
};

export const ipinfoCommand = {
  name: 'ipinfo',
  description: 'Lookup information about an IP address.',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const ip = args[0];
    if (!ip) throw new Error('Usage: .ipinfo <ip>');
    try {
      const r = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org,lat,lon,timezone,query`);
      if (r.data.status !== 'success') throw new Error(r.data.message || 'Failed');
      const d = r.data;
      const text = `🌐 *IP Info: ${d.query}*\n\n` +
                   `🗺 *Country:* ${d.country}\n` +
                   `🏙 *Region:* ${d.regionName}\n` +
                   `🏛 *City:* ${d.city}\n` +
                   `📡 *ISP:* ${d.isp}\n` +
                   `🏢 *Org:* ${d.org}\n` +
                   `🕒 *Timezone:* ${d.timezone}\n` +
                   `📍 *Coords:* ${d.lat}, ${d.lon}`;
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      throw new Error('IP lookup failed: ' + e.message);
    }
  }
};

export const npmCommand = {
  name: 'npm',
  description: 'Get information about an NPM package.',
  category: 'tools',
  execute: async ({ sock, msg, args }) => {
    const pkg = args[0];
    if (!pkg) throw new Error('Usage: .npm <package-name>');
    try {
      const r = await axios.get(`https://registry.npmjs.org/${pkg}/latest`);
      const d = r.data;
      const text = `📦 *${d.name}@${d.version}*\n\n` +
                   `📝 ${d.description || 'No description'}\n` +
                   `👤 *Author:* ${typeof d.author === 'object' ? d.author?.name : d.author || 'N/A'}\n` +
                   `📜 *License:* ${d.license || 'N/A'}\n` +
                   `🔗 https://npmjs.com/package/${pkg}`;
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      throw new Error('Package not found: ' + pkg);
    }
  }
};

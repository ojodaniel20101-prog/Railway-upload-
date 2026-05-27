/**
 * getbot.js — Bot info with interactive buttons (pair + channel links).
 * Available to everyone.
 */

import axios from 'axios';
import { getBotNameForSession, getMenuImageForSession, getPrefixForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import baileysPkg from '@whiskeysockets/baileys';
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = baileysPkg;

export default {
  name: 'getbot',
  aliases: ['script', 'repo', 'ownbot', 'mybot'],
  category: 'general',
  subCategory: 'general',
  description: 'Get bot info with pairing and channel links',
  usage: 'getbot',
  cooldown: 10,
  permissions: ['user'],
  args: false,

  async execute({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);

    // ── Reaction ─────────────────────────────────────────────────────────────
    try {
      await sock.sendMessage(jid, { react: { text: '🔗', key: msg.key } });
    } catch {}

    // ── Uptime ────────────────────────────────────────────────────────────────
    const upSec = Math.floor(process.uptime());
    const d  = Math.floor(upSec / 86400);
    const h  = Math.floor((upSec % 86400) / 3600);
    const mn = Math.floor((upSec % 3600) / 60);
    const s  = upSec % 60;
    const runtime = `${d}d ${h}h ${mn}m ${s}s`;

    // ── Bot meta ──────────────────────────────────────────────────────────────
    const botName = getBotNameForSession(botNumber)  || 'Anime MD';
    const prefix  = getPrefixForSession(botNumber)   || '.';
    const owner   = botNumber || 'Unknown';
    const version = '1.0';
    const credits = 'james';

    // ── Menu thumbnail ────────────────────────────────────────────────────────
    const menuImgUrl = getMenuImageForSession(botNumber);
    let imgField = {};
    if (menuImgUrl) {
      try {
        const res    = await axios.get(menuImgUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const imgBuf = Buffer.from(res.data);
        imgField = await prepareWAMessageMedia(
          { image: imgBuf },
          { upload: sock.waUploadToServer }
        );
      } catch {}
    }

    // ── Body text ─────────────────────────────────────────────────────────────
    const repoText =
`╭─ ⌬ 𝗕𝗼𝘁 𝗜𝗻𝗳𝗼 ⌬
│ • Name    : ${botName}
│ • Owner   : ${owner}
│ • Version  : ${version}
│ • Prefix   : ${prefix}
│ • Runtime  : ${runtime}
╰─────────────`;

    // ── Links ─────────────────────────────────────────────────────────────────
    const pairUrl    = 'https://t.me/animemdoff_bot';
    const channelUrl = 'https://whatsapp.com/channel/0029VbCjCq80LKZ4i4iWHq22';

    // ── Interactive message with CTA buttons ──────────────────────────────────
    try {
      const interactiveMsg = await generateWAMessageFromContent(jid, {
        ephemeralMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body:   proto.Message.InteractiveMessage.Body.fromObject({ text: repoText }),
              footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `© ${credits}` }),
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title: botName,
                hasMediaAttachment: !!imgField.imageMessage,
                ...imgField,
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons: [
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🔗 Pair Bot',
                      url: pairUrl,
                      merchant_url: pairUrl,
                    }),
                  },
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: '📢 Follow Channel',
                      url: channelUrl,
                      merchant_url: channelUrl,
                    }),
                  },
                ],
              }),
              contextInfo: {},
            }),
          },
        },
      }, { quoted: msg });

      await sock.relayMessage(jid, interactiveMsg.message, { messageId: interactiveMsg.key.id });
    } catch {
      // Fallback to plain text if interactive message fails
      await sock.sendMessage(jid, {
        text: repoText + `\n\n🔗 Pair: ${pairUrl}\n📢 Channel: ${channelUrl}`
      }, { quoted: msg });
    }
  }
};

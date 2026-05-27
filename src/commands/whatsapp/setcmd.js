/**
 * setcmd.js — Bind any sticker to a bot command.
 *
 * Usage:
 *   .setcmd <commandName>   (reply to a sticker)
 *     → Binds that sticker to the given command.
 *
 *   .setcmd list
 *     → Lists all sticker→command bindings for this user (global, all chats).
 *
 *   .setcmd remove          (reply to a sticker)
 *     → Removes the binding for that sticker.
 *
 *   .setcmd clear
 *     → Removes ALL sticker bindings for this user.
 *
 * Bindings are GLOBAL PER USER — they work in any chat, not just one.
 * When the sticker is sent later, the bot will execute the bound command
 * exactly as if the owner had typed it (with no extra args).
 */

import { getUserStickerCmds, setUserStickerCmd, removeUserStickerCmd, clearUserStickerCmds } from '../../services/databaseService.js';

/** Extracts a stable unique ID for a sticker from a WAMessage. */
export function getStickerFingerprint(msg) {
  const sm = msg?.message?.stickerMessage;
  if (!sm) return null;

  // fileSha256 is a Buffer — convert to hex string for storage
  if (sm.fileSha256) {
    return Buffer.isBuffer(sm.fileSha256)
      ? sm.fileSha256.toString('hex')
      : sm.fileSha256;
  }
  // Fallback: fileEncSha256
  if (sm.fileEncSha256) {
    return Buffer.isBuffer(sm.fileEncSha256)
      ? sm.fileEncSha256.toString('hex')
      : sm.fileEncSha256;
  }
  // Last resort: mediaKey
  if (sm.mediaKey) {
    return Buffer.isBuffer(sm.mediaKey)
      ? sm.mediaKey.toString('hex')
      : sm.mediaKey;
  }
  return null;
}

export default {
  name: 'setcmd',
  description: 'Bind a sticker to a bot command (global — works in all chats). Reply to a sticker with .setcmd <command>.',
  usage: '.setcmd <command> (reply to sticker) | .setcmd list | .setcmd remove (reply to sticker) | .setcmd clear',

  async execute({ sock, msg, args, phoneNumber, isOwner, isAdmin }) {
    const jid    = msg.key.remoteJid;
    // Always key bindings by the bot's own number (phoneNumber = botNumber).
    // The sticker trigger looks up by botJid, so this must match exactly.
    // Using msg.key.participant || remoteJid breaks in DMs where remoteJid
    // is the other person's number, not the bot owner.
    const userId = phoneNumber + '@s.whatsapp.net';
    const action = args[0]?.toLowerCase();

    // Paired session owner only — the bot's own number must match the sender
    if (!isOwner) {
      return await sock.sendMessage(jid, {
        text: `⛔ *Paired Owner Only*\n\n*.setcmd* can only be used by the paired bot owner (the number that scanned the QR code).\n\n_This prevents other users from hijacking your sticker bindings._`
      }, { quoted: msg });
    }

    const bindings = getUserStickerCmds(userId);

    // ── LIST ───────────────────────────────────────────────────────────────
    if (action === 'list') {
      const entries = Object.entries(bindings);
      if (entries.length === 0) {
        await sock.sendMessage(jid, {
          text: '📋 *Sticker Commands*\n\nNo sticker bindings set yet.\nReply to a sticker with *.setcmd <command>* to add one.\n\n_Bindings are global — they work in all your chats._',
        });
        return;
      }
      let text = `📋 *Sticker Commands* (${entries.length} bound — global across all chats)\n\n`;
      entries.forEach(([fingerprint, cmd], i) => {
        text += `${i + 1}. 🎯 *.${cmd}*\n   🔑 ID: \`${fingerprint.slice(0, 12)}…\`\n\n`;
      });
      text += '_Send the bound sticker anywhere to trigger the command._';
      await sock.sendMessage(jid, { text: text.trim() });
      return;
    }

    // ── CLEAR ──────────────────────────────────────────────────────────────
    if (action === 'clear') {
      clearUserStickerCmds(userId);
      await sock.sendMessage(jid, { text: '🗑️ All your sticker command bindings cleared (globally).' });
      return;
    }

    // ── For REMOVE and SET we need the quoted sticker ──────────────────────
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedMsg = quoted ? { message: quoted } : null;
    const fingerprint = getStickerFingerprint(quotedMsg);

    if (!fingerprint) {
      throw new Error(
        'Please *reply to a sticker* when using this command.\n\n' +
        '📌 Usage:\n' +
        '• *.setcmd <command>* — reply to a sticker to bind it\n' +
        '• *.setcmd remove* — reply to a sticker to unbind it\n' +
        '• *.setcmd list* — list all bindings\n' +
        '• *.setcmd clear* — remove all bindings'
      );
    }

    // ── REMOVE ─────────────────────────────────────────────────────────────
    if (action === 'remove') {
      if (!bindings[fingerprint]) {
        throw new Error('That sticker has no command bound to it.');
      }
      const removedCmd = bindings[fingerprint];
      removeUserStickerCmd(userId, fingerprint);
      await sock.sendMessage(jid, {
        text: `✅ Removed binding: that sticker no longer triggers *.${removedCmd}*`,
      });
      return;
    }

    // ── SET (default action) ───────────────────────────────────────────────
    const commandName = action?.replace(/^\./, '');
    if (!commandName) {
      throw new Error(
        'Please provide a command name.\n' +
        'Example: *.setcmd tagall* (while replying to a sticker)'
      );
    }

    const existingCmd = bindings[fingerprint];
    setUserStickerCmd(userId, fingerprint, commandName);

    const wasReplaced = existingCmd && existingCmd !== commandName
      ? ` _(replaced *.${existingCmd}*)_`
      : '';

    await sock.sendMessage(jid, {
      text:
        `✅ *Sticker Command Set (Global)!*\n\n` +
        `🎯 Command: *.${commandName}*${wasReplaced}\n` +
        `🔑 Sticker ID: \`${fingerprint.slice(0, 12)}…\`\n\n` +
        `_This sticker now triggers *.${commandName}* in **any** chat._`,
    });
  },
};

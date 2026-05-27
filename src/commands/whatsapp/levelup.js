/**
 * levelup.js — Daily XP claim with level-up card.
 * Uses the bot's own databaseService XP store (no external User model needed).
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getUserXpData, setUserProfilePic, getGlobalXpStore } from '../../services/databaseService.js';

export default {
  name: 'levelup',
  aliases: ['lvlup'],
  category: 'general',
  description: 'Check your XP rank card — XP earned by using the bot',
  usage: 'levelup',
  cooldown: 6,
  permissions: ['user'],
  args: false,

  async execute({ sock, msg, sender, userId: ctxUserId, isOwner, phoneNumber }) {
    try {
      const from   = msg.key.remoteJid;
      const userId = ctxUserId || sender || msg.key.participant || msg.key.remoteJid;

      // Paired user (session owner) only
      if (!isOwner) {
        return await sock.sendMessage(from, {
          text: `⛔ *Owner Only Command*\n\nOnly the paired bot owner can use *.levelup*`
        }, { quoted: msg });
      }

      // Use WhatsApp push name
      const name = msg.pushName || 'User';

      // ── Load current XP stats (XP is earned passively per command use) ────
      const xpData   = getUserXpData(userId, phoneNumber);
      const { level, currentXp, nextXp } = xpData;
      const commands = getGlobalXpStore(userId, phoneNumber)?.commandCount || 0;
      const progress = Math.max(0, Math.min(1, currentXp / nextXp));

      // ── Fetch & cache profile picture ─────────────────────────────────────
      // Start with whatever is cached in the DB, then try to freshen it.
      let profilePicUrl = xpData.profilePic || '';
      // Only call profilePictureUrl for proper user JIDs (avoids jidDecode crash on group/LID JIDs)
      const isUserJid = userId && !userId.endsWith('@g.us') && !userId.endsWith('@newsletter') && !userId.includes('_');
      if (isUserJid) {
        try {
          const fresh = await sock.profilePictureUrl(userId, 'image');
          if (fresh) {
            profilePicUrl = fresh;
            setUserProfilePic(userId, phoneNumber, fresh); // keep cache warm
          }
        } catch { /* no pic set or privacy locked — fall back to placeholder */ }
      }

      // ── Build canvas card ─────────────────────────────────────────────────
      const W = 1000, H = 360;
      const canvas = createCanvas(W, H);
      const ctx    = canvas.getContext('2d');

      // Background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#111827');
      bg.addColorStop(1, '#1f2937');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Top border glow
      const glow = ctx.createLinearGradient(0, 0, W, 0);
      glow.addColorStop(0, '#22d3ee');
      glow.addColorStop(0.5, '#6366f1');
      glow.addColorStop(1, '#22c55e');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, 4);

      // ── Profile picture (left, circular) ─────────────────────────────────
      const AV   = 130;
      const AX   = 45;
      const AY   = H / 2 - AV / 2;
      const ACX  = AX + AV / 2;
      const ACY  = AY + AV / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(ACX, ACY, AV / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      let drewPfp = false;
      if (profilePicUrl) {
        try {
          const pfp = await loadImage(profilePicUrl);
          ctx.drawImage(pfp, AX, AY, AV, AV);
          drewPfp = true;
        } catch { /* fall through to placeholder */ }
      }

      if (!drewPfp) {
        try {
          // Fallback to a default profile picture URL if the user has none
          const defaultPfpUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
          const pfp = await loadImage(defaultPfpUrl);
          ctx.drawImage(pfp, AX, AY, AV, AV);
          drewPfp = true;
        } catch {
          // Final fallback: Initial letter
          ctx.fillStyle = '#1e3a5f';
          ctx.fillRect(AX, AY, AV, AV);
          ctx.restore();
          ctx.save();
          ctx.fillStyle = '#22d3ee';
          ctx.font = 'bold 62px Sans';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(name.charAt(0).toUpperCase(), ACX, ACY);
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign = 'left';
          ctx.restore();
        }
      }
      
      if (drewPfp) {
        ctx.restore();
      }

      // Avatar ring
      ctx.beginPath();
      ctx.arc(ACX, ACY, AV / 2 + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth   = 4;
      ctx.stroke();

      // Level badge under avatar
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(AX, AY + AV + 10, AV, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Sans';
      ctx.textAlign = 'center';
      ctx.fillText(`LVL ${level}`, ACX, AY + AV + 31);
      ctx.textAlign = 'left';

      // ── Text (right of avatar) ────────────────────────────────────────────
      const TX = AX + AV + 40;

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 44px Sans';
      ctx.fillText('📊 RANK CARD', TX, 82);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px Sans';
      ctx.fillText(name, TX, 142);

      ctx.fillStyle = '#d1d5db';
      ctx.font = '24px Sans';
      ctx.fillText(`Commands used: ${commands} 🎮`, TX, 188);

      // XP bar
      const BX = TX, BY = 226, BW = W - TX - 40, BH = 38, BR = 19;

      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(BX, BY, BW, BH, BR);
      ctx.fill();

      if (progress > 0) {
        const fillW = Math.max(BH, Math.floor(BW * progress));
        const barG  = ctx.createLinearGradient(BX, 0, BX + BW, 0);
        barG.addColorStop(0, '#22c55e');
        barG.addColorStop(1, '#16a34a');
        ctx.fillStyle = barG;
        ctx.beginPath();
        ctx.roundRect(BX, BY, fillW, BH, BR);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 17px Sans';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentXp} / ${nextXp} XP`, BX + BW / 2, BY + BH / 2 + 6);
      ctx.textAlign = 'left';

      // +XP badge (top-right)
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.roundRect(W - 160, 18, 132, 46, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Sans';
      ctx.textAlign = 'center';
      ctx.fillText(`LVL ${level}`, W - 94, 47);
      ctx.textAlign = 'left';

      const buffer = canvas.toBuffer('image/png');

      await sock.sendMessage(from, {
        image: buffer,
        caption: [
          `🏆 *${name}'s Rank Card*`,
          ``,
          `⭐ Level: *${level}*`,
          `✨ XP: *${currentXp} / ${nextXp}*`,
          `🎮 Commands used: *${commands}*`,
          ``,
          `_Keep using the bot to earn more XP!_`,
          `_XP is earned every 60s of activity._`,
        ``,
        `> _Type .getbot to get your own bot_ 🤖`,
        ].join('\n')
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(from, {
        text: `❌ levelup failed: ${error.message}`
      }, { quoted: msg });
    }
  }
};
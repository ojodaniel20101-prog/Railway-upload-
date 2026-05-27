/**
 * behavioralEngine.js — Advanced behavioral analysis engine for ZENTRIX MD BY ZENTRIX TECH.
 * Features: Admin/Owner bypass, fixed antipromote, improved GTS, raid shield.
 */

import { getChatSettings } from './databaseService.js';
import logger from '../utils/logger.js';
import moderationService from './moderationService.js';
import actionQueue from './actionQueue.js';
import { containsLink, containsWhatsAppInvite, extractFullText } from '../utils/linkDetector.js';
import { getBotJid } from '../utils/targetResolver.js';

class BehavioralEngine {
  constructor() {
    this.probationWindow = 60000; // 60 seconds
    this.decayInterval = 10000;   // 10 seconds
    this.gtsWindow = 60000;       // 60 seconds

    // In-memory trackers (volatile)
    this.memberData = new Map();       // jid -> { userId -> data }
    this.groupThreatScores = new Map(); // jid -> { score, events: [] }
    this.panicStates = new Map();       // jid -> { active, expires, originalSettings }

    this.startDecayTimer();
  }

  startDecayTimer() {
    setInterval(() => {
      this.memberData.forEach((members) => {
        members.forEach((data) => {
          if (data.suspicionScore > 0) {
            data.suspicionScore = Math.max(0, data.suspicionScore - 1);
          }
        });
      });
    }, this.decayInterval);
  }

  getMemberData(jid, userId) {
    if (!this.memberData.has(jid)) this.memberData.set(jid, new Map());
    const group = this.memberData.get(jid);
    if (!group.has(userId)) {
      group.set(userId, {
        joinTime: Date.now(),
        suspicionScore: 0,
        messageCount: 0,
        linksSent: 0,
        mentionsCount: 0,
        lastMessages: [],
        warned: false
      });
    }
    return group.get(userId);
  }

  /**
   * Checks if a user is an admin or superadmin in a group.
   * Returns true if admin/superadmin/bot — these users are exempt from antibot enforcement.
   */
  async isAdmin(sock, jid, userId) {
    try {
      const botJid = getBotJid(sock);
      if (userId === botJid) return true;

      const metadata = await sock.groupMetadata(jid);
      return metadata.participants.some(
        p => p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
      );
    } catch (e) {
      return false;
    }
  }

  async processMessage(sock, m) {
    const jid = m.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const sender = m.key.participant || m.key.remoteJid;
    const botNumber = getBotJid(sock).split('@')[0];
    const settings = getChatSettings(botNumber, jid);

    // ── ADMIN/OWNER PROTECTION ────────────────────────────────────────────────
    // Skip behavioral analysis for admins and the bot owner
    if (await this.isAdmin(sock, jid, sender)) return;
    // ─────────────────────────────────────────────────────────────────────────

    const data = this.getMemberData(jid, sender);
    const isProbation = (Date.now() - data.joinTime) < this.probationWindow;

    const text = extractFullText(m);
    const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    let scoreIncrease = 0;

    // 1. Link Detection (comprehensive)
    if (containsLink(text)) {
      // Check if it's THIS group's own invite link
      let isOwnGroupLink = false;
      if (containsWhatsAppInvite(text)) {
        try {
          const inviteCode = await this.getInviteCode(sock, jid);
          if (inviteCode && text.includes(inviteCode)) {
            isOwnGroupLink = true;
          }
        } catch (e) {
          // ignore
        }
      }

      if (!isOwnGroupLink) {
        scoreIncrease += isProbation ? 5 : 3;
        data.linksSent++;
      }
    }

    // 2. Mass Mention
    if (mentions.length >= 5) {
      scoreIncrease += isProbation ? 3 : 2;
      data.mentionsCount += mentions.length;
    }

    // 3. Flood Detection
    data.messageCount++;
    const now = Date.now();
    data.lastMessages.push(now);
    data.lastMessages = data.lastMessages.filter(ts => now - ts < 5000);
    if (data.lastMessages.length >= 3) {
      scoreIncrease += 2;
    }

    // 4. Scam Phrases
    const scamPhrases = ['earn money', 'crypto investment', 'click here to earn', 'fast cash', 'make money online', 'investment opportunity', 'double your money', 'free bitcoin', 'get rich quick'];
    if (scamPhrases.some(p => text.toLowerCase().includes(p))) {
      scoreIncrease += 3;
    }

    // 5. Contextual Multiplier
    if (scoreIncrease > 0) {
      const lastEventTime = data.lastEventTime || 0;
      if (now - lastEventTime < 10000) {
        scoreIncrease *= 1.5;
      }
      data.lastEventTime = now;
      data.suspicionScore += scoreIncrease;

      await this.evaluateEnforcement(sock, jid, sender, m.key, settings, data);
      await this.increaseGTS(sock, jid, scoreIncrease);
    }
  }

  async evaluateEnforcement(sock, jid, sender, key, settings, data) {
    const mode = settings.automation?.antibot?.mode || 'off';
    if (mode === 'off') return;

    let thresholdWarn = 4;
    let thresholdKick = 6;

    if (mode === 'strict' || this.isPanicActive(jid)) {
      thresholdKick = 3;
      thresholdWarn = 99; // No warnings in strict mode
    } else if (mode === 'detect') {
      logger.info(`[ANTIBOT DETECT] User ${sender} scored ${data.suspicionScore.toFixed(1)} in ${jid}`);
      return;
    }

    if (data.suspicionScore >= thresholdKick) {
      try {
        await moderationService.deleteMessage(sock, jid, key);
        await moderationService.kick(sock, jid, [sender]);
        await sock.sendMessage(jid, {
          text: `🤖 @${sender.split('@')[0]} was removed for suspicious bot-like behavior.`,
          mentions: [sender]
        });
        logger.info(`[ANTIBOT] Kicked ${sender} from ${jid} (Score: ${data.suspicionScore.toFixed(1)})`);
      } catch (e) {
        logger.error(`[ANTIBOT] Kick failed: ${e.message}`);
      }
    } else if (data.suspicionScore >= thresholdWarn && !data.warned) {
      try {
        await moderationService.deleteMessage(sock, jid, key);
        const warning = await moderationService.warn(sock, jid, sender);
        await sock.sendMessage(jid, { text: warning, mentions: [sender] });
        data.warned = true;
      } catch (e) {
        logger.error(`[ANTIBOT] Warn failed: ${e.message}`);
      }
    }
  }

  async increaseGTS(sock, jid, amount) {
    if (!this.groupThreatScores.has(jid)) {
      this.groupThreatScores.set(jid, { score: 0, events: [] });
    }
    const gts = this.groupThreatScores.get(jid);
    const now = Date.now();

    gts.events.push({ time: now, amount });
    this.updateGTS(jid);

    if (gts.score >= 8 && !this.isPanicActive(jid)) {
      await this.activatePanic(sock, jid);
    }
  }

  updateGTS(jid) {
    const gts = this.groupThreatScores.get(jid);
    if (!gts) return;
    const now = Date.now();
    gts.events = gts.events.filter(e => now - e.time < this.gtsWindow);
    gts.score = gts.events.reduce((sum, e) => sum + e.amount, 0);
  }

  async activatePanic(sock, jid) {
    logger.warn(`[RAID SHIELD] Activating Panic Mode for ${jid}`);
    const botNumber = getBotJid(sock).split('@')[0];
    const settings = getChatSettings(botNumber, jid);

    this.panicStates.set(jid, {
      active: true,
      expires: Date.now() + 300000, // 5 minutes
      originalSettings: JSON.parse(JSON.stringify(settings))
    });

    try {
      // Refresh metadata to ensure bot is admin and JID is valid
      const metadata = await sock.groupMetadata(jid);
      const botJid = getBotJid(sock);
      const botParticipant = metadata.participants.find(p => p.id === botJid);
      
      if (!botParticipant || (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
        throw new Error('Bot is not an administrator in this group.');
      }

      await actionQueue.add(async () => {
        await sock.groupSettingUpdate(jid, 'announcement');
        await sock.sendMessage(jid, {
          text: `🚨 *ZENTRIX MD BY ZENTRIX TECH RAID SHIELD ACTIVATED*\n\nSuspicious coordinated activity detected.\nGroup temporarily locked for 5 minutes.`
        });
      });
    } catch (e) {
      logger.error(`[RAID SHIELD] Failed to activate panic in ${jid}: ${e.message}`);
      // Notify the group if possible
      try {
        await sock.sendMessage(jid, { text: `⚠️ *RAID SHIELD ERROR*\n\nFailed to lock group: ${e.message}` });
      } catch (sendErr) {}
    }

    setTimeout(async () => {
      await this.deactivatePanic(sock, jid);
    }, 300000);
  }

  async deactivatePanic(sock, jid) {
    const state = this.panicStates.get(jid);
    if (!state || !state.active) return;

    state.active = false;
    try {
      await actionQueue.add(async () => {
        await sock.groupSettingUpdate(jid, 'not_announcement');
        await sock.sendMessage(jid, {
          text: `🟢 *ZENTRIX MD BY ZENTRIX TECH RAID SHIELD DEACTIVATED*\n\nGroup restored to normal operation.`
        });
      });
    } catch (e) {
      logger.error(`[RAID SHIELD] Failed to deactivate panic: ${e.message}`);
    }

    // Reset GTS
    this.groupThreatScores.set(jid, { score: 0, events: [] });
  }

  isPanicActive(jid) {
    const state = this.panicStates.get(jid);
    return state && state.active && Date.now() < state.expires;
  }

  async processParticipantUpdate(sock, update) {
    try {
      const { id: jid, participants, action, author } = update;

      if (!jid || !participants || !action) return;

      const botNumber = getBotJid(sock).split('@')[0];
      const settings = getChatSettings(botNumber, jid);
      if (!settings) return;

      // ── ANTIPROMOTE Logic ────────────────────────────────────────────────────
      if (action === 'promote' && settings.protection?.antipromote?.enabled) {
        const botJid = getBotJid(sock);

        // Determine if the promotion was authorized
        // Authorized promoters: the bot itself, or the group owner (superadmin)
        let isAuthorized = false;

        if (!author) {
          // If author is unknown, skip enforcement to avoid false positives
          logger.warn(`[ANTIPROMOTE] Unknown author for promotion in ${jid}, skipping.`);
          isAuthorized = true;
        } else if (author === botJid) {
          isAuthorized = true;
        } else {
          // Check if the author is the group owner (superadmin)
          try {
            const metadata = await sock.groupMetadata(jid);
            const authorParticipant = metadata.participants.find(p => p.id === author);
            if (authorParticipant && authorParticipant.admin === 'superadmin') {
              isAuthorized = true;
            }
          } catch (e) {
            logger.error(`[ANTIPROMOTE] Could not fetch group metadata: ${e.message}`);
            isAuthorized = true; // Fail safe
          }
        }

        if (!isAuthorized) {
          logger.info(`[ANTIPROMOTE] Unauthorized promotion by ${author} in ${jid}. Reverting...`);

          // ── JID Normalization ──────────────────────────────────────────────
          // Baileys group-participants.update can pass participants as either:
          //   - string JIDs: "254700000000@s.whatsapp.net"
          //   - objects:     { id: "254700000000@s.whatsapp.net", ... }
          // We normalize to string JIDs defensively.
          const normalizeJid = (p) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') return p.id || p.jid || String(p);
            return String(p);
          };
          const participantJids = (Array.isArray(participants) ? participants : [participants])
            .map(normalizeJid)
            .filter(Boolean);

          const authorJid = author ? normalizeJid(author) : null;

          // Small delay to let WhatsApp process the promotion first
          await new Promise(resolve => setTimeout(resolve, 1500));

          try {
            // Demote the newly promoted participants
            await actionQueue.add(async () => {
              await sock.groupParticipantsUpdate(jid, participantJids, 'demote');
            });

            // Build mention strings safely
            const participantMentions = participantJids.map(p => `@${p.split('@')[0]}`).join(', ');
            const promoterDisplay = authorJid ? `@${authorJid.split('@')[0]}` : 'unknown';

            await sock.sendMessage(jid, {
              text: `🛡️ *ANTIPROMOTE TRIGGERED*\n\nUnauthorized promotion detected.\nReverted admin for: ${participantMentions}\nPromoter: ${promoterDisplay}`,
              mentions: [...participantJids, ...(authorJid ? [authorJid] : [])].filter(Boolean)
            });

            // Optionally demote or kick the promoter
            if (authorJid) {
              if (settings.protection.antipromote.mode === 'kick') {
                await actionQueue.add(async () => {
                  await sock.groupParticipantsUpdate(jid, [authorJid], 'remove');
                });
              } else if (settings.protection.antipromote.mode === 'demote') {
                await actionQueue.add(async () => {
                  await sock.groupParticipantsUpdate(jid, [authorJid], 'demote');
                });
              }
            }
          } catch (e) {
            logger.error(`[ANTIPROMOTE] Failed to revert promotion: ${e.message}`);
            try {
              await sock.sendMessage(jid, {
                text: `⚠️ *ANTIPROMOTE*: Unauthorized promotion detected but the bot lacks sufficient admin privileges to revert it. Please ensure the bot is an admin.`
              });
            } catch (sendErr) {
              logger.error(`[ANTIPROMOTE] Failed to send notification: ${sendErr.message}`);
            }
          }
        }
      }


      // ── ANTIHIJACK: Admin demotion detection ─────────────────────────────────
      // If an admin demotes another admin, remove the demoter.
      // Exempt: bot itself, group creator (superadmin), and unknown authors.
      if (action === 'demote' && settings.protection?.antihijack?.enabled) {
        const botJid = getBotJid(sock);
        const normalizeJid = (p) => typeof p === 'string' ? p : (p?.id || p?.jid || String(p));

        // Skip if author unknown, is the bot, or is the person who enabled antihijack
        const enablerJid = settings.protection.antihijack.enablerJid || null;
        if (author && author !== botJid && author !== enablerJid) {
          let authorIsSuperadmin = false;
          try {
            const meta = await sock.groupMetadata(jid);
            const authorP = meta.participants.find(p => p.id === author);
            authorIsSuperadmin = authorP?.admin === 'superadmin';
          } catch (e) {
            logger.warn(`[ANTIHIJACK] Could not fetch metadata: ${e.message}`);
            authorIsSuperadmin = true; // fail safe — don't punish if we can't verify
          }

          if (!authorIsSuperadmin) {
            logger.warn(`[ANTIHIJACK] Admin demotion detected by ${author} in ${jid}. Removing...`);
            await new Promise(r => setTimeout(r, 1000));
            try {
              await actionQueue.add(async () => {
                await sock.groupParticipantsUpdate(jid, [author], 'remove');
              });
              await sock.sendMessage(jid, {
                text: `🛡️ *ANTIHIJACK TRIGGERED*\n\n@${author.split('@')[0]} was removed for demoting a group admin.\nOnly the group creator can demote admins.`,
                mentions: [author]
              });
            } catch (e) {
              logger.error(`[ANTIHIJACK] Failed to remove demoter: ${e.message}`);
              try {
                await sock.sendMessage(jid, {
                  text: `⚠️ *ANTIHIJACK*: Admin demotion detected from @${author.split('@')[0]} but bot could not remove them. Ensure bot has admin rights.`,
                  mentions: [author]
                });
              } catch (_) {}
            }
          }
        }
      }

      // ── Coordinated Join Detection (GTS) ────────────────────────────────────
      if (action === 'add') {
        // Normalize participants to string JIDs
        const participantJids = (Array.isArray(participants) ? participants : [participants])
          .map(p => (typeof p === 'string' ? p : p.id || p.jid))
          .filter(Boolean);

        // PHASE 3 FIX: Only run GTS if raid shield is enabled for this group
        const raidSettings = getChatSettings(botNumber, jid);
        if (raidSettings?.protection?.raidEnabled) {
          await this.increaseGTS(sock, jid, participantJids.length * 2);
        }
        participantJids.forEach(userId => {
          this.getMemberData(jid, userId); // Initialize probation
        });
      }
    } catch (e) {
      logger.error(`[BehavioralEngine] processParticipantUpdate error: ${e.message}`);
    }
  }

  async processGroupUpdate(sock, update) {
    try {
      const { id: jid } = update;
      if (!jid) return;

      // If panic mode is active, prevent unauthorized unlocking
      if (this.isPanicActive(jid)) {
        if (update.announce !== undefined && update.announce !== true) {
          logger.info(`[RAID SHIELD] Reverting unauthorized unlock in ${jid}`);
          await actionQueue.add(async () => {
            await sock.groupSettingUpdate(jid, 'announcement');
          });
        }
      }
    } catch (e) {
      logger.error(`[BehavioralEngine] processGroupUpdate error: ${e.message}`);
    }
  }

  async getInviteCode(sock, jid) {
    try {
      return await sock.groupInviteCode(jid);
    } catch (e) {
      return null;
    }
  }
}

export default new BehavioralEngine();

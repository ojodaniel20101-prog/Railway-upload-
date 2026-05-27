/**
 * commandRouter.js — Routes commands to their handlers with permission enforcement.
 * Features: Owner detection, admin detection, group-only enforcement, self-mode.
 */

import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { sessionManager } from '../core/sessionManager.js';
import { buildDynamicRegistry } from '../config/commandRegistryBuilder.js';
import { normalizeJidToNumber } from '../utils/helpers.js';
import { getChatSettings, getGlobalSettings, awardCommandXp, getRegisteredUser, getUserLang } from '../services/databaseService.js';
import { translateLongText } from '../utils/translator.js';

let commandRegistry = []; // This will hold the metadata from commandRegistryBuilder

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CommandRouter {
  constructor() {
    this.commands = {
      whatsapp: new Map(),
      telegram: new Map(),
    };
    this.lastRegistryUpdate = 0; // Timestamp of last registry update
    this.updateInterval = 5 * 60 * 1000; // Update registry every 5 minutes
  }

  /**
   * Loads commands dynamically from files and builds the command registry.
   * This method now also reloads the registry periodically to detect new/updated commands.
   */
  async loadCommands() {
    // Only rebuild registry if enough time has passed or it's the first load
    if (Date.now() - this.lastRegistryUpdate > this.updateInterval || commandRegistry.length === 0) {
      commandRegistry = await buildDynamicRegistry();
      this.lastRegistryUpdate = Date.now();
      logger.info(`[CommandRouter] Dynamically registered ${commandRegistry.length} commands.`);
    }

    const platforms = ['whatsapp', 'telegram'];
    for (const platform of platforms) {
      const commandDir = path.join(__dirname, `../commands/${platform}`);
      try {
        const files = await readdir(commandDir);
        for (const file of files) {
          if (!file.endsWith('.js')) continue;

          const commandNameFromFile = file.slice(0, -3);
          const modulePath = `file://${path.join(commandDir, file)}`;

          try {
            const module = await import(modulePath);

            // Handle default exports
            if (module.default && typeof module.default.execute === 'function') {
              const cmd = module.default;
              const name = cmd.name || commandNameFromFile;
              // Only add to internal commands map if it's a valid, loaded command
              if (!commandRegistry.find(entry => entry.name === name && entry.error)) {
                this.commands[platform].set(name, cmd);
                // logger.info(`Loaded ${platform} command: ${name}`); // Too verbose
              } else {
                logger.warn(`[CommandRouter] Skipping execution registration for errored command: ${name}`);
              }
            }

            // Register named exports as individual commands
            const namedExports = Object.entries(module).filter(
              ([key, val]) => key !== 'default' && typeof val === 'object' && val !== null && typeof val.execute === 'function'
            );
            for (const [exportName, handler] of namedExports) {
              let cmdName = handler.name || exportName.replace(/Command$/, '');
              if (exportName === 'eightBallCommand' || cmdName === 'eightBall') cmdName = '8ball';

              if (!commandRegistry.find(entry => entry.name === cmdName && entry.error)) {
                this.commands[platform].set(cmdName, handler);
                // logger.info(`Loaded ${platform} command (named export): ${cmdName}`); // Too verbose
              } else {
                logger.warn(`[CommandRouter] Skipping execution registration for errored command: ${cmdName}`);
              }
            }
          } catch (importError) {
            logger.error(`[CommandRouter] Failed to import command module ${file}: ${importError.message}`);
            // The error would have already been logged by buildDynamicRegistry, so no need to add to registry here.
          }
        }
      } catch (error) {
        logger.error(`Failed to read command directory for ${platform}:`, error);
      }
    }
  }

  /**
   * Retrieves the current command registry.
   * @returns {Array<Object>} The array of registered command metadata.
   */
  getCommandRegistry() {
    return commandRegistry;
  }

  async execute(platform, commandName, context) {
    // Ensure registry is up-to-date before executing
    await this.loadCommands(); 

    const command = this.commands[platform].get(commandName);
    const regEntry = commandRegistry.find(c => c.name === commandName);

    if (!command) {
      logger.warn(`Command "${commandName}" not found for platform "${platform}"`);
      // If command is not found but exists in registry as an error, inform user
      if (regEntry && regEntry.error) {
        await context.sock.sendMessage(context.msg.key.remoteJid, { text: `❌ Command *${commandName}* failed to load: ${regEntry.errorMessage}` });
      }
      return;
    }

    // Increment total commands attempted
    sessionManager.totalCommands++;

    const _logEntry = {
      time: Date.now(),
      cmd: commandName,
      platform,
      session: null, // filled in below once we know the bot number
      status: 'ok',
    };

    try {
      if (platform === 'whatsapp') {
        await this._executeWhatsApp(command, regEntry, commandName, context);
      } else if (platform === 'telegram') {
        await this._executeTelegram(command, regEntry, commandName, context);
      }
      // If we reach here without error, it's a success
      sessionManager.commandsRan++;
      
      // Update per-session stats if available
      const botNumber = normalizeJidToNumber(context.sock?.user?.id, context.sock);
      const session = sessionManager.getSession(botNumber);
      if (session) {
        session.commandCount = (session.commandCount || 0) + 1;
      }
      _logEntry.session = botNumber ? `+${botNumber}` : platform;
    } catch (error) {
      // Increment failed commands
      sessionManager.commandsFailed++;
      _logEntry.status = 'err';
      
      // Update per-session error stats
      const botNumber = normalizeJidToNumber(context.sock?.user?.id, context.sock);
      const session = sessionManager.getSession(botNumber);
      if (session) {
        session.errorCount = (session.errorCount || 0) + 1;
      }
      _logEntry.session = botNumber ? `+${botNumber}` : platform;

      // Re-throw to let the caller handle it if needed
      throw error;
    } finally {
      // Always push to command log (ring buffer, newest first, max 50)
      sessionManager.commandLog.unshift(_logEntry);
      if (sessionManager.commandLog.length > 50) sessionManager.commandLog.length = 50;
    }
  }

  async _executeWhatsApp(command, regEntry, commandName, context) {
    const { sock, msg } = context;

    // ── JID Resolution ────────────────────────────────────────────────────────
    const jid      = msg.key.remoteJid;
    const isGroup  = jid.endsWith('@g.us');
    const botNumber = normalizeJidToNumber(sock.user?.id, sock);
    const botJid    = botNumber + '@s.whatsapp.net';

    // ── PHASE 2: Session Ownership Validation ─────────────────────────────────
    // The session owner is the bot's own paired number (sock.user.id).
    // In self-bot mode, ONLY messages sent by this account should trigger commands.
    //
    // In a GROUP:
    //   - msg.key.fromMe=true means the bot account sent it.
    //   - msg.key.participant is the actual sender JID inside the group.
    //   - If participant is empty → bot automated send → SKIP.
    //   - If participant matches botJid → owner sent from linked device → ALLOW.
    //
    // In a DM:
    //   - msg.key.fromMe=true → sent from this device (owner) → ALLOW.
    //   - msg.key.fromMe=false → received from someone else → SKIP commands.
    //
    // This guarantees: User A's bot NEVER executes commands from User B's messages.
    if (isGroup) {
      // In groups, fromMe is not reliable — check participant JID against owner/bot number
      if (!msg.key.fromMe) {
        const session = sessionManager.getSession(botNumber);
        if (session?.commandMode === 'self') {
          const senderJidRaw = msg.key.participant || '';
          const senderNum = normalizeJidToNumber(senderJidRaw, sock);
          const ownerNum = process.env.OWNER_NUMBER || '2349057467015';
          const isOwnerSender = senderNum === botNumber || senderNum === ownerNum;
          if (!isOwnerSender) {
            logger.debug(`[ISOLATION] Skipping group command from non-owner in session ${botNumber} (SELF MODE)`);
            return;
          }
        }
      }
    } else {
      // DM: allow anyone to trigger commands if bot is in PUBLIC mode
      if (!msg.key.fromMe) {
        const session = sessionManager.getSession(botNumber);
        const commandMode = session?.commandMode || 'public';
        if (commandMode === 'self') {
          logger.debug(`[ISOLATION] Skipping DM command from non-owner in session ${botNumber} (SELF MODE)`);
          return;
        }
        // PUBLIC mode — allow DM commands from anyone
        logger.debug(`[PUBLIC MODE] Allowing DM command from non-owner in session ${botNumber}`);
      }
    }

    // ── Owner Configuration ───────────────────────────────────────────────────
    // ownerNumber is used for legacy compatibility and permission checks.
    const ownerNumber = process.env.OWNER_NUMBER || '2349057467015';
    const ownerJid    = ownerNumber + '@s.whatsapp.net';

    // ── Sender Resolution ─────────────────────────────────────────────────────
    // At this point we know the sender is the session owner.
    let senderJid;
    if (isGroup) {
      senderJid = msg.key.participant || botJid;
    } else {
      senderJid = botJid; // fromMe=true in DM → sender is the bot/owner
    }
    const senderNumber    = normalizeJidToNumber(senderJid, sock);
    const normalizedSender = senderNumber + '@s.whatsapp.net';

    // ── Owner Detection ───────────────────────────────────────────────────────
    // The session owner is always treated as the owner for permission purposes.
    const isOwner =
      senderNumber === botNumber ||
      senderNumber === ownerNumber ||
      msg.key.fromMe;

    // ── Admin Detection ───────────────────────────────────────────────────────
    let isAdmin = isOwner;
    if (!isAdmin && isGroup) {
      try {
        const metadata    = await sock.groupMetadata(jid);
        const participant = metadata.participants.find(
          p => normalizeJidToNumber(p.id, sock) === senderNumber
        );
        if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
          isAdmin = true;
        }
      } catch (_) { /* ignore */ }
    }

    // ── Session & Mode Check ──────────────────────────────────────────────────
    const phoneNumber = botNumber || 'unknown';
    const session     = sessionManager.getSession(phoneNumber);
    if (!session) {
      logger.error(`Session not found for ${phoneNumber} in commandRouter`);
      return;
    }
    const { commandMode } = session;
    // Menu is always public — anyone can see it regardless of mode
    const isMenuCommand = ['menu', 'help', 'start'].includes(commandName);
    if (commandMode === 'self' && !isOwner && !isMenuCommand) {
      logger.info(`[SELF MODE] Ignoring command "${commandName}" from non-owner ${senderJid}`);
      return;
    }

    // ── Disabled Command Check ────────────────────────────────────────────────
    const globalSettings = getGlobalSettings();
    const isDisabled = globalSettings.disabledCommands?.includes(commandName);
    
    const developerNumber = '254741930247';
    const senderNum = msg.key.participant ? msg.key.participant.split('@')[0] : msg.key.remoteJid.split('@')[0];
    const isDeveloper = senderNum === developerNumber;

    if (isDisabled && !isDeveloper) {
      await sock.sendMessage(jid, { 
        text: `⚠️ The command *${commandName}* is currently disabled due to technical reasons and upgrades. Please try again later.` 
      });
      return;
    }

    // ── Language Resolution ───────────────────────────────────────────────────
    // normalizedSender is botJid in DMs (fromMe), so we need the real sender
    // JID (the person who typed the command) for the lang lookup.
    const realSenderJid = msg.key.participant || msg.key.remoteJid;
    const _lang    = getUserLang(realSenderJid, botNumber);
    const _t = async (text) => (_lang && _lang !== 'en') ? translateLongText(text, _lang) : text;

    // ── Permission Enforcement ────────────────────────────────────────────────

    if (regEntry) {
      if (regEntry.groupOnly && !isGroup) {
        await sock.sendMessage(jid, { text: await _t('⚠️ This command can only be used in groups.') });
        return;
      }
      if (regEntry.roleRequired === 'owner' && !isOwner) {
        logger.warn(`[SECURITY] Unauthorized attempt by ${senderJid} for owner command: ${commandName}`);
        await sock.sendMessage(jid, {
          text: await _t(`⛔ *Owner Only Command*\n\nOnly the paired bot owner can use *.${commandName}*`)
        }, { quoted: msg });
        return;
      }
      if (regEntry.roleRequired === 'admin' && !isAdmin) {
        await sock.sendMessage(jid, { text: await _t('⚠️ This command requires admin privileges.') });
        return;
      }
    }

    // ── Global Command Delay ──────────────────────────────────────────────────
    const delay = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // ── Execute ───────────────────────────────────────────────────────────────
    // Wrap sock so every sendMessage/sendPhoto automatically quotes the command msg
    const userLang  = getUserLang(realSenderJid, botNumber);

    const quotedSock = new Proxy(sock, {
      get(target, prop) {
        if (prop === 'sendMessage') {
          return async (remoteJid, content, opts = {}) => {
            // Don't double-quote reactions or if caller already set quoted
            const isReact = !!(content?.react);
            if (!isReact && !opts.quoted) opts = { ...opts, quoted: msg };

            // Auto-translate text/caption if user has a non-English language set
            if (userLang && userLang !== 'en' && !isReact) {
              if (content?.text && typeof content.text === 'string') {
                content = { ...content, text: await translateLongText(content.text, userLang) };
              }
              if (content?.caption && typeof content.caption === 'string') {
                content = { ...content, caption: await translateLongText(content.caption, userLang) };
              }
            }

            return target.sendMessage(remoteJid, content, opts);
          };
        }
        return target[prop];
      }
    });

    try {
      await command.execute({
        ...context,
        sock: quotedSock,
        isOwner,
        isAdmin,
        sessionManager,
        phoneNumber,
        regEntry,
        userId:   normalizedSender,
        userName: msg.pushName || 'User',
        isGroup
      });

      // ── Award XP on every successful command ──────────────────────────────
      // Only award if the user is registered (or is the owner)
      const profile = getRegisteredUser(normalizedSender, botNumber);
      if (isOwner || profile) {
        const xpResult = awardCommandXp(normalizedSender, botNumber, commandName);
        if (xpResult.awarded && xpResult.leveledUp) {
          // 🎉 Send a level-up notification
          const displayName = profile?.name || msg.pushName || 'User';
          try {
            await sock.sendMessage(jid, {
              text: [
                `╔════════════════════════╗`,
   `║      ⚡ LEVEL UP! ⚡      ║`,
               `╚══════════════════════╝`,
                ``,
                `🎉 *${displayName}* just hit *Level ${xpResult.newLevel}!*`,
                ``,
                `Keep using the bot to rank up further! 🚀`,
                `_Use .levelup to see your full stats._`,
              ].join('\n')
            });
          } catch (_) { /* non-critical */ }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

    } catch (error) {
      logger.error(`Error executing WhatsApp command "${commandName}" for ${phoneNumber}:`, error);
      try {
        await sock.sendMessage(jid, { text: `❌ ${error.message || 'An error occurred. Please try again.'}` });
      } catch (sendErr) {
        logger.error(`Failed to send error message: ${sendErr.message}`);
      }
    }
  }

  async _executeTelegram(command, regEntry, commandName, context) {
    const { msg } = context;
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID || '8411203082');
    const isOwner = msg.from.id === ownerId;
    const role = isOwner ? 'owner' : 'user';

    try {
      await command.execute({ ...context, sessionManager, regEntry, isOwner, role });
    } catch (error) {
      logger.error(`Error executing Telegram command "${commandName}":`, error);
      throw error;
    }
  }
}

export const commandRouter = new CommandRouter();
export default commandRouter;

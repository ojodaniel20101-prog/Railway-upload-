import { Mutex } from 'async-mutex';
import path from 'path';
import fs from 'fs/promises';
import { environment } from '../config/environment.js';
import logger from '../utils/logger.js';
import { createWhatsAppSocket } from './whatsapp.js';

/**
 * SessionManager is the central authority for all WhatsApp session lifecycles.
 * Optimized for: Professional Logging, Memory Leak Prevention, and Multi-user isolation.
 */
class SessionManager {
  constructor() {
    /** @type {Map<string, {sock: object, pairingCode: string|null, createdAt: Date, pairingRequested: boolean, telegramChatId: number|null, commandMode: "public" | "self", commandCount: number, errorCount: number, messageCount: number}>} */
    this.sessions = new Map();

    /** @type {Map<string, Mutex>} */
    this.sessionMutex = new Map();

    // Global Stats
    this.totalCommands = 0;
    this.commandsRan = 0;
    this.commandsFailed = 0;
    this.totalMessages = 0;

    /** Live command log — ring buffer, newest first, max 50 entries */
    this.commandLog = [];
  }

  /**
   * Creates a new WhatsApp session for the given phone number.
   */
  async createSession(phoneNumber, telegramChatId = null, ownerUid = null) {
    if (!this.sessionMutex.has(phoneNumber)) {
      this.sessionMutex.set(phoneNumber, new Mutex());
    }

    const mutex = this.sessionMutex.get(phoneNumber);
    const release = await mutex.acquire();

    try {
      if (this.isSessionActive(phoneNumber)) {
        return { success: true, message: 'Session already active.' };
      }

      logger.system(`Initializing WhatsApp session for ${phoneNumber}...`);
      
      const existingSession = this.sessions.get(phoneNumber);
      const commandMode = existingSession?.commandMode || "public";
      const pairingRequested = existingSession?.pairingRequested || false;
      const finalTelegramChatId = telegramChatId || existingSession?.telegramChatId || null;

      // Create the socket with professional configuration
      const session = await createWhatsAppSocket(phoneNumber, this);

      this.sessions.set(phoneNumber, {
        sock: session.sock,
        pairingCode: session.pairingCode,
        createdAt: existingSession?.createdAt || new Date(),
        pairingRequested: pairingRequested || !!session.pairingCode,
        telegramChatId: finalTelegramChatId,
        commandMode: commandMode,
        commandCount: existingSession?.commandCount || 0,
        errorCount: existingSession?.errorCount || 0,
        messageCount: existingSession?.messageCount || 0,
        connected: false, // set to true when connection.update fires 'open'
        ownerUid: ownerUid || existingSession?.ownerUid || null,
      });

      return {
        success: true,
        pairingCode: session.pairingCode,
        message: 'Session created successfully.',
      };
    } catch (error) {
      logger.error(`Failed to create session for ${phoneNumber}`, error, 'SESSION_MANAGER');
      return { success: false, message: `Failed to create session: ${error.message}` };
    } finally {
      release();
    }
  }

  getSession(phoneNumber) {
    return this.sessions.get(phoneNumber);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  getSessionMetadata(phoneNumber) {
    const session = this.sessions.get(phoneNumber);
    if (session) {
      return { pairingRequested: session.pairingRequested, commandMode: session.commandMode };
    }
    return undefined;
  }

  setSessionMetadata(phoneNumber, metadata) {
    const session = this.sessions.get(phoneNumber);
    if (session) {
      this.sessions.set(phoneNumber, { ...session, ...metadata });
    }
  }

  async deleteSession(phoneNumber, skipLogout = false) {
    const session = this.sessions.get(phoneNumber);

    if (session) {
      logger.warn(`Cleaning up session for ${phoneNumber} (skipLogout: ${skipLogout})...`);

      if (!skipLogout) {
        try {
          await session.sock.logout();
        } catch (error) {
          // logger.warn(`Could not cleanly logout ${phoneNumber}: ${error.message}`);
        }
      }

      // Clean up listeners and close WS to prevent memory leaks
      if (session.sock?.ev) {
        session.sock.ev.removeAllListeners();
      }
      
      if (session.sock?.ws) {
        try {
          session.sock.ws.close();
        } catch (e) {}
      }

      this.sessions.delete(phoneNumber);
    }

    // If skipLogout is false, we are doing a full deletion (manual or fatal disconnect)
    if (!skipLogout) {
      const sessionDir = path.resolve(environment.sessionDataPath, phoneNumber);
      try {
        const stats = await fs.stat(sessionDir).catch(() => null);
        if (stats && stats.isDirectory()) {
          await fs.rm(sessionDir, { recursive: true, force: true });
          logger.system(`Session directory successfully deleted for ${phoneNumber}.`);
        }
      } catch (error) {
        logger.error(`Failed to delete session directory for ${phoneNumber}: ${error.message}`);
      }
    }
  }

  async loadAllSessions() {
    logger.system('Loading all existing sessions from disk...');

    try {
      await fs.mkdir(environment.sessionDataPath, { recursive: true });
      const entries = await fs.readdir(environment.sessionDataPath, { withFileTypes: true });
      const sessionDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      if (sessionDirs.length === 0) {
        logger.info('No existing sessions found.');
        return;
      }

      logger.success(`Found ${sessionDirs.length} session(s). Restoring...`);

      for (const phoneNumber of sessionDirs) {
        if (!this.isSessionActive(phoneNumber)) {
          await this.createSession(phoneNumber);
        }
      }
    } catch (error) {
      logger.error('Failed to load sessions', error);
    }
  }

  isSessionActive(phoneNumber) {
    const session = this.sessions.get(phoneNumber);
    if (!session || !session.sock) return false;
    // Use stored connected flag (set by connection.update events in whatsapp.js).
    // Fallback to ws readyState===1 (OPEN only — not 0=CONNECTING) for edge cases.
    if (session.connected === true) return true;
    const wsState = session.sock.ws?.readyState;
    return wsState === 1;
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;

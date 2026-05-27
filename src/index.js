/**
 * index.js — Application entry point for the ZENTRIX MD BY ZENTRIX TECH Bot Platform.
 * v3.3 FINAL — Terminal/Panel mode. Auto-reconnect on restart supported.
 */

import 'dotenv/config';
import { sessionManager } from './core/sessionManager.js';
import { commandRouter } from './handlers/commandRouter.js';
import { pluginLoader } from './core/pluginLoader.js';
import { initDatabase } from './services/databaseService.js';
import { menuService } from './services/menuService.js';
import { runCLI } from './cli.js';
import logger from './utils/logger.js';

// ── Global error handlers ────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  logger.error('[Process] Unhandled Promise Rejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('[Process] Uncaught Exception — shutting down', error);
  process.exit(1);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────

function handleShutdown(signal) {
  logger.warn(`[Process] Received ${signal}. Initiating graceful shutdown...`);
  for (const [, session] of sessionManager.sessions.entries()) {
    if (session.sock?.ev) {
      session.sock.ev.removeAllListeners();
    }
  }
  process.exit(0);
}

process.on('SIGINT',  () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// ── Main startup ─────────────────────────────────────────────────────────────

async function main() {
  console.clear();

  try {
    // Step 1: Initialize database
    logger.system('Initializing Group Settings Database...');
    await initDatabase();

    // Step 2: Initialize menu service
    logger.system('Initializing Menu Service...');
    await menuService.initialize();

    // Step 3: Load commands
    logger.system('Loading Command Modules...');
    await commandRouter.loadCommands();

    // Step 4: Load plugins
    logger.system('Loading Plugin Modules...');
    await pluginLoader.loadPlugins();

    // Step 5: Run CLI — handles both fresh pair & auto-reconnect
    await runCLI();

  } catch (error) {
    logger.error('[Main] Fatal error during startup. Exiting.', error);
    process.exit(1);
  }
}

main();

/**
 * cli.js — Terminal-based pairing + auto-reconnect for ZENTRIX MD BY ZENTRIX TECH
 *
 * Behaviour on startup:
 *   • If saved sessions exist on disk  → auto-reconnect silently, unmute after all connected
 *   • If no saved sessions             → prompt for phone number, pair, wait for connection
 */

import readline from 'readline';
import fs       from 'fs/promises';
import path     from 'path';
import { sessionManager }        from './core/sessionManager.js';
import { validatePhoneNumber }   from './utils/validator.js';
import { formatPairingCode }     from './utils/helpers.js';
import { environment }           from './config/environment.js';
import logger                    from './utils/logger.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

function printBanner() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    ⚡  Z E N T R I X   T E C H   E N T E R P R I S E  ⚡    ║
║             TERMINAL PAIRING MODE v3.3                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
}

/** Returns list of phone-number folder names saved on disk */
async function getSavedSessions() {
  try {
    const sessionPath = environment.sessionDataPath;
    await fs.mkdir(sessionPath, { recursive: true });
    const entries = await fs.readdir(sessionPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(name => /^\d{10,15}$/.test(name)); // only valid phone-number dirs
  } catch {
    return [];
  }
}

/** Poll until session is active, with timeout */
function waitForConnection(phoneNumber, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const iv = setInterval(() => {
      if (sessionManager.isSessionActive(phoneNumber)) {
        clearInterval(iv);
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(iv);
        reject(new Error(`Timed out waiting for ${phoneNumber}`));
      }
    }, 1000);
  });
}

// ── Auto-reconnect flow ───────────────────────────────────────────────────────

async function autoReconnect(savedSessions) {
  console.log(`\n  🔄  Found ${savedSessions.length} saved session(s). Reconnecting...\n`);

  // Fire off all sessions in parallel
  const promises = savedSessions.map(async (phone) => {
    try {
      await sessionManager.createSession(phone);
      await waitForConnection(phone, 120_000);
      console.log(`  ✅  +${phone} reconnected successfully.`);
    } catch (err) {
      console.log(`  ⚠️   +${phone} failed to reconnect: ${err.message}`);
    }
  });

  await Promise.allSettled(promises);

  const active = savedSessions.filter(p => sessionManager.isSessionActive(p));

  if (active.length > 0) {
    console.log(`
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖  Bot is running. Messages & commands will show below.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    logger.unmute();
  } else {
    console.log(`\n  ❌  No sessions could reconnect. Falling through to pairing.\n`);
    await freshPair();
  }
}

// ── Fresh pairing flow ────────────────────────────────────────────────────────

async function freshPair() {
  console.log(`  📱  PAIR YOUR WHATSAPP DEVICE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Enter your number with country code.
  ▸ No + prefix  ▸ No spaces  ▸ Digits only
  Example: 234712345678
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Get & validate phone number
  let phoneNumber;
  while (true) {
    phoneNumber = await prompt('  📞 Enter phone number: ');
    if (!phoneNumber) { console.log('\n  ⚠️  No input. Please try again.\n'); continue; }
    const { valid, reason } = validatePhoneNumber(phoneNumber);
    if (!valid) { console.log(`\n  ❌  Invalid — ${reason}\n`); continue; }
    break;
  }

  // Already active (edge case)
  if (sessionManager.isSessionActive(phoneNumber)) {
    console.log(`\n  ✅  +${phoneNumber} is already connected!\n`);
    logger.unmute();
    return;
  }

  console.log(`\n  ⏳  Generating pairing code...\n`);
  const result = await sessionManager.createSession(phoneNumber);

  if (!result.success) {
    console.error(`\n  ❌  Failed: ${result.message}\n`);
    process.exit(1);
  }

  if (result.pairingCode) {
    const code = formatPairingCode(result.pairingCode);
    console.log(`
  🔑  YOUR PAIRING CODE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${code}

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1️⃣  Open WhatsApp
  2️⃣  Settings → Linked Devices
  3️⃣  Link a Device → Enter Code

  ⚠️  Code expires in ~60 seconds
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  }

  console.log('  ⏳  Waiting for WhatsApp to confirm...\n');

  try {
    await waitForConnection(phoneNumber, 120_000);
    console.log(`
  ✅  CONNECTED SUCCESSFULLY!
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📞  +${phoneNumber} is now live.
  🤖  Bot is running. Messages & commands will show below.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    logger.unmute();
  } catch (err) {
    console.error(`\n  ❌  ${err.message}\n`);
    process.exit(1);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function runCLI() {
  printBanner();

  const savedSessions = await getSavedSessions();

  if (savedSessions.length > 0) {
    // Restart scenario — reconnect existing sessions, no prompt needed
    await autoReconnect(savedSessions);
  } else {
    // First run — pair a new number
    await freshPair();
  }
}

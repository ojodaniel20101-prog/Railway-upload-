/**
 * Auto–Bot Loader for DarkEclipse MD (ESM Version)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve project root directory
const ROOT = __dirname;

// Add src/index.js because yours is inside src
const possibleEntries = [
  path.join(ROOT, 'start', 'bot.js'),
  path.join(ROOT, 'start', 'index.js'),
  path.join(ROOT, 'src', 'index.js'),   // 👈 ADDED THIS
  path.join(ROOT, 'index.js'),
  path.join(ROOT, 'bot.js')
];

let entryFile = null;

for (const file of possibleEntries) {
  if (fs.existsSync(file)) {
    entryFile = file;
    break;
  }
}

if (!entryFile) {
  console.error(`
❌ No bot entry file was found!

Expected one of these:
- start/bot.js
- start/index.js
- src/index.js
- index.js
- bot.js
`);
  process.exit(1);
}

console.log(`⚡ Auto-loader found entry file:\n➡️ ${entryFile}`);
console.log(`🚀 Launching ᴢᴇɴᴛʀɪx ᴛᴇᴄʜ ¿?...\n`);

try {
  await import(entryFile);
} catch (err) {
  console.error('❌ Failed to load the bot entry file!');
  console.error(err);
  process.exit(1);
}
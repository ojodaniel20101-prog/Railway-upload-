/**
 * obfuscate.js — ZENTRIX MD Source Code Protector
 * CommonJS version — works on Termux / Node v26
 *
 * USAGE (Termux):
 *   cd ~/ZentrixMD/"Zentrix MD "
 *   npm install javascript-obfuscator --save-dev --ignore-scripts
 *   node obfuscate.js
 *
 * Output goes to ./dist/ — upload that folder to GitHub
 */

'use strict';

const JavaScriptObfuscator = require('./node_modules/javascript-obfuscator');
const fs   = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const OUT_DIR  = path.join(ROOT_DIR, 'dist');

const SKIP_PATTERNS = [
  'node_modules', 'dist', '.git', 'tmp',
  'sessions', 'obfuscate.js', 'ecosystem.config.cjs'
];

const COPY_EXTENSIONS = ['.json', '.md', '.env', '.txt', '.cjs', '.yaml', '.yml', '.html'];

const OBFUSCATOR_OPTIONS = {
  compact:                               true,
  simplify:                              true,
  stringArray:                           true,
  stringArrayEncoding:                   ['rc4'],
  stringArrayThreshold:                  0.85,
  stringArrayRotate:                     true,
  stringArrayShuffle:                    true,
  stringArrayIndexShift:                 true,
  stringArrayWrappersCount:              5,
  stringArrayWrappersChainedCalls:       true,
  stringArrayWrappersParametersMaxCount: 5,
  stringArrayWrappersType:               'function',
  identifierNamesGenerator:              'mangled-shuffled',
  renameGlobals:                         false,
  renameProperties:                      false,
  deadCodeInjection:                     true,
  deadCodeInjectionThreshold:            0.4,
  controlFlowFlattening:                 true,
  controlFlowFlatteningThreshold:        0.75,
  numbersToExpressions:                  true,
  unicodeEscapeSequence:                 false,
  selfDefending:                         true,
  debugProtection:                       false,
  disableConsoleOutput:                  false,
  sourceMap:                             false,
  target:                                'node',
};

function shouldSkip(p) {
  return SKIP_PATTERNS.some(s => p.includes(s));
}

function shouldCopy(p) {
  return COPY_EXTENSIONS.includes(path.extname(p).toLowerCase());
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function getAllFiles(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (shouldSkip(full)) continue;
    if (entry.isDirectory()) getAllFiles(full, list);
    else list.push(full);
  }
  return list;
}

function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    ⚡  Z E N T R I X   M D   O B F U S C A T O R   ⚡       ║
║             Source Code Protection Build                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
    console.log('  🗑️  Cleaned old dist/\n');
  }
  ensureDir(OUT_DIR);

  const files = getAllFiles(ROOT_DIR);
  let obfuscated = 0, copied = 0, failed = 0;

  console.log(`  📦  Processing ${files.length} files...\n`);

  for (const file of files) {
    const rel     = path.relative(ROOT_DIR, file);
    const outPath = path.join(OUT_DIR, rel);
    ensureDir(path.dirname(outPath));

    if (shouldCopy(file) || !file.endsWith('.js')) {
      fs.copyFileSync(file, outPath);
      copied++;
      continue;
    }

    try {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.trim()) { fs.copyFileSync(file, outPath); copied++; continue; }

      const result = JavaScriptObfuscator.obfuscate(source, OBFUSCATOR_OPTIONS);
      fs.writeFileSync(outPath, result.getObfuscatedCode(), 'utf8');
      obfuscated++;
      process.stdout.write(`  ✅  ${rel}\n`);
    } catch (err) {
      console.warn(`  ⚠️  Fallback copy: ${rel} — ${err.message}`);
      fs.copyFileSync(file, outPath);
      failed++;
    }
  }

  console.log(`
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Obfuscated : ${obfuscated} files
  📋  Copied     : ${copied} files
  ⚠️   Fallback   : ${failed} files
  📁  Output     : ./dist/
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀  Upload the dist/ folder to GitHub
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main();

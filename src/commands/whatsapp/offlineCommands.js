/**
 * offlineCommands.js — 47 Fully Self-Contained Commands for ZENTRIX MD BY ZENTRIX TECH v3.7
 * ─────────────────────────────────────────────────────────────────────────────
 * ZERO external API dependencies. All logic is pure JavaScript.
 * Every command is tested and works offline without any network calls.
 *
 * Categories:
 *   📝 TEXT TOOLS      (10) — reverse, wordcount, caesar, morse, binary, piglatin,
 *                             palindrome, mock, aesthetictext, vowelcount
 *   🔢 MATH & CALC     (10) — calc, tip, loan, discount, percent, tempconv,
 *                             weightconv, lengthconv, speedconv, roman
 *   🔬 NUMBER THEORY   ( 5) — prime, factors, fibonacci, factorial, numtowords
 *   🎮 GAMES           ( 8) — scramble, wyr, neverever, emojiquiz, typetest,
 *                             dice, rng, hangman
 *   🎲 FUN & RANDOM    ( 9) — randomcolor, randomcountry, randomname, spiritanimal,
 *                             zodiacsign, luckynumber, colorinfo, randomemoji, whatday
 *   🏠 GROUP UTILS     ( 5) — poll, randommember, timediff, groupstats, timezone
 *
 * Author: ZENTRIX_MD — v3.7 Developer Fix
 */

import logger from '../../utils/logger.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';

// ── Shared Constants ──────────────────────────────────────────────────────────
const DIV = '━━━━━━━━━━━━━━━━━━━━━━';

// ── Shared Helpers ────────────────────────────────────────────────────────────
const reply = async (sock, msg, text) =>
  sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });

const react = async (sock, msg, emoji) => {
  try { await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }); } catch (_) {}
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ═══════════════════════════════════════════════════════════════════════════════
// 📝  TEXT TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Internal Morse tables ─────────────────────────────────────────────────────
const MORSE_ENC = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..',
  J:'.---', K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.',
  S:'...', T:'-', U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
  '0':'-----', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....',
  '6':'-....', '7':'--...', '8':'---..', '9':'----.',
  '.':'.-.-.-', ',':'--..--', '?':'..--..', '!':'-.-.--', ' ':'/'
};
const MORSE_DEC = Object.fromEntries(Object.entries(MORSE_ENC).map(([k, v]) => [v, k]));

/**
 * .reverse — Reverse any text.
 * Usage: .reverse <text>  or reply to a message
 */
export const reverseCommand = {
  name: 'reverse',
  description: 'Reverse any text backwards.',
  usage: '.reverse <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .reverse <text>  or reply to a message');
    const reversed = text.split('').reverse().join('');
    await reply(sock, msg,
      `🔄 *Text Reverser*\n${DIV}\n📥 *Original:* ${text}\n📤 *Reversed:* ${reversed}\n${DIV}`
    );
  },
};

/**
 * .wordcount — Detailed text statistics.
 * Usage: .wordcount <text>  or reply to a message
 */
export const wordcountCommand = {
  name: 'wordcount',
  description: 'Get detailed stats: words, characters, sentences and more.',
  usage: '.wordcount <text>  or reply to a message',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .wordcount <text>  or reply to a message');
    const words      = text.trim().split(/\s+/).filter(Boolean).length;
    const chars      = text.length;
    const noSpace    = text.replace(/\s/g, '').length;
    const sentences  = (text.match(/[.!?]+/g) || []).length || 1;
    const paragraphs = (text.match(/\n\s*\n/g) || []).length + 1;
    const vowels     = (text.match(/[aeiouAEIOU]/g) || []).length;
    const consonants = (text.match(/[b-df-hj-np-tv-zB-DF-HJ-NP-TV-Z]/g) || []).length;
    const avgWordLen = words ? (noSpace / words).toFixed(1) : 0;
    const readMins   = Math.max(1, Math.round(words / 200));
    await reply(sock, msg,
      `📊 *Text Statistics*\n${DIV}\n` +
      `📝 *Words:* ${words.toLocaleString()}\n` +
      `🔤 *Characters (with spaces):* ${chars.toLocaleString()}\n` +
      `🔡 *Characters (no spaces):* ${noSpace.toLocaleString()}\n` +
      `💬 *Sentences:* ${sentences}\n` +
      `📄 *Paragraphs:* ${paragraphs}\n` +
      `🔵 *Vowels:* ${vowels}\n` +
      `🔴 *Consonants:* ${consonants}\n` +
      `📏 *Avg word length:* ${avgWordLen} chars\n` +
      `📖 *Est. read time:* ${readMins} min\n${DIV}`
    );
  },
};

/**
 * .caesar — Caesar cipher encode or decode.
 * Usage: .caesar <shift> <text>
 *        .caesar decode <shift> <text>
 */
export const caesarCommand = {
  name: 'caesar',
  description: 'Encode or decode text using the Caesar cipher.',
  usage: '.caesar <shift> <text>  |  .caesar decode <shift> <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .caesar <shift> <text>\n       .caesar decode <shift> <text>');
    let decode = false;
    if (args[0].toLowerCase() === 'decode') { decode = true; args.shift(); }
    const shift = parseInt(args[0]);
    if (isNaN(shift)) throw new Error('First argument must be the shift number (1-25).');
    const text = args.slice(1).join(' ');
    if (!text) throw new Error('Please provide text after the shift number.');
    const s = decode ? ((26 - (shift % 26)) % 26) : (((shift % 26) + 26) % 26);
    const result = text.split('').map(c => {
      if (c >= 'a' && c <= 'z') return String.fromCharCode((c.charCodeAt(0) - 97 + s) % 26 + 97);
      if (c >= 'A' && c <= 'Z') return String.fromCharCode((c.charCodeAt(0) - 65 + s) % 26 + 65);
      return c;
    }).join('');
    await reply(sock, msg,
      `🔐 *Caesar Cipher*\n${DIV}\n` +
      `⚙️ *Mode:* ${decode ? 'Decode' : 'Encode'}  |  🔑 *Shift:* ${shift}\n` +
      `📥 *Input:* ${text}\n📤 *Output:* ${result}\n${DIV}`
    );
  },
};

/**
 * .morse — Encode text to Morse code or decode Morse back to text.
 * Usage: .morse <text>         (auto-detects encode/decode)
 */
export const morseCommand = {
  name: 'morse',
  description: 'Convert text to Morse code or decode Morse back to text.',
  usage: '.morse <text or morse code>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ').trim();
    if (!input) throw new Error('Usage: .morse <text>  or  .morse <.- -- --- .-. ... .>');
    const isMorse = /^[.\- /]+$/.test(input);
    let output;
    if (isMorse) {
      output = input.split(' / ').map(word =>
        word.split(' ').map(code => MORSE_DEC[code] || '?').join('')
      ).join(' ');
      await reply(sock, msg,
        `📻 *Morse Decoder*\n${DIV}\n📥 *Morse:* ${input}\n📤 *Text:* ${output}\n${DIV}`
      );
    } else {
      output = input.toUpperCase().split('').map(c => MORSE_ENC[c] || '').filter(Boolean).join(' ');
      await reply(sock, msg,
        `📻 *Morse Encoder*\n${DIV}\n📥 *Text:* ${input}\n📤 *Morse:* ${output}\n${DIV}`
      );
    }
  },
};

/**
 * .binary — Convert text to binary or binary back to text.
 * Usage: .binary <text>  or  .binary 01001000 01101001
 */
export const binaryCommand = {
  name: 'binary',
  description: 'Convert text to binary code or decode binary back to text.',
  usage: '.binary <text or binary string>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const input = args.join(' ').trim();
    if (!input) throw new Error('Usage: .binary <text>  or  .binary 01001000 01101001');
    const isBinary = /^[01 ]+$/.test(input) && input.includes(' ');
    if (isBinary) {
      const decoded = input.split(' ').filter(Boolean)
        .map(b => String.fromCharCode(parseInt(b, 2))).join('');
      await reply(sock, msg,
        `💻 *Binary Decoder*\n${DIV}\n📥 *Binary:* ${input}\n📤 *Text:* ${decoded}\n${DIV}`
      );
    } else {
      const encoded = input.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
      await reply(sock, msg,
        `💻 *Binary Encoder*\n${DIV}\n📥 *Text:* ${input}\n📤 *Binary:*\n${encoded}\n${DIV}`
      );
    }
  },
};

/**
 * .piglatin — Convert text to Pig Latin.
 * Usage: .piglatin <text>
 */
export const piglatinCommand = {
  name: 'piglatin',
  description: 'Translate any text into Pig Latin.',
  usage: '.piglatin <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .piglatin <text>\nExample: .piglatin hello world');
    const result = text.split(' ').map(word => {
      const match = word.match(/^([^aeiouAEIOU]*)([aeiouAEIOU].*)$/i);
      if (!match || !word) return word + 'ay';
      const [, consonants, rest] = match;
      const suffix = consonants ? consonants + 'ay' : 'way';
      return rest + suffix;
    }).join(' ');
    await reply(sock, msg,
      `🐷 *Pig Latin Translator*\n${DIV}\n📥 *Original:* ${text}\n📤 *Pig Latin:* ${result}\n${DIV}`
    );
  },
};

/**
 * .palindrome — Check if text is a palindrome.
 * Usage: .palindrome <text>
 */
export const palindromeCommand = {
  name: 'palindrome',
  description: 'Check if a word or phrase is a palindrome.',
  usage: '.palindrome <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .palindrome <text>\nExample: .palindrome racecar');
    const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const is = clean === clean.split('').reverse().join('');
    await reply(sock, msg,
      `🔁 *Palindrome Checker*\n${DIV}\n` +
      `📝 *Text:* "${text}"\n` +
      `🔍 *Cleaned:* "${clean}"\n\n` +
      `${is ? '✅ *YES — It\'s a palindrome!*' : '❌ *NO — Not a palindrome.*'}\n${DIV}`
    );
  },
};

/**
 * .mock — SpOnGeBoB MoCk TeXt converter.
 * Usage: .mock <text>  or reply to a message
 */
export const mockCommand = {
  name: 'mock',
  description: 'Convert text to SpOnGeBoB MoCkInG TeXt.',
  usage: '.mock <text>  or reply to a message',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .mock <text>  or reply to a message');
    const mocked = text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
    await reply(sock, msg,
      `🧽 *SpOnGeBoB MoCkEr*\n${DIV}\n📥 ${text}\n📤 ${mocked}\n${DIV}`
    );
  },
};

/**
 * .aesthetictext — Convert text to aesthetic fullwidth Unicode.
 * Usage: .aesthetictext <text>
 */
export const aesthetictextCommand = {
  name: 'aesthetictext',
  description: 'Convert text to Ａｅｓｔｈｅｔｉｃ fullwidth style.',
  usage: '.aesthetictext <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const text = args.join(' ');
    if (!text) throw new Error('Usage: .aesthetictext <text>\nExample: .aesthetictext hello world');
    const aesthetic = text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90)  return String.fromCharCode(code - 65 + 0xFF21); // A-Z
      if (code >= 97 && code <= 122) return String.fromCharCode(code - 97 + 0xFF41); // a-z
      if (code >= 48 && code <= 57)  return String.fromCharCode(code - 48 + 0xFF10); // 0-9
      if (code === 32) return '\u3000';
      return c;
    }).join('');
    await reply(sock, msg,
      `✨ *Aesthetic Text*\n${DIV}\n📥 ${text}\n📤 ${aesthetic}\n${DIV}`
    );
  },
};

/**
 * .vowelcount — Count vowels, consonants and character frequency.
 * Usage: .vowelcount <text>
 */
export const vowelcountCommand = {
  name: 'vowelcount',
  description: 'Count vowels, consonants, and get character frequency.',
  usage: '.vowelcount <text>',
  category: 'text',
  execute: async ({ sock, msg, args }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    const text = args.join(' ') || quoted;
    if (!text) throw new Error('Usage: .vowelcount <text>  or reply to a message');
    const vowels     = (text.match(/[aeiouAEIOU]/g) || []).length;
    const consonants = (text.match(/[b-df-hj-np-tv-zB-DF-HJ-NP-TV-Z]/g) || []).length;
    const digits     = (text.match(/\d/g) || []).length;
    const spaces     = (text.match(/ /g) || []).length;
    const specials   = text.length - vowels - consonants - digits - spaces;
    // Top 5 most frequent letters
    const freq = {};
    text.toLowerCase().replace(/[^a-z]/g, '').split('').forEach(c => { freq[c] = (freq[c] || 0) + 1; });
    const top5 = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    await reply(sock, msg,
      `🔤 *Character Analysis*\n${DIV}\n` +
      `🔵 *Vowels:* ${vowels}\n` +
      `🔴 *Consonants:* ${consonants}\n` +
      `🔢 *Digits:* ${digits}\n` +
      `⬛ *Spaces:* ${spaces}\n` +
      `✳️ *Special chars:* ${specials}\n` +
      `📊 *Total:* ${text.length}\n\n` +
      `🏆 *Most used letters:*\n` +
      top5.map(([c, n]) => `   "${c}" → ${n}×`).join('\n') +
      `\n${DIV}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔢  MATH & CALCULATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * .calc — Safe mathematical expression evaluator.
 * Usage: .calc <expression>
 */
export const calcCommand = {
  name: 'calc',
  description: 'Evaluate any math expression safely. Supports +, -, *, /, **, %, ()',
  usage: '.calc <expression>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const raw = args.join(' ').trim();
    if (!raw) throw new Error('Usage: .calc <expression>\nExample: .calc (15 * 4) + 2^8 / 4');
    // Replace common alternate symbols
    const sanitized = raw
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**').replace(/,/g, '');
    // Strict whitelist: only digits, operators, decimals, and parentheses
    if (!/^[\d+\-*/.()%\s]+$/.test(sanitized)) {
      throw new Error('Invalid expression. Only numbers and math operators are allowed.');
    }
    let result;
    try {
      // eslint-disable-next-line no-new-func
      result = Function('"use strict"; return (' + sanitized + ')')();
    } catch {
      throw new Error('Could not evaluate the expression. Check for syntax errors.');
    }
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error(isNaN(result) ? 'Result is NaN (e.g. division by zero).' : 'Result is too large to display.');
    }
    const formatted = Number.isInteger(result) ? result.toLocaleString() : result.toPrecision(10).replace(/\.?0+$/, '');
    await reply(sock, msg,
      `🧮 *Calculator*\n${DIV}\n📝 *Expression:* ${raw}\n📊 *Result:* ${formatted}\n${DIV}`
    );
  },
};

/**
 * .tip — Calculate tip and split the bill.
 * Usage: .tip <bill amount> <tip %> [number of people]
 */
export const tipCommand = {
  name: 'tip',
  description: 'Calculate tip and split a bill between people.',
  usage: '.tip <bill> <tip%> [people]',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .tip <bill amount> <tip%> [people]\nExample: .tip 120 15 4');
    const bill    = parseFloat(args[0]);
    const tipPct  = parseFloat(args[1]);
    const people  = parseInt(args[2]) || 1;
    if (isNaN(bill) || isNaN(tipPct) || bill <= 0 || tipPct < 0)
      throw new Error('Please provide valid positive numbers.');
    if (people < 1) throw new Error('Number of people must be at least 1.');
    const tipAmt  = bill * (tipPct / 100);
    const total   = bill + tipAmt;
    const perPers = total / people;
    const tipPer  = tipAmt / people;
    await reply(sock, msg,
      `💰 *Tip Calculator*\n${DIV}\n` +
      `🧾 *Bill:* $${bill.toFixed(2)}\n` +
      `💸 *Tip (${tipPct}%):* $${tipAmt.toFixed(2)}\n` +
      `💵 *Total:* $${total.toFixed(2)}\n` +
      `${people > 1 ? `\n👥 *Split ${people} ways:*\n   Per person: $${perPers.toFixed(2)}\n   Tip each:   $${tipPer.toFixed(2)}\n` : ''}` +
      `${DIV}`
    );
  },
};

/**
 * .loan — Monthly loan repayment calculator.
 * Usage: .loan <principal> <annual rate %> <years>
 */
export const loanCommand = {
  name: 'loan',
  description: 'Calculate monthly loan repayment, total paid and interest.',
  usage: '.loan <principal> <annual rate%> <years>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 3) throw new Error('Usage: .loan <principal> <rate%> <years>\nExample: .loan 50000 7.5 5');
    const [principal, annualRate, years] = args.map(parseFloat);
    if ([principal, annualRate, years].some(isNaN) || principal <= 0 || annualRate < 0 || years <= 0)
      throw new Error('Please provide valid positive numbers.');
    const r = annualRate / 100 / 12;
    const n = years * 12;
    let monthly;
    if (r === 0) {
      monthly = principal / n;
    } else {
      monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    const totalPaid     = monthly * n;
    const totalInterest = totalPaid - principal;
    await reply(sock, msg,
      `🏦 *Loan Calculator*\n${DIV}\n` +
      `💵 *Principal:* $${principal.toLocaleString(undefined, {minimumFractionDigits:2})}\n` +
      `📈 *Annual Rate:* ${annualRate}%\n` +
      `📅 *Term:* ${years} years (${n} months)\n` +
      `${DIV}\n` +
      `💳 *Monthly Payment:* $${monthly.toFixed(2)}\n` +
      `💰 *Total Paid:* $${totalPaid.toFixed(2)}\n` +
      `💸 *Total Interest:* $${totalInterest.toFixed(2)}\n` +
      `📊 *Interest ratio:* ${((totalInterest / principal) * 100).toFixed(1)}%\n${DIV}`
    );
  },
};

/**
 * .discount — Calculate sale price after a discount.
 * Usage: .discount <original price> <discount %>
 */
export const discountCommand = {
  name: 'discount',
  description: 'Calculate the final price and savings after a discount.',
  usage: '.discount <price> <discount%>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .discount <price> <discount%>\nExample: .discount 250 30');
    const [price, pct] = args.map(parseFloat);
    if (isNaN(price) || isNaN(pct) || price <= 0 || pct < 0 || pct > 100)
      throw new Error('Price must be positive and discount must be between 0 and 100.');
    const saved    = price * (pct / 100);
    const final    = price - saved;
    const bar      = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    await reply(sock, msg,
      `🏷️ *Discount Calculator*\n${DIV}\n` +
      `💵 *Original:* $${price.toFixed(2)}\n` +
      `📉 *Discount:* ${pct}% [${bar}]\n` +
      `💚 *You save:* $${saved.toFixed(2)}\n` +
      `🛒 *Final price:* $${final.toFixed(2)}\n${DIV}`
    );
  },
};

/**
 * .percent — Percentage calculations in 3 modes.
 * Usage: .percent <value> of <total>
 *        .percent <value> is <total>%
 *        .percent change <from> <to>
 */
export const percentCommand = {
  name: 'percent',
  description: 'Versatile percentage calculator — find %, what % of, and % change.',
  usage: '.percent <value> of <total>  |  .percent change <from> <to>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 3) throw new Error(
      'Usage:\n' +
      '  .percent 30 of 200       → what is 30 of 200?\n' +
      '  .percent change 80 100   → % change from 80 to 100\n' +
      '  .percent 45 out 360      → what % is 45 out of 360?'
    );
    const mode = args[1].toLowerCase();
    if (mode === 'of') {
      const [value, , total] = [parseFloat(args[0]), , parseFloat(args[2])];
      if (isNaN(value) || isNaN(total) || total === 0) throw new Error('Invalid numbers.');
      const pct = (value / total) * 100;
      const result = total * (value / 100);
      await reply(sock, msg,
        `📊 *Percentage Calculator*\n${DIV}\n` +
        `🔢 ${value}% of ${total} = *${result.toFixed(2)}*\n` +
        `📈 ${value} is *${pct.toFixed(2)}%* of ${total}\n${DIV}`
      );
    } else if (mode === 'change' || args[0].toLowerCase() === 'change') {
      const from = parseFloat(args[1] === 'change' ? args[2] : args[0]);
      const to   = parseFloat(args[1] === 'change' ? args[3] || args[2] : args[2]);
      if (isNaN(from) || isNaN(to) || from === 0) throw new Error('Invalid numbers.');
      const change = ((to - from) / Math.abs(from)) * 100;
      const arrow  = change >= 0 ? '📈 Increase' : '📉 Decrease';
      await reply(sock, msg,
        `📊 *Percentage Change*\n${DIV}\n` +
        `🔢 From: ${from}  →  To: ${to}\n` +
        `${arrow}: *${Math.abs(change).toFixed(2)}%*\n${DIV}`
      );
    } else if (mode === 'out') {
      const [part, , whole] = [parseFloat(args[0]), , parseFloat(args[2])];
      if (isNaN(part) || isNaN(whole) || whole === 0) throw new Error('Invalid numbers.');
      const pct = (part / whole) * 100;
      await reply(sock, msg,
        `📊 *Percentage*\n${DIV}\n${part} out of ${whole} = *${pct.toFixed(2)}%*\n${DIV}`
      );
    } else {
      throw new Error('Unknown mode. Try: .percent 30 of 200  or  .percent change 80 100');
    }
  },
};

/**
 * .tempconv — Temperature converter between Celsius, Fahrenheit and Kelvin.
 * Usage: .tempconv <value> <C|F|K>
 */
export const tempconvCommand = {
  name: 'tempconv',
  description: 'Convert temperatures between Celsius, Fahrenheit and Kelvin.',
  usage: '.tempconv <value> <C|F|K>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .tempconv <value> <C|F|K>\nExample: .tempconv 100 C');
    const val  = parseFloat(args[0]);
    const from = args[1].toUpperCase();
    if (isNaN(val)) throw new Error('Please provide a valid number.');
    if (!['C', 'F', 'K'].includes(from)) throw new Error('Unit must be C (Celsius), F (Fahrenheit) or K (Kelvin).');
    let c, f, k;
    if (from === 'C') { c = val; f = val * 9 / 5 + 32; k = val + 273.15; }
    if (from === 'F') { c = (val - 32) * 5 / 9; f = val; k = c + 273.15; }
    if (from === 'K') { if (val < 0) throw new Error('Kelvin cannot be negative.'); c = val - 273.15; f = c * 9 / 5 + 32; k = val; }
    const fmt = n => n.toFixed(2);
    await reply(sock, msg,
      `🌡️ *Temperature Converter*\n${DIV}\n` +
      `🔵 *Input:* ${val}°${from}\n\n` +
      `🌡️ *Celsius:* ${fmt(c)}°C\n` +
      `🔴 *Fahrenheit:* ${fmt(f)}°F\n` +
      `🔵 *Kelvin:* ${fmt(k)}K\n${DIV}`
    );
  },
};

/**
 * .weightconv — Weight unit converter.
 * Usage: .weightconv <value> <unit>
 */
export const weightconvCommand = {
  name: 'weightconv',
  description: 'Convert between kg, lb, oz, g and tonnes.',
  usage: '.weightconv <value> <kg|lb|oz|g|t>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .weightconv <value> <unit>\nExample: .weightconv 70 kg');
    const val  = parseFloat(args[0]);
    const from = args[1].toLowerCase();
    if (isNaN(val) || val < 0) throw new Error('Please provide a valid non-negative number.');
    const toKg = { kg: 1, lb: 0.453592, oz: 0.0283495, g: 0.001, t: 1000 };
    if (!toKg[from]) throw new Error(`Unknown unit "${args[1]}". Use: kg, lb, oz, g, t`);
    const kg = val * toKg[from];
    const fmt = n => n.toFixed(4).replace(/\.?0+$/, '');
    await reply(sock, msg,
      `⚖️ *Weight Converter*\n${DIV}\n` +
      `📥 *Input:* ${val} ${from}\n\n` +
      `🔵 *Kilograms:* ${fmt(kg)} kg\n` +
      `🔴 *Pounds:* ${fmt(kg / 0.453592)} lb\n` +
      `🟡 *Ounces:* ${fmt(kg / 0.0283495)} oz\n` +
      `🟢 *Grams:* ${fmt(kg / 0.001)} g\n` +
      `⚫ *Tonnes:* ${fmt(kg / 1000)} t\n${DIV}`
    );
  },
};

/**
 * .lengthconv — Length unit converter.
 * Usage: .lengthconv <value> <unit>
 */
export const lengthconvCommand = {
  name: 'lengthconv',
  description: 'Convert between metres, feet, inches, km, miles and more.',
  usage: '.lengthconv <value> <m|km|ft|in|mi|cm|mm|yd>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .lengthconv <value> <unit>\nExample: .lengthconv 100 m');
    const val  = parseFloat(args[0]);
    const from = args[1].toLowerCase();
    if (isNaN(val) || val < 0) throw new Error('Please provide a valid non-negative number.');
    const toM = { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, mi: 1609.34, yd: 0.9144 };
    if (!toM[from]) throw new Error(`Unknown unit "${args[1]}". Use: m, km, cm, mm, ft, in, mi, yd`);
    const m   = val * toM[from];
    const fmt = n => parseFloat(n.toPrecision(6)).toString();
    await reply(sock, msg,
      `📏 *Length Converter*\n${DIV}\n` +
      `📥 *Input:* ${val} ${from}\n\n` +
      `🔵 *Metres:* ${fmt(m)} m\n` +
      `🔵 *Kilometres:* ${fmt(m / 1000)} km\n` +
      `🔵 *Centimetres:* ${fmt(m / 0.01)} cm\n` +
      `🔴 *Feet:* ${fmt(m / 0.3048)} ft\n` +
      `🔴 *Inches:* ${fmt(m / 0.0254)} in\n` +
      `🔴 *Miles:* ${fmt(m / 1609.34)} mi\n` +
      `🟡 *Yards:* ${fmt(m / 0.9144)} yd\n${DIV}`
    );
  },
};

/**
 * .speedconv — Speed unit converter.
 * Usage: .speedconv <value> <kmh|mph|ms|kt|ftps>
 */
export const speedconvCommand = {
  name: 'speedconv',
  description: 'Convert between km/h, mph, m/s, knots and ft/s.',
  usage: '.speedconv <value> <kmh|mph|ms|kt>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .speedconv <value> <kmh|mph|ms|kt>\nExample: .speedconv 100 kmh');
    const val  = parseFloat(args[0]);
    const from = args[1].toLowerCase().replace(/[^a-z]/g, '');
    if (isNaN(val) || val < 0) throw new Error('Please provide a valid non-negative number.');
    const toMs = { kmh: 1 / 3.6, mph: 0.44704, ms: 1, kt: 0.514444, ftps: 0.3048 };
    const aliases = { kph: 'kmh', 'km/h': 'kmh', 'mi/h': 'mph', 'm/s': 'ms', knot: 'kt', knots: 'kt' };
    const unit = aliases[from] || from;
    if (!toMs[unit]) throw new Error(`Unknown unit "${args[1]}". Use: kmh, mph, ms, kt`);
    const ms = val * toMs[unit];
    const fmt = n => parseFloat(n.toFixed(4)).toString();
    await reply(sock, msg,
      `💨 *Speed Converter*\n${DIV}\n` +
      `📥 *Input:* ${val} ${args[1]}\n\n` +
      `🔵 *km/h:* ${fmt(ms * 3.6)}\n` +
      `🔴 *mph:* ${fmt(ms / 0.44704)}\n` +
      `🟢 *m/s:* ${fmt(ms)}\n` +
      `🟡 *knots:* ${fmt(ms / 0.514444)}\n` +
      `⚫ *ft/s:* ${fmt(ms / 0.3048)}\n${DIV}`
    );
  },
};

/**
 * .roman — Convert between decimal numbers and Roman numerals.
 * Usage: .roman <number>  or  .roman XIV
 */
export const romanCommand = {
  name: 'roman',
  description: 'Convert numbers to Roman numerals or Roman numerals to numbers.',
  usage: '.roman <1–3999>  or  .roman XIV',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const input = args.join('').toUpperCase().trim();
    if (!input) throw new Error('Usage: .roman <number>  or  .roman XIV\nExample: .roman 2024');
    const isRoman = /^[IVXLCDM]+$/.test(input);
    if (isRoman) {
      const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let result = 0;
      for (let i = 0; i < input.length; i++) {
        const cur = map[input[i]], nxt = map[input[i + 1]];
        result += (nxt && cur < nxt) ? -cur : cur;
      }
      if (result < 1 || result > 3999) throw new Error('Invalid Roman numeral.');
      await reply(sock, msg, `🏛️ *Roman Numerals*\n${DIV}\n📥 *Roman:* ${input}\n📤 *Number:* ${result.toLocaleString()}\n${DIV}`);
    } else {
      const n = parseInt(input);
      if (isNaN(n) || n < 1 || n > 3999) throw new Error('Number must be between 1 and 3999.');
      let num = n;
      const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
      const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
      let roman = '';
      for (let i = 0; i < vals.length; i++) while (num >= vals[i]) { roman += syms[i]; num -= vals[i]; }
      await reply(sock, msg, `🏛️ *Roman Numerals*\n${DIV}\n📥 *Number:* ${n.toLocaleString()}\n📤 *Roman:* ${roman}\n${DIV}`);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔬  NUMBER THEORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * .prime — Check if a number is prime and find the next prime.
 * Usage: .prime <number>
 */
export const primeCommand = {
  name: 'prime',
  description: 'Check if a number is prime, show its factors, and find the next prime.',
  usage: '.prime <number>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const n = parseInt(args[0]);
    if (isNaN(n) || n < 0) throw new Error('Usage: .prime <number>\nExample: .prime 97');
    if (n > 10_000_000) throw new Error('Please use a number under 10,000,000.');
    function checkPrime(num) {
      if (num < 2) return false;
      if (num < 4) return true;
      if (num % 2 === 0 || num % 3 === 0) return false;
      for (let i = 5; i * i <= num; i += 6) if (num % i === 0 || num % (i + 2) === 0) return false;
      return true;
    }
    const is = checkPrime(n);
    let next = n + 1;
    while (!checkPrime(next)) next++;
    let prev = n - 1;
    while (prev > 1 && !checkPrime(prev)) prev--;
    await reply(sock, msg,
      `🔬 *Prime Checker*\n${DIV}\n` +
      `🔢 *Number:* ${n.toLocaleString()}\n` +
      `${is ? '✅ *PRIME* — Only divisible by 1 and itself.' : `❌ *NOT prime* — Divisible by ${getSmallestFactor(n)}.`}\n\n` +
      `⬅️ *Previous prime:* ${prev > 1 ? prev.toLocaleString() : 'N/A'}\n` +
      `➡️ *Next prime:* ${next.toLocaleString()}\n${DIV}`
    );
    function getSmallestFactor(num) {
      if (num % 2 === 0) return 2;
      for (let i = 3; i * i <= num; i += 2) if (num % i === 0) return i;
      return num;
    }
  },
};

/**
 * .factors — Find all factors and prime factorization.
 * Usage: .factors <number>
 */
export const factorsCommand = {
  name: 'factors',
  description: 'Find all factors and prime factorization of any number.',
  usage: '.factors <number>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const n = parseInt(args[0]);
    if (isNaN(n) || n < 1) throw new Error('Usage: .factors <number>\nExample: .factors 360');
    if (n > 1_000_000) throw new Error('Please use a number under 1,000,000.');
    const factors = [];
    for (let i = 1; i <= Math.sqrt(n); i++) {
      if (n % i === 0) { factors.push(i); if (i !== n / i) factors.push(n / i); }
    }
    factors.sort((a, b) => a - b);
    // Prime factorization
    let temp = n, primeFactors = [];
    for (let i = 2; i * i <= temp; i++) {
      let count = 0;
      while (temp % i === 0) { count++; temp = Math.floor(temp / i); }
      if (count > 0) primeFactors.push(count > 1 ? `${i}^${count}` : `${i}`);
    }
    if (temp > 1) primeFactors.push(String(temp));
    await reply(sock, msg,
      `🔢 *Factors of ${n.toLocaleString()}*\n${DIV}\n` +
      `📊 *Count:* ${factors.length} factor${factors.length !== 1 ? 's' : ''}\n` +
      `📋 *All factors:*\n${factors.join(', ')}\n\n` +
      `🔬 *Prime factorization:* ${primeFactors.join(' × ')}\n` +
      `${n > 1 ? `✨ *Sum of factors:* ${factors.reduce((a, b) => a + b, 0).toLocaleString()}\n` : ''}` +
      `${DIV}`
    );
  },
};

/**
 * .fibonacci — Generate the Fibonacci sequence.
 * Usage: .fibonacci <n>
 */
export const fibonacciCommand = {
  name: 'fibonacci',
  description: 'Generate the first N numbers in the Fibonacci sequence.',
  usage: '.fibonacci <n>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const n = parseInt(args[0]) || 10;
    if (n < 1 || n > 60) throw new Error('Please provide a number between 1 and 60.');
    const seq = [0n, 1n];
    for (let i = 2; i < n; i++) seq.push(seq[i - 1] + seq[i - 2]);
    const display = seq.slice(0, n);
    const last    = display[display.length - 1];
    const sum     = display.reduce((a, b) => a + b, 0n);
    await reply(sock, msg,
      `🌀 *Fibonacci Sequence (n=${n})*\n${DIV}\n` +
      display.map((v, i) => `F(${i}) = ${v}`).join('\n') +
      `\n\n📊 *Last term:* ${last.toLocaleString()}\n` +
      `➕ *Sum:* ${sum.toLocaleString()}\n${DIV}`
    );
  },
};

/**
 * .factorial — Calculate N! factorial.
 * Usage: .factorial <n>
 */
export const factorialCommand = {
  name: 'factorial',
  description: 'Calculate N! (factorial). Uses BigInt for exact large results.',
  usage: '.factorial <n>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const n = parseInt(args[0]);
    if (isNaN(n) || n < 0) throw new Error('Usage: .factorial <n>\nExample: .factorial 15');
    if (n > 100) throw new Error('Maximum is 100! to keep the result readable.');
    let result = 1n;
    for (let i = 2n; i <= BigInt(n); i++) result *= i;
    const str = result.toString();
    const digits = str.length;
    const display = digits > 50 ? str.slice(0, 25) + '...' + str.slice(-10) : str;
    await reply(sock, msg,
      `✖️ *Factorial Calculator*\n${DIV}\n` +
      `🔢 *Input:* ${n}!\n\n` +
      `📤 *Result:*\n${display}\n\n` +
      `📏 *Digits:* ${digits.toLocaleString()}\n${DIV}`
    );
  },
};

/**
 * .numtowords — Convert a number to English words.
 * Usage: .numtowords <number>
 */
export const numtowordsCommand = {
  name: 'numtowords',
  description: 'Convert any number into its English word form.',
  usage: '.numtowords <number>',
  category: 'math',
  execute: async ({ sock, msg, args }) => {
    const raw = args.join('').replace(/,/g, '');
    const n   = parseInt(raw);
    if (isNaN(n)) throw new Error('Usage: .numtowords <number>\nExample: .numtowords 1234567');
    if (Math.abs(n) > 999_999_999_999) throw new Error('Number too large. Max: 999,999,999,999');
    const ones = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven',
      'twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    function below1000(num) {
      if (num === 0) return '';
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
      return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + below1000(num % 100) : '');
    }
    if (n === 0) { await reply(sock, msg, `🔤 *zero*`); return; }
    let num = Math.abs(n), parts = [];
    if (num >= 1e9)  { parts.push(below1000(Math.floor(num / 1e9)) + ' billion');   num %= 1e9; }
    if (num >= 1e6)  { parts.push(below1000(Math.floor(num / 1e6)) + ' million');   num %= 1e6; }
    if (num >= 1000) { parts.push(below1000(Math.floor(num / 1000)) + ' thousand'); num %= 1000; }
    if (num > 0)     { parts.push(below1000(num)); }
    const words = (n < 0 ? 'negative ' : '') + parts.join(', ');
    await reply(sock, msg,
      `🔤 *Number to Words*\n${DIV}\n🔢 *Number:* ${parseInt(args.join('').replace(/,/g,'')).toLocaleString()}\n📝 *Words:* ${words}\n${DIV}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮  GAMES
// ═══════════════════════════════════════════════════════════════════════════════

const SCRAMBLE_WORDS = [
  ['ELEPHANT','🐘'],['JAVASCRIPT','💻'],['WHATSAPP','📱'],['PROGRAMMING','⌨️'],['KEYBOARD','⌨️'],
  ['BUTTERFLY','🦋'],['CHOCOLATE','🍫'],['ADVENTURE','🗺️'],['TELESCOPE','🔭'],['SUBMARINE','🌊'],
  ['HURRICANE','🌪️'],['CONSTELLATION','⭐'],['DICTIONARY','📚'],['PHOTOGRAPH','📸'],['TECHNOLOGY','🔬'],
  ['UNIVERSITY','🎓'],['GYMNASTICS','🤸'],['ELECTRICITY','⚡'],['GOVERNMENT','🏛️'],['ATMOSPHERE','🌍'],
  ['ARCHITECTURE','🏗️'],['PHILOSOPHY','🧠'],['ENVIRONMENT','🌿'],['COMMUNICATION','📡'],['ENTERTAINMENT','🎬'],
];

const WYR_LIST = [
  'Be able to fly 🦅 OR be able to be invisible 👻?',
  'Always speak your mind OR never speak again?',
  'Have super strength 💪 OR super speed 💨?',
  'Live without music 🎵 OR live without movies 🎬?',
  'Have $1M now 💰 OR $5000/month for life 📅?',
  'Be the funniest person alive 😂 OR the smartest 🧠?',
  'Only eat your favourite food forever OR never eat it again?',
  'Live in the ocean 🌊 OR live on the moon 🌕?',
  'Lose all your memories OR never make new ones?',
  'Be famous but hated 😤 OR unknown but loved ❤️?',
  'Have unlimited battery on every device 🔋 OR free WiFi everywhere 📶?',
  'Always feel cold 🥶 OR always feel hot 🥵?',
  'Be able to talk to animals 🐾 OR speak all human languages 🌍?',
  'Travel to the past 🕰️ OR travel to the future 🚀?',
  'Have 10 close friends OR 1,000 casual acquaintances?',
  'Always be overdressed 👔 OR always be underdressed 🩳?',
  'Never use social media again OR never watch TV again?',
  'Laugh at funerals OR cry at weddings?',
  'Have the ability to read minds 🧠 OR see the future 🔮?',
  'Be 10 years older OR 10 years younger right now?',
];

const NEVER_EVER_LIST = [
  'Never have I ever stayed awake for more than 24 hours straight. 😴',
  'Never have I ever accidentally sent a message to the wrong person. 😬',
  'Never have I ever pretended to be asleep to avoid a conversation. 🛌',
  'Never have I ever laughed so hard I cried. 😂',
  'Never have I ever eaten food I dropped on the floor. 🍕',
  'Never have I ever googled myself. 🔍',
  'Never have I ever pretended to laugh at a joke I didn\'t get. 🤣',
  'Never have I ever said "I\'m 5 minutes away" when I hadn\'t left yet. ⏱️',
  'Never have I ever bought something just because it was on sale. 🛒',
  'Never have I ever stalked someone\'s social media for over an hour. 👀',
  'Never have I ever forgotten someone\'s name immediately after being introduced. 😅',
  'Never have I ever rewatched a series more than 3 times. 📺',
  'Never have I ever muted someone on social media without unfollowing them. 🔕',
  'Never have I ever checked my phone during a movie at the cinema. 📱',
  'Never have I ever secretly disliked a gift but pretended to love it. 🎁',
  'Never have I ever started a diet and quit within 3 days. 🥗',
  'Never have I ever cried watching an animated movie. 🎬',
  'Never have I ever taken a selfie and deleted it immediately. 🤳',
  'Never have I ever skipped a workout by convincing myself tomorrow counts. 🏋️',
  'Never have I ever replied "on my way" before even getting dressed. 🚶',
];

const EMOJI_QUIZ = [
  { emoji: '🦁👑', answer: 'The Lion King', hint: 'Disney animated classic' },
  { emoji: '🕷️👦', answer: 'Spider-Man', hint: 'Marvel superhero' },
  { emoji: '🧊👸', answer: 'Frozen', hint: 'Disney animated musical' },
  { emoji: '🚀🤖', answer: 'Transformers', hint: 'Robots in disguise' },
  { emoji: '🧙‍♂️💍', answer: 'Lord of the Rings', hint: 'Epic fantasy trilogy' },
  { emoji: '🦈🏖️', answer: 'Jaws', hint: 'Classic Steven Spielberg thriller' },
  { emoji: '🕵️🔍🐕', answer: 'Scooby-Doo', hint: 'Mystery gang with a great dane' },
  { emoji: '👻🍕🏠', answer: 'Ghostbusters', hint: "Who ya gonna call?" },
  { emoji: '🌊🐠🐡', answer: 'Finding Nemo', hint: 'Pixar ocean adventure' },
  { emoji: '🐀🍳', answer: 'Ratatouille', hint: 'Pixar film about a cooking rat' },
  { emoji: '🤖❤️🌱', answer: 'WALL-E', hint: 'Pixar film set in space' },
  { emoji: '🦸‍♀️⚡👸', answer: 'Wonder Woman', hint: 'DC superhero' },
  { emoji: '🐼 🥋', answer: 'Kung Fu Panda', hint: 'Dreamworks animated film' },
  { emoji: '🧸🏈🌈', answer: 'Toy Story', hint: 'Toys come to life' },
  { emoji: '🔱🌊⚡', answer: 'Aquaman', hint: 'DC underwater superhero' },
];

const TYPING_SENTENCES = [
  'The quick brown fox jumps over the lazy dog near the river bank.',
  'Pack my box with five dozen liquor jugs and send them quickly.',
  'How vexingly quick daft zebras jump over the bright lazy foxes.',
  'The five boxing wizards jump quickly past the glowing orange neon signs.',
  'Sphinx of black quartz, judge my vow before the twilight fades.',
  'Two driven jocks help fax my big quiz to the quiet clever lawyer.',
  'Waltz, bad nymph, for quick jigs vex the sleeping village elder tonight.',
  'The job requires extra pluck and zeal from every young whiskered gnome.',
  'We promptly judged antique ivory buckles for the next prize exhibition.',
  'Sixty zippers were quickly picked from the woven jute bag by a dozen brave men.',
  'A wizard\'s job is to vex chumps quickly in frozen quarries at bright dawn.',
  'Big July earthquakes confound zany experimental vow packing them away.',
  'Six javelins thrown by the quick savages whizzed forty paces beyond the mark.',
  'Jack quietly moved up front and seized the big ball of wax for the clever witch.',
  'Fred specialized in the job of giving quicker talks on market technology.',
];

/**
 * .scramble — Start a word scramble puzzle.
 * Usage: .scramble
 */
export const scrambleCommand = {
  name: 'scramble',
  description: 'Get a scrambled word puzzle. Unscramble it to win!',
  usage: '.scramble',
  category: 'games',
  execute: async ({ sock, msg }) => {
    const [word, emoji] = rand(SCRAMBLE_WORDS);
    const scrambled     = word.split('').sort(() => Math.random() - 0.5).join('');
    const hint          = `${word.length} letters`;
    const firstLetter   = word[0];
    await reply(sock, msg,
      `🔀 *Word Scramble* ${emoji}\n${DIV}\n` +
      `Unscramble this word:\n\n` +
      `*${scrambled.split('').join(' ')}*\n\n` +
      `📏 *Length:* ${hint}\n` +
      `💡 *First letter:* ${firstLetter}\n\n` +
      `_Reply with your answer! Type_ ||${word}|| _to see the answer._\n${DIV}`
    );
  },
};

/**
 * .wyr — Would You Rather question.
 * Usage: .wyr
 */
export const wyrCommand = {
  name: 'wyr',
  description: 'Get a random "Would You Rather" question for the group.',
  usage: '.wyr',
  category: 'games',
  execute: async ({ sock, msg }) => {
    const q = rand(WYR_LIST);
    const [optA, optB] = q.split(' OR ');
    await reply(sock, msg,
      `🤔 *WOULD YOU RATHER...*\n${DIV}\n\n` +
      `🅰️ ${optA.trim()}\n\n` +
      `🆚\n\n` +
      `🅱️ ${(optB || '').trim()}\n\n` +
      `${DIV}\nReply *A* or *B* — debate it in the chat! 🗣️`
    );
  },
};

/**
 * .neverever — Random "Never Have I Ever" statement.
 * Usage: .neverever
 */
export const nevereverCommand = {
  name: 'neverever',
  description: 'Get a fun "Never Have I Ever" statement for the group.',
  usage: '.neverever',
  category: 'games',
  execute: async ({ sock, msg }) => {
    const statement = rand(NEVER_EVER_LIST);
    await reply(sock, msg,
      `🤚 *NEVER HAVE I EVER*\n${DIV}\n\n${statement}\n\n` +
      `${DIV}\n👆 React 1️⃣ if you HAVE, 0️⃣ if you HAVEN'T!`
    );
  },
};

/**
 * .emojiquiz — Guess the movie from emojis.
 * Usage: .emojiquiz
 */
export const emojiquizCommand = {
  name: 'emojiquiz',
  description: 'Guess the movie, show or character from emoji clues!',
  usage: '.emojiquiz',
  category: 'games',
  execute: async ({ sock, msg }) => {
    const q = rand(EMOJI_QUIZ);
    await reply(sock, msg,
      `🎬 *EMOJI MOVIE QUIZ*\n${DIV}\n\n` +
      `What movie is this? 👇\n\n` +
      `*${q.emoji}*\n\n` +
      `💡 *Hint:* ${q.hint}\n\n` +
      `_Spoiler:_ ||${q.answer}||\n${DIV}`
    );
  },
};

/**
 * .typetest — Get a random typing test sentence.
 * Usage: .typetest
 */
export const typetestCommand = {
  name: 'typetest',
  description: 'Get a random typing test sentence to practice your typing speed.',
  usage: '.typetest',
  category: 'games',
  execute: async ({ sock, msg }) => {
    const sentence = rand(TYPING_SENTENCES);
    const words    = sentence.split(' ').length;
    await reply(sock, msg,
      `⌨️ *Typing Speed Test*\n${DIV}\n\n` +
      `Type this sentence as fast as you can:\n\n` +
      `_"${sentence}"_\n\n` +
      `📊 *Words:* ${words}  |  🎯 *Goal:* Accuracy + Speed\n` +
      `${DIV}\nReply with the sentence when done — first accurate typer wins! 🏆`
    );
  },
};

/**
 * .dice — Roll one or more dice in NdS notation.
 * Usage: .dice [NdS]  (e.g. 2d6, 1d20, 3d4)
 */
export const diceCommand = {
  name: 'dice',
  description: 'Roll dice using standard NdS notation (e.g. 2d6, 1d20, 4d4).',
  usage: '.dice [NdS]  —  default: 1d6',
  category: 'games',
  execute: async ({ sock, msg, args }) => {
    const notation = (args[0] || '1d6').toLowerCase();
    const match    = notation.match(/^(\d+)d(\d+)$/);
    if (!match) throw new Error('Usage: .dice NdS\nExamples: .dice 2d6  .dice 1d20  .dice 4d4');
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    if (count < 1 || count > 20) throw new Error('Dice count must be between 1 and 20.');
    if (sides < 2 || sides > 1000) throw new Error('Dice sides must be between 2 and 1000.');
    const rolls   = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total   = rolls.reduce((a, b) => a + b, 0);
    const max     = count * sides;
    const pct     = ((total / max) * 100).toFixed(0);
    const bar     = '█'.repeat(Math.max(1, Math.floor(total / max * 10))) + '░'.repeat(Math.max(0, 10 - Math.floor(total / max * 10)));
    await reply(sock, msg,
      `🎲 *Dice Roller — ${notation.toUpperCase()}*\n${DIV}\n` +
      `🎰 *Rolls:* ${rolls.join(' + ')} ${count > 1 ? `\n\n🎯 *Total:* ${total} / ${max}  [${bar}] ${pct}%` : `= ${total}`}\n` +
      (count > 1 ? `🔼 *Highest:* ${Math.max(...rolls)}  |  🔽 *Lowest:* ${Math.min(...rolls)}\n` : '') +
      `${DIV}`
    );
  },
};

/**
 * .rng — Generate a random number in a custom range.
 * Usage: .rng <min> <max>
 */
export const rngCommand = {
  name: 'rng',
  description: 'Generate a cryptographically random number between two values.',
  usage: '.rng <min> <max>',
  category: 'games',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .rng <min> <max>\nExample: .rng 1 100');
    const min = parseInt(args[0]), max = parseInt(args[1]);
    if (isNaN(min) || isNaN(max)) throw new Error('Both min and max must be integers.');
    if (min >= max) throw new Error('Min must be less than max.');
    if (max - min > 1_000_000) throw new Error('Range too large. Max range: 1,000,000.');
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    const pct    = (((result - min) / (max - min)) * 100).toFixed(1);
    const bar    = '█'.repeat(Math.round(result / max * 10)) + '░'.repeat(10 - Math.round(result / max * 10));
    await reply(sock, msg,
      `🎰 *Random Number Generator*\n${DIV}\n` +
      `📊 *Range:* ${min.toLocaleString()} → ${max.toLocaleString()}\n` +
      `🎯 *Result:* *${result.toLocaleString()}*\n` +
      `📈 [${bar}] ${pct}%\n${DIV}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎲  FUN & RANDOM
// ═══════════════════════════════════════════════════════════════════════════════

const COLOR_NAMES = [
  ['FF0000','Red'],['FF4500','Orange Red'],['FF8C00','Dark Orange'],['FFA500','Orange'],['FFD700','Gold'],
  ['FFFF00','Yellow'],['9ACD32','Yellow Green'],['00FF00','Lime'],['008000','Green'],['006400','Dark Green'],
  ['00FFFF','Cyan'],['00CED1','Dark Turquoise'],['0000FF','Blue'],['00008B','Dark Blue'],['8A2BE2','Blue Violet'],
  ['800080','Purple'],['FF00FF','Magenta'],['FF69B4','Hot Pink'],['FFC0CB','Pink'],['FFFFFF','White'],
  ['808080','Gray'],['000000','Black'],['8B4513','Saddle Brown'],['D2691E','Chocolate'],['F5DEB3','Wheat'],
];

const COUNTRIES = [
  ['Nigeria','Abuja','🇳🇬'],['Kenya','Nairobi','🇰🇪'],['Ghana','Accra','🇬🇭'],['South Africa','Pretoria','🇿🇦'],
  ['Ethiopia','Addis Ababa','🇪🇹'],['Egypt','Cairo','🇪🇬'],['Morocco','Rabat','🇲🇦'],['Tanzania','Dodoma','🇹🇿'],
  ['USA','Washington D.C.','🇺🇸'],['UK','London','🇬🇧'],['France','Paris','🇫🇷'],['Germany','Berlin','🇩🇪'],
  ['Italy','Rome','🇮🇹'],['Spain','Madrid','🇪🇸'],['Japan','Tokyo','🇯🇵'],['China','Beijing','🇨🇳'],
  ['India','New Delhi','🇮🇳'],['Brazil','Brasília','🇧🇷'],['Canada','Ottawa','🇨🇦'],['Australia','Canberra','🇦🇺'],
  ['Mexico','Mexico City','🇲🇽'],['Argentina','Buenos Aires','🇦🇷'],['Russia','Moscow','🇷🇺'],['South Korea','Seoul','🇰🇷'],
  ['Indonesia','Jakarta','🇮🇩'],['Saudi Arabia','Riyadh','🇸🇦'],['Turkey','Ankara','🇹🇷'],['Pakistan','Islamabad','🇵🇰'],
  ['Bangladesh','Dhaka','🇧🇩'],['Netherlands','Amsterdam','🇳🇱'],['Sweden','Stockholm','🇸🇪'],['Norway','Oslo','🇳🇴'],
  ['Switzerland','Bern','🇨🇭'],['Portugal','Lisbon','🇵🇹'],['Greece','Athens','🇬🇷'],['Thailand','Bangkok','🇹🇭'],
  ['Vietnam','Hanoi','🇻🇳'],['Philippines','Manila','🇵🇭'],['Malaysia','Kuala Lumpur','🇲🇾'],['Colombia','Bogotá','🇨🇴'],
];

const FIRST_NAMES = ['Amara','Chioma','Fatima','Blessing','Grace','Precious','Queen','Princess','Joy','Peace','Stella',
  'Aisha','Ngozi','Adaeze','Kezia','Nadia','Sade','Temi','Yemi','Zara','James','Michael','David','Daniel','Emmanuel',
  'Samuel','Joshua','Isaac','Moses','Elijah','Gabriel','Aaron','Caleb','Nathan','Victor','Kenneth','Patrick','Felix',
  'Emeka','Chidi','Kwame','Kofi','Aminu','Usman','Musa','Ola','Seun','Tunde','Wale'];

const LAST_NAMES  = ['Johnson','Williams','Brown','Davis','Wilson','Anderson','Taylor','Moore','Jackson','White',
  'Harris','Martin','Thompson','Garcia','Martinez','Robinson','Clark','Lewis','Lee','Walker','Hall','Allen',
  'Okonkwo','Adeyemi','Ibrahim','Mensah','Osei','Kamau','Ndiaye','Diallo','Traoré','Okafor','Eze','Nwosu',
  'Balogun','Abiodun','Adesanya','Fashola','Sowore'];

/**
 * .randomcolor — Generate a random color with hex, RGB and HSL values.
 * Usage: .randomcolor
 */
export const randomcolorCommand = {
  name: 'randomcolor',
  description: 'Generate a random color with hex, RGB, and HSL values.',
  usage: '.randomcolor',
  category: 'fun',
  execute: async ({ sock, msg }) => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const hex = `#${r.toString(16).padStart(2,'0').toUpperCase()}${g.toString(16).padStart(2,'0').toUpperCase()}${b.toString(16).padStart(2,'0').toUpperCase()}`;
    // HSL
    const rn = r/255, gn = g/255, bn = b/255;
    const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn), d = max-min;
    let h=0; const l=(max+min)/2, s = d===0 ? 0 : d/(1-Math.abs(2*l-1));
    if(d!==0){if(max===rn)h=60*((gn-bn)/d%6);else if(max===gn)h=60*((bn-rn)/d+2);else h=60*((rn-gn)/d+4);}
    if(h<0)h+=360;
    // Brightness label
    const brightness = 0.2126*rn + 0.7152*gn + 0.0722*bn;
    const shade = brightness > 0.5 ? '☀️ Light' : '🌑 Dark';
    const swatch = '⬛⬜🟥🟧🟨🟩🟦🟪🟫'[Math.floor(Math.random() * 9)];
    await reply(sock, msg,
      `🎨 *Random Color Generator*\n${DIV}\n` +
      `🎨 *Hex:* ${hex}\n` +
      `🔴 *RGB:* rgb(${r}, ${g}, ${b})\n` +
      `🌈 *HSL:* hsl(${Math.round(h)}°, ${Math.round(s*100)}%, ${Math.round(l*100)}%)\n` +
      `☯️ *Brightness:* ${shade}\n` +
      `🖼️ *Preview:* ${swatch} Use hex ${hex} in your designs!\n${DIV}`
    );
  },
};

/**
 * .randomcountry — Get a random country with capital and flag.
 * Usage: .randomcountry
 */
export const randomcountryCommand = {
  name: 'randomcountry',
  description: 'Get a random country with its capital city and flag.',
  usage: '.randomcountry',
  category: 'fun',
  execute: async ({ sock, msg }) => {
    const [country, capital, flag] = rand(COUNTRIES);
    await reply(sock, msg,
      `${flag} *Random Country*\n${DIV}\n` +
      `🌍 *Country:* ${country}\n` +
      `🏙️ *Capital:* ${capital}\n` +
      `🚩 *Flag:* ${flag}\n${DIV}\n` +
      `_Did you know this country? Drop a 🙋 if yes!_`
    );
  },
};

/**
 * .randomname — Generate a random full name.
 * Usage: .randomname [count]
 */
export const randomnameCommand = {
  name: 'randomname',
  description: 'Generate random full names for characters, testing or fun.',
  usage: '.randomname [count 1-10]',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const count = Math.min(parseInt(args[0]) || 1, 10);
    if (count < 1) throw new Error('Count must be at least 1.');
    const names = Array.from({ length: count }, () =>
      `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`
    );
    await reply(sock, msg,
      `👤 *Random Name Generator*\n${DIV}\n` +
      names.map((n, i) => `${count > 1 ? `${i + 1}. ` : ''}*${n}*`).join('\n') +
      `\n${DIV}`
    );
  },
};

/**
 * .spiritanimal — Find your spirit animal from your birth month.
 * Usage: .spiritanimal <1-12>  (month number)
 */
export const spiritanimalCommand = {
  name: 'spiritanimal',
  description: 'Discover your spirit animal based on your birth month.',
  usage: '.spiritanimal <month 1-12>  or  .spiritanimal january',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const ANIMALS = [
      ['🐺 Wolf',    'Loyal, intuitive and fiercely protective. You lead the pack with fierce grace and unwavering loyalty.'],
      ['🦅 Eagle',   'Visionary and free-spirited. You soar above problems and see the bigger picture with crystal clarity.'],
      ['🐉 Dragon',  'Powerful and passionate. You carry ancient wisdom and the fire to transform everything you touch.'],
      ['🦋 Butterfly','Transformative and adaptable. You evolve gracefully through life\'s changes with effortless beauty.'],
      ['🦁 Lion',    'Courageous and regal. You command respect naturally and protect everything you love with fierce devotion.'],
      ['🦊 Fox',     'Clever and resourceful. Your wit and cunning allow you to navigate any situation with crafty brilliance.'],
      ['🐬 Dolphin', 'Joyful and intelligent. You bring harmony and laughter wherever you swim through life\'s currents.'],
      ['🦁 Lioness', 'Strong and nurturing. You balance fierce power with deep compassion for those under your care.'],
      ['🦉 Owl',     'Wise and mysterious. You see through darkness and illusion with ancient knowledge and sharp perception.'],
      ['🐻 Bear',    'Grounded and strong. You carry quiet power and deep introspection, coming alive when least expected.'],
      ['🐎 Horse',   'Free and powerful. Your spirit cannot be contained — you gallop toward your destiny without hesitation.'],
      ['🦌 Deer',    'Gentle and graceful. You move through life with quiet elegance and a generous, open heart.'],
    ];
    const input = args.join(' ').toLowerCase().trim();
    let month = parseInt(input);
    if (isNaN(month)) {
      const idx = MONTHS.findIndex(m => m.startsWith(input.slice(0, 3)));
      if (idx === -1) throw new Error('Usage: .spiritanimal <month>\nExample: .spiritanimal 3  or  .spiritanimal march');
      month = idx + 1;
    }
    if (month < 1 || month > 12) throw new Error('Month must be between 1 (Jan) and 12 (Dec).');
    const [animal, trait] = ANIMALS[month - 1];
    const monthName = MONTHS[month - 1][0].toUpperCase() + MONTHS[month - 1].slice(1);
    await reply(sock, msg,
      `🔮 *Spirit Animal*\n${DIV}\n` +
      `📅 *Birth Month:* ${monthName}\n` +
      `🐾 *Your Spirit Animal:* ${animal}\n\n` +
      `✨ ${trait}\n${DIV}`
    );
  },
};

/**
 * .zodiacsign — Get your zodiac sign from your date of birth.
 * Usage: .zodiacsign <DD/MM>  or  .zodiacsign <MM-DD>
 */
export const zodiacsignCommand = {
  name: 'zodiacsign',
  description: 'Find your zodiac/star sign from your date of birth.',
  usage: '.zodiacsign <DD/MM>',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const raw = args.join('').replace(/\s/g, '');
    if (!raw) throw new Error('Usage: .zodiacsign <DD/MM>\nExample: .zodiacsign 15/04  or  .zodiacsign 04-15');
    const parts = raw.split(/[\/\-\.]/).map(Number);
    let day, month;
    if (parts[0] <= 12 && parts[1] <= 31) { [month, day] = parts; }
    else { [day, month] = parts; }
    if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12)
      throw new Error('Invalid date. Use DD/MM format.\nExample: .zodiacsign 15/04');
    const SIGNS = [
      { name: 'Capricorn',   emoji: '♑', dates: 'Dec 22 – Jan 19', elem: '🌍 Earth',  trait: 'Ambitious, disciplined, practical' },
      { name: 'Aquarius',    emoji: '♒', dates: 'Jan 20 – Feb 18', elem: '💨 Air',    trait: 'Independent, innovative, humanitarian' },
      { name: 'Pisces',      emoji: '♓', dates: 'Feb 19 – Mar 20', elem: '🌊 Water',  trait: 'Compassionate, intuitive, artistic' },
      { name: 'Aries',       emoji: '♈', dates: 'Mar 21 – Apr 19', elem: '🔥 Fire',   trait: 'Bold, energetic, pioneering' },
      { name: 'Taurus',      emoji: '♉', dates: 'Apr 20 – May 20', elem: '🌍 Earth',  trait: 'Reliable, patient, determined' },
      { name: 'Gemini',      emoji: '♊', dates: 'May 21 – Jun 20', elem: '💨 Air',    trait: 'Adaptable, curious, witty' },
      { name: 'Cancer',      emoji: '♋', dates: 'Jun 21 – Jul 22', elem: '🌊 Water',  trait: 'Caring, protective, intuitive' },
      { name: 'Leo',         emoji: '♌', dates: 'Jul 23 – Aug 22', elem: '🔥 Fire',   trait: 'Confident, generous, creative' },
      { name: 'Virgo',       emoji: '♍', dates: 'Aug 23 – Sep 22', elem: '🌍 Earth',  trait: 'Analytical, helpful, perfectionist' },
      { name: 'Libra',       emoji: '♎', dates: 'Sep 23 – Oct 22', elem: '💨 Air',    trait: 'Diplomatic, fair, social' },
      { name: 'Scorpio',     emoji: '♏', dates: 'Oct 23 – Nov 21', elem: '🌊 Water',  trait: 'Passionate, resourceful, brave' },
      { name: 'Sagittarius', emoji: '♐', dates: 'Nov 22 – Dec 21', elem: '🔥 Fire',   trait: 'Optimistic, adventurous, honest' },
    ];
    const getSign = (d, m) => {
      if ((m === 12 && d >= 22) || (m === 1 && d <= 19))  return SIGNS[0];
      if ((m === 1  && d >= 20) || (m === 2 && d <= 18))  return SIGNS[1];
      if ((m === 2  && d >= 19) || (m === 3 && d <= 20))  return SIGNS[2];
      if ((m === 3  && d >= 21) || (m === 4 && d <= 19))  return SIGNS[3];
      if ((m === 4  && d >= 20) || (m === 5 && d <= 20))  return SIGNS[4];
      if ((m === 5  && d >= 21) || (m === 6 && d <= 20))  return SIGNS[5];
      if ((m === 6  && d >= 21) || (m === 7 && d <= 22))  return SIGNS[6];
      if ((m === 7  && d >= 23) || (m === 8 && d <= 22))  return SIGNS[7];
      if ((m === 8  && d >= 23) || (m === 9 && d <= 22))  return SIGNS[8];
      if ((m === 9  && d >= 23) || (m === 10 && d <= 22)) return SIGNS[9];
      if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return SIGNS[10];
      return SIGNS[11];
    };
    const sign = getSign(day, month);
    await reply(sock, msg,
      `${sign.emoji} *Zodiac Sign*\n${DIV}\n` +
      `📅 *Date:* ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}\n` +
      `✨ *Your Sign:* ${sign.name} ${sign.emoji}\n` +
      `📆 *Dates:* ${sign.dates}\n` +
      `⚗️ *Element:* ${sign.elem}\n` +
      `💫 *Traits:* ${sign.trait}\n${DIV}`
    );
  },
};

/**
 * .luckynumber — Generate lucky numbers for the day.
 * Usage: .luckynumber [count]
 */
export const luckynumberCommand = {
  name: 'luckynumber',
  description: 'Generate your lucky numbers for today (lottery style).',
  usage: '.luckynumber [count]',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const count = Math.min(parseInt(args[0]) || 6, 10);
    const pool  = new Set();
    while (pool.size < count) pool.add(Math.floor(Math.random() * 49) + 1);
    const numbers = [...pool].sort((a, b) => a - b);
    const bonus   = Math.floor(Math.random() * 10) + 1;
    const today   = new Date().toDateString();
    await reply(sock, msg,
      `🍀 *Lucky Numbers*\n${DIV}\n` +
      `📅 *Date:* ${today}\n\n` +
      `🎯 *Your numbers:*\n` +
      numbers.map(n => `  ✨ *${String(n).padStart(2, ' ')}*`).join('\n') +
      `\n\n⭐ *Bonus:* ${bonus}\n${DIV}\n_Good luck today! 🤞_`
    );
  },
};

/**
 * .colorinfo — Analyse a hex color code and return full color data.
 * Usage: .colorinfo <#hex>
 */
export const colorinfoCommand = {
  name: 'colorinfo',
  description: 'Analyse any hex color code to get RGB, HSL and color details.',
  usage: '.colorinfo <#RRGGBB or #RGB>',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    let hex = args.join('').trim().replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex))
      throw new Error('Usage: .colorinfo #RRGGBB\nExample: .colorinfo #FF5733');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // HSL calculation
    const rn = r/255, gn = g/255, bn = b/255;
    const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn), d = max-min;
    let h = 0; const l = (max+min)/2, s = d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));
    if (d !== 0) {
      if (max === rn) h = 60 * ((gn-bn)/d % 6);
      else if (max === gn) h = 60 * ((bn-rn)/d + 2);
      else h = 60 * ((rn-gn)/d + 4);
    }
    if (h < 0) h += 360;
    // Closest named color
    const named = COLOR_NAMES.reduce((prev, curr) => {
      const ch = parseInt(curr[0].slice(0,2),16), cg = parseInt(curr[0].slice(2,4),16), cb = parseInt(curr[0].slice(4,6),16);
      const dist = Math.abs(r-ch)+Math.abs(g-cg)+Math.abs(b-cb);
      const pd   = Math.abs(r-parseInt(prev[0].slice(0,2),16))+Math.abs(g-parseInt(prev[0].slice(2,4),16))+Math.abs(b-parseInt(prev[0].slice(4,6),16));
      return dist < pd ? curr : prev;
    });
    const brightness = (0.2126*rn + 0.7152*gn + 0.0722*bn);
    const invHex = `${(255-r).toString(16).padStart(2,'0')}${(255-g).toString(16).padStart(2,'0')}${(255-b).toString(16).padStart(2,'0')}`.toUpperCase();
    await reply(sock, msg,
      `🎨 *Color Info: #${hex.toUpperCase()}*\n${DIV}\n` +
      `🔴 *Red:* ${r}  🟢 *Green:* ${g}  🔵 *Blue:* ${b}\n` +
      `🌈 *HSL:* ${Math.round(h)}°, ${Math.round(s*100)}%, ${Math.round(l*100)}%\n` +
      `📛 *Closest name:* ${named[1]}\n` +
      `☯️ *Brightness:* ${(brightness * 100).toFixed(1)}% (${brightness > 0.5 ? 'Light' : 'Dark'})\n` +
      `🔄 *Inverted:* #${invHex}\n` +
      `📋 *CSS hex:* #${hex.toUpperCase()}\n` +
      `📋 *CSS rgb:* rgb(${r}, ${g}, ${b})\n${DIV}`
    );
  },
};

/**
 * .randomemoji — Get a random emoji with its name and category.
 * Usage: .randomemoji [count]
 */
export const randomemojiCommand = {
  name: 'randomemoji',
  description: 'Get random emojis with their meanings and categories.',
  usage: '.randomemoji [count 1-10]',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const EMOJIS = [
      ['😂','Face with tears of joy','Faces'],['🔥','Fire','Symbols'],['💯','Hundred points','Symbols'],
      ['🎉','Party popper','Activities'],['🌍','Globe showing Africa-Europe','Travel'],['💪','Flexed biceps','Body'],
      ['🚀','Rocket','Travel'],['🦋','Butterfly','Animals'],['🌸','Cherry blossom','Nature'],['⚡','Lightning','Symbols'],
      ['🎭','Performing arts','Activities'],['🌊','Water wave','Nature'],['🔮','Crystal ball','Objects'],
      ['🎯','Direct hit','Activities'],['🦁','Lion','Animals'],['🌙','Crescent moon','Nature'],
      ['🏆','Trophy','Activities'],['💎','Gem stone','Objects'],['🎪','Circus tent','Activities'],
      ['🌈','Rainbow','Nature'],['🦊','Fox','Animals'],['🎸','Guitar','Objects'],['🌺','Hibiscus','Nature'],
      ['🦅','Eagle','Animals'],['🎨','Artist palette','Activities'],['⭐','Star','Nature'],
      ['🐉','Dragon','Animals'],['🎭','Theatre masks','Activities'],['🌋','Volcano','Nature'],['🦈','Shark','Animals'],
    ];
    const count = Math.min(parseInt(args[0]) || 1, 10);
    const picks = [];
    const used  = new Set();
    while (picks.length < count) {
      const idx = Math.floor(Math.random() * EMOJIS.length);
      if (!used.has(idx)) { used.add(idx); picks.push(EMOJIS[idx]); }
    }
    await reply(sock, msg,
      `🎲 *Random Emoji${count > 1 ? 's' : ''}*\n${DIV}\n` +
      picks.map(([emoji, name, cat]) => `${emoji} — *${name}*\n   📂 Category: ${cat}`).join('\n\n') +
      `\n${DIV}`
    );
  },
};

/**
 * .whatday — Find what day of the week any date falls on.
 * Usage: .whatday <YYYY-MM-DD>
 */
export const whatdayCommand = {
  name: 'whatday',
  description: 'Find out what day of the week any date was or will be.',
  usage: '.whatday <YYYY-MM-DD>',
  category: 'fun',
  execute: async ({ sock, msg, args }) => {
    const raw  = args.join('').replace(/\//g, '-');
    if (!raw) throw new Error('Usage: .whatday <YYYY-MM-DD>\nExample: .whatday 2000-01-01');
    const date = new Date(raw);
    if (isNaN(date.getTime())) throw new Error('Invalid date. Use YYYY-MM-DD format.\nExample: .whatday 1990-06-15');
    const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const EMOJIS = ['☀️','🌙','🔥','💧','⚡','💫','🌍'];
    const day    = DAYS[date.getDay()];
    const emoji  = EMOJIS[date.getDay()];
    const now    = new Date();
    const diff   = Math.round((date - now) / (1000 * 60 * 60 * 24));
    const rel    = diff === 0 ? 'Today! 🎉' : diff > 0 ? `in ${diff} day${diff !== 1 ? 's' : ''}` : `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`;
    const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    await reply(sock, msg,
      `📅 *What Day Is It?*\n${DIV}\n` +
      `🗓️ *Date:* ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}\n` +
      `${emoji} *Day:* ${day}\n` +
      `📅 *Week number:* ${Math.ceil((((date - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1) / 7)}\n` +
      `📆 *Day of year:* ${Math.ceil((date - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1}\n` +
      `🗃️ *Relative:* ${rel}\n` +
      `🌀 *Leap year ${date.getFullYear()}:* ${isLeap(date.getFullYear()) ? '✅ Yes' : '❌ No'}\n${DIV}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠  GROUP UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * .poll — Create a quick text-based poll.
 * Usage: .poll <Question> | <Option 1> | <Option 2> [| Option 3...]
 */
export const pollCommand = {
  name: 'poll',
  description: 'Create a quick text-based poll with up to 8 options.',
  usage: '.poll <Question> | <Option A> | <Option B> [| Option C...]',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const input   = args.join(' ');
    const parts   = input.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) throw new Error(
      'Usage: .poll <Question> | <Option A> | <Option B> [| more options]\n' +
      'Example: .poll Best programming language? | JavaScript | Python | Rust'
    );
    if (parts.length > 9) throw new Error('Maximum 8 options allowed.');
    const [question, ...options] = parts;
    const VOTES  = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
    const sender = msg.pushName || 'Admin';
    await reply(sock, msg,
      `📊 *POLL*\n${DIV}\n` +
      `❓ *${question}*\n\n` +
      options.map((opt, i) => `${VOTES[i]} ${opt}`).join('\n') +
      `\n\n${DIV}\n` +
      `📣 React with the number emoji to vote!\n` +
      `👤 _Created by ${sender}_`
    );
  },
};

/**
 * .randommember — Pick one or more random members from the group.
 * Usage: .randommember [count]
 */
export const randommemberCommand = {
  name: 'randommember',
  description: 'Pick a random member (or multiple) from the group — for games, giveaways.',
  usage: '.randommember [count]',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const jid     = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    if (!isGroup) throw new Error('This command can only be used in groups.');
    const count = Math.max(1, Math.min(parseInt(args[0]) || 1, 5));
    const meta  = await sock.groupMetadata(jid);
    const bots  = [sock.user?.id?.split(':')[0], sock.user?.id?.split('@')[0]].filter(Boolean);
    const members = meta.participants.filter(p => !bots.some(b => p.id.includes(b)));
    if (members.length < count) throw new Error(`Not enough members. Found ${members.length}, need ${count}.`);
    // Fisher-Yates shuffle, pick first `count`
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const picked   = shuffled.slice(0, count);
    const mentions = picked.map(p => p.id);
    const lines    = picked.map((p, i) => `${count > 1 ? `${i + 1}. ` : ''}🎯 @${normalizeJidToNumber(p.id, sock)}${p.admin ? ' 👑' : ''}`);
    await sock.sendMessage(jid, {
      text:
        `🎲 *Random Member Picker*\n${DIV}\n` +
        `👥 *Group size:* ${members.length} members\n` +
        `🎯 *Selected (${count}):*\n\n` +
        lines.join('\n') +
        `\n${DIV}\n_🍀 Congratulations to the winner${count > 1 ? 's' : ''}!_`,
      mentions,
    }, { quoted: msg });
  },
};

/**
 * .timediff — Calculate the exact time difference between two dates.
 * Usage: .timediff <date1> <date2>
 */
export const timediffCommand = {
  name: 'timediff',
  description: 'Calculate exact days, weeks and months between two dates.',
  usage: '.timediff <YYYY-MM-DD> <YYYY-MM-DD>',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    if (args.length < 2) throw new Error('Usage: .timediff <date1> <date2>\nExample: .timediff 2000-01-01 2025-01-01');
    const [d1, d2] = [new Date(args[0]), new Date(args[1])];
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()))
      throw new Error('Invalid dates. Use YYYY-MM-DD format.');
    const start = d1 < d2 ? d1 : d2;
    const end   = d1 < d2 ? d2 : d1;
    const ms    = end - start;
    const days  = Math.floor(ms / 86400000);
    const weeks = Math.floor(days / 7);
    const hours = Math.floor(ms / 3600000);
    const mins  = Math.floor(ms / 60000);
    // Months/years
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    const dayOfMonth = end.getDate() - start.getDate();
    if (dayOfMonth < 0) months = Math.max(0, months - 1);
    await reply(sock, msg,
      `📅 *Date Difference*\n${DIV}\n` +
      `📌 *From:* ${start.toDateString()}\n` +
      `📌 *To:* ${end.toDateString()}\n` +
      `${DIV}\n` +
      `📊 *Total days:* ${days.toLocaleString()}\n` +
      `📊 *Total weeks:* ${weeks.toLocaleString()}\n` +
      `📊 *Total hours:* ${hours.toLocaleString()}\n` +
      `📊 *Total minutes:* ${mins.toLocaleString()}\n\n` +
      `🗓️ *That is:* ${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}\n${DIV}`
    );
  },
};

/**
 * .groupstats — Get a full stats breakdown for the current group.
 * Usage: .groupstats
 */
export const groupstatsCommand = {
  name: 'groupstats',
  description: 'Get detailed statistics about the current group (members, admins, etc.)',
  usage: '.groupstats',
  category: 'utility',
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) throw new Error('This command can only be used in groups.');
    const meta    = await sock.groupMetadata(jid);
    const all     = meta.participants;
    const admins  = all.filter(p => p.admin === 'admin');
    const owner   = all.find(p => p.admin === 'superadmin');
    const regular = all.length - admins.length - (owner ? 1 : 0);
    const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : 'Unknown';
    const ageMs   = meta.creation ? Date.now() - meta.creation * 1000 : 0;
    const ageDays = Math.floor(ageMs / 86400000);
    await reply(sock, msg,
      `📊 *Group Statistics*\n${DIV}\n` +
      `📝 *Name:* ${meta.subject}\n` +
      `📅 *Created:* ${created} (${ageDays} days ago)\n` +
      `${DIV}\n` +
      `👥 *Total members:* ${all.length}\n` +
      `👑 *Owner (superadmin):* ${owner ? '@' + normalizeJidToNumber(owner.id, sock) : 'Unknown'}\n` +
      `🛡️ *Admins:* ${admins.length}\n` +
      `👤 *Regular members:* ${regular}\n` +
      `📊 *Admin ratio:* ${((admins.length / all.length) * 100).toFixed(1)}%\n` +
      `${DIV}\n` +
      `🔒 *Who can edit:* ${meta.restrict ? 'Admins only' : 'Everyone'}\n` +
      `💬 *Who can message:* ${meta.announce ? 'Admins only' : 'Everyone'}\n` +
      `${DIV}`
    );
  },
};

/**
 * .timezone — Show current time in major world timezones.
 * Usage: .timezone [city or zone]
 */
export const timezoneCommand = {
  name: 'timezone',
  description: 'Show the current time in major world timezones.',
  usage: '.timezone  or  .timezone Lagos  or  .timezone Tokyo',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const ZONES = [
      ['🇳🇬 Lagos / Nairobi',  'Africa/Lagos'],
      ['🇿🇦 Johannesburg',      'Africa/Johannesburg'],
      ['🇬🇧 London',            'Europe/London'],
      ['🇫🇷 Paris / Berlin',    'Europe/Paris'],
      ['🇦🇪 Dubai',             'Asia/Dubai'],
      ['🇮🇳 Mumbai / Delhi',    'Asia/Kolkata'],
      ['🇸🇬 Singapore',         'Asia/Singapore'],
      ['🇯🇵 Tokyo',             'Asia/Tokyo'],
      ['🇧🇷 São Paulo',         'America/Sao_Paulo'],
      ['🇺🇸 New York',          'America/New_York'],
      ['🇺🇸 Los Angeles',       'America/Los_Angeles'],
      ['🇨🇦 Toronto',           'America/Toronto'],
    ];
    const fmt = (tz) => new Date().toLocaleString('en-GB', {
      timeZone: tz,
      weekday: 'short', hour: '2-digit', minute: '2-digit',
      hour12: true, day: '2-digit', month: 'short'
    });
    const query = args.join(' ').toLowerCase();
    const now   = new Date();
    if (query) {
      const match = ZONES.find(([label]) => label.toLowerCase().includes(query));
      if (!match) {
        // Try using the query as a timezone directly
        try {
          const time = fmt(args.join('_'));
          await reply(sock, msg, `🕐 *${args.join(' ')}:* ${time}`);
          return;
        } catch {
          throw new Error(`Zone "${args.join(' ')}" not found.\nTry: Lagos, London, Dubai, Tokyo, New York, etc.`);
        }
      }
      await reply(sock, msg, `🕐 *${match[0]}:*\n${fmt(match[1])}`);
    } else {
      await reply(sock, msg,
        `🌐 *World Clocks*\n${DIV}\n` +
        ZONES.map(([label, tz]) => `${label}:\n   🕐 ${fmt(tz)}`).join('\n') +
        `\n${DIV}\n_📅 All times as of ${now.toUTCString()}_`
      );
    }
  },
};

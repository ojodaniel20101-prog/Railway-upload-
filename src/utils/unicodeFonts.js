/**
 * unicodeFonts.js — Unicode font styles for stylish text generation.
 */

const fontStyles = {
  bold: {
    a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣',
    k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭',
    u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳',
    A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈', J: '𝐉',
    K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓',
    U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙'
  },
  italic: {
    a: '𝑎', b: '𝑏', c: '𝑐', d: '𝑑', e: '𝑒', f: '𝑓', g: '𝑔', h: '𝒉', i: '𝒊', j: '𝒋',
    k: '𝒌', l: '𝒍', m: '𝒎', n: '𝒏', o: '𝒐', p: '𝒑', q: '𝒒', r: '𝒓', s: '𝒔', t: '𝒕',
    u: '𝒖', v: '𝒗', w: '𝒘', x: '𝒙', y: '𝒚', z: '𝒛',
    A: '𝑨', B: '𝑩', C: '𝑪', D: '𝑫', E: '𝑬', F: '𝑭', G: '𝑮', H: '𝑯', I: '𝑰', J: '𝑱',
    K: '𝑲', L: '𝑳', M: '𝑴', N: '𝑵', O: '𝑶', P: '𝑷', Q: '𝑸', R: '𝑹', S: '𝑺', T: '𝑻',
    U: '𝑼', V: '𝑽', W: '𝑾', X: '𝑿', Y: '𝒀', Z: '𝒁'
  },
  boldItalic: {
    a: '𝒂', b: '𝒃', c: '𝒄', d: '𝒅', e: '𝒆', f: '𝒇', g: '𝒈', h: '𝒉', i: '𝒊', j: '𝒋',
    k: '𝒌', l: '𝒍', m: '𝒎', n: '𝒏', o: '𝒐', p: '𝒑', q: '𝒒', r: '𝒓', s: '𝒔', t: '𝒕',
    u: '𝒖', v: '𝒗', w: '𝒘', x: '𝒙', y: '𝒚', z: '𝒛',
    A: '𝑨', B: '𝑩', C: '𝑪', D: '𝑫', E: '𝑬', F: '𝑭', G: '𝑮', H: '𝑯', I: '𝑰', J: '𝑱',
    K: '𝑲', L: '𝑳', M: '𝑴', N: '𝑵', O: '𝑶', P: '𝑷', Q: '𝑸', R: '𝑹', S: '𝑺', T: '𝑻',
    U: '𝑼', V: '𝑽', W: '𝑾', X: '𝑿', Y: '𝒀', Z: '𝒁'
  },
  fraktur: {
    a: '𝔞', b: '𝔟', c: '𝔠', d: '𝔡', e: '𝔢', f: '𝔣', g: '𝔤', h: '𝔥', i: '𝔦', j: '𝔧',
    k: '𝔨', l: '𝔩', m: '𝔪', n: '𝔫', o: '𝔬', p: '𝔭', q: '𝔮', r: '𝔯', s: '𝔰', t: '𝔱',
    u: '𝔲', v: '𝔳', w: '𝔴', x: '𝔵', y: '𝔶', z: '𝔷',
    A: '𝔄', B: '𝔅', C: '𝔆', D: '𝔇', E: '𝔈', F: '𝔉', G: '𝔊', H: '𝔉', I: '𝔍', J: '𝔎',
    K: '𝔏', L: '𝔐', M: '𝔑', N: '𝔒', O: '𝔓', P: '𝔔', Q: '𝔕', R: '𝔖', S: '𝔗', T: '𝔘',
    U: '𝔙', V: '𝔚', W: '𝔛', X: '𝔜', Y: '𝔝', Z: '𝔞'
  },
  doublestruck: {
    a: '𝕒', b: '𝕓', c: '𝕔', d: '𝕕', e: '𝕖', f: '𝕗', g: '𝕘', h: '𝕙', i: '𝕚', j: '𝕛',
    k: '𝕜', l: '𝕝', m: '𝕞', n: '𝕟', o: '𝕠', p: '𝕡', q: '𝕢', r: '𝕣', s: '𝕤', t: '𝕥',
    u: '𝕦', v: '𝕧', w: '𝕨', x: '𝕩', y: '𝕪', z: '𝕫',
    A: '𝔸', B: '𝔹', C: '𝔻', D: '𝔼', E: '𝔽', F: '𝔾', G: '𝕳', H: '𝕴', I: '𝕵', J: '𝕶',
    K: '𝕷', L: '𝕸', M: '𝕹', N: '𝕺', O: '𝕻', P: '𝕼', Q: '𝕽', R: '𝕾', S: '𝕿', T: '𝖀',
    U: '𝖁', V: '𝖂', W: '𝖃', X: '𝖄', Y: '𝖅', Z: '𝖆'
  },
  monospace: {
    a: '𝚊', b: '𝚋', c: '𝚌', d: '𝚍', e: '𝚎', f: '𝚏', g: '𝚐', h: '𝚑', i: '𝚒', j: '𝚓',
    k: '𝚔', l: '𝚕', m: '𝚖', n: '𝚗', o: '𝚘', p: '𝚙', q: '𝚚', r: '𝚛', s: '𝚜', t: '𝚝',
    u: '𝚞', v: '𝚟', w: '𝚠', x: '𝚡', y: '𝚢', z: '𝚣',
    A: '𝙰', B: '𝙱', C: '𝙲', D: '𝙳', E: '𝙴', F: '𝙵', G: '𝙶', H: '𝙷', I: '𝙸', J: '𝙹',
    K: '𝙺', L: '𝙻', M: '𝙼', N: '𝙽', O: '𝙾', P: '𝙿', Q: '𝚀', R: '𝚁', S: '𝚂', T: '𝚃',
    U: '𝚄', V: '𝚅', W: '𝚆', X: '𝚇', Y: '𝚈', Z: '𝚉'
  },
  smallcaps: {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
    k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ϙ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ',
    u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
  }
};

const emojis = ['⚡', '✨', '🔥', '💎', '👑', '🌟', '💫', '🎯', '🚀', '💯', '❤️', '💖', '✦', '✧', '⭐', '🎪', '🎭', '🎨'];

export function applyFont(text, fontName = 'bold') {
  const font = fontStyles[fontName] || fontStyles.bold;
  return text.split('').map(char => font[char] || char).join('');
}

export function generateStylishName(baseName) {
  const styles = Object.keys(fontStyles);
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const styled = applyFont(baseName, randomStyle);
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  return `${styled} ${emoji}`;
}

export function generateMultipleStyles(baseName, count = 5) {
  const styles = Object.keys(fontStyles);
  const results = [];
  
  for (let i = 0; i < count && i < styles.length; i++) {
    const style = styles[i];
    const styled = applyFont(baseName, style);
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    results.push(`${styled} ${emoji}`);
  }
  
  return results;
}

export default { applyFont, generateStylishName, generateMultipleStyles };

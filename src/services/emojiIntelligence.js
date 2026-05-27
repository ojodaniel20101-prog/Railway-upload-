/**
 * emojiIntelligence.js — Context-aware emoji enhancement for AI responses.
 * Simulates human-like conversation by injecting relevant emojis.
 */

const EMOJI_MAP = {
  friendly: ['😊', '👋', '✨', '🙌', '😇'],
  excited: ['🔥', '🚀', '😄', '🤩', '💥'],
  funny: ['😂', '🤣', '💀', '😆'],
  serious: ['⚠️', '📌', '🧐', '💡'],
  coding: ['💻', '⚙️', '🧠', '🛠️', '⚡'],
  success: ['✅', '🎉', '🥳', '🌟'],
  error: ['❌', '😅', '⚠️', '💔'],
  question: ['❓', '🤔', '🧐'],
  greeting: ['👋', 'Hey!', 'Hi!'],
  thanks: ['🙏', '💖', '✨']
};

/**
 * Detects the tone of the message and returns a relevant emoji.
 */
function detectTone(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('error') || lowerText.includes('fail') || lowerText.includes('sorry')) return 'error';
  if (lowerText.includes('success') || lowerText.includes('done') || lowerText.includes('fixed')) return 'success';
  if (lowerText.includes('code') || lowerText.includes('function') || lowerText.includes('api') || lowerText.includes('const')) return 'coding';
  if (lowerText.includes('haha') || lowerText.includes('lol') || lowerText.includes('funny') || lowerText.includes('joke')) return 'funny';
  if (lowerText.includes('wow') || lowerText.includes('amazing') || lowerText.includes('great') || lowerText.includes('cool')) return 'excited';
  if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) return 'greeting';
  if (lowerText.includes('thanks') || lowerText.includes('thank you')) return 'thanks';
  if (text.includes('?')) return 'question';
  if (lowerText.includes('important') || lowerText.includes('note') || lowerText.includes('warning')) return 'serious';
  
  return 'friendly';
}

/**
 * Enhances a text response with context-aware emojis.
 */
export function enhanceResponse(text) {
  if (!text) return text;

  // Split into sentences
  const sentences = text.split(/([.!?]+)/).filter(s => s.trim().length > 0);
  let enhancedText = '';
  let emojiUsedCount = 0;
  const maxEmojis = Math.max(1, Math.floor(sentences.length / 2)); // Limit emoji density

  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i];
    // If it's just punctuation, append it to the previous sentence
    if (/^[.!?]+$/.test(sentence)) {
      enhancedText += sentence;
      
      // Decide whether to add an emoji after punctuation
      if (emojiUsedCount < maxEmojis && Math.random() > 0.4) {
        const tone = detectTone(enhancedText);
        const emojis = EMOJI_MAP[tone] || EMOJI_MAP.friendly;
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        // Don't add if the sentence already ends with an emoji (basic check)
        if (!/[\u{1F300}-\u{1F9FF}]/u.test(enhancedText.slice(-5))) {
          enhancedText += ` ${randomEmoji}`;
          emojiUsedCount++;
        }
      }
      continue;
    }
    
    enhancedText += (enhancedText ? ' ' : '') + sentence;
  }

  // Final check: if no emojis were added and it's a short message, add one at the end
  if (emojiUsedCount === 0 && text.length < 100) {
    const tone = detectTone(text);
    const emojis = EMOJI_MAP[tone] || EMOJI_MAP.friendly;
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    enhancedText += ` ${randomEmoji}`;
  }

  return enhancedText.trim();
}

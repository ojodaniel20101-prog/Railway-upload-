/**
 * MenuVideoService.js — Enterprise-grade random video engine.
 */

import logger from '../utils/logger.js';

const MENU_VIDEOS = [
  "https://files.catbox.moe/fhob1k.mp4",
  "https://files.catbox.moe/pxt5fv.mp4",
  "https://files.catbox.moe/rqkjyl.mp4",
  "https://files.catbox.moe/5xf0ea.mp4",
  "https://files.catbox.moe/mbomdn.mp4",
  "https://files.catbox.moe/hjtpyx.mp4",
  "https://files.catbox.moe/cso10n.mp4",
  "https://files.catbox.moe/9y1c8o.mp4",
  "https://files.catbox.moe/ba4vjc.mp4"
];

class MenuVideoService {
  constructor() {
    this.lastIndex = null;
  }

  /**
   * Selects a random video URL from the pool with anti-repeat logic.
   * @returns {string} The selected video URL.
   */
  getRandomVideo() {
    if (MENU_VIDEOS.length === 0) return null;
    
    let index = Math.floor(Math.random() * MENU_VIDEOS.length);
    
    // Anti-repeat logic: if same as last, try once more to get a different one
    if (index === this.lastIndex && MENU_VIDEOS.length > 1) {
      index = (index + 1) % MENU_VIDEOS.length;
    }
    
    this.lastIndex = index;
    const selectedVideo = MENU_VIDEOS[index];
    logger.info(`[VideoService] Selected random video: ${selectedVideo} (Index: ${index})`);
    return selectedVideo;
  }
}

// Export a singleton instance for use across the application
export const videoService = new MenuVideoService();

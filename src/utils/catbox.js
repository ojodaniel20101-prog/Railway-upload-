/**
 * catbox.js — Utility for uploading media to Catbox.moe.
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import logger from './logger.js';

/**
 * Uploads a local file to Catbox and returns the hosted URL.
 * @param {string} filePath - Path to the local file.
 * @returns {Promise<string>} The hosted URL.
 */
export async function uploadToCatbox(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    if (response.data && typeof response.data === 'string' && response.data.startsWith('https://')) {
      logger.success(`File uploaded to Catbox: ${response.data}`);
      return response.data.trim();
    } else {
      throw new Error(`Catbox upload failed: ${response.data}`);
    }
  } catch (error) {
    logger.error('Error uploading to Catbox:', error);
    throw error;
  }
}

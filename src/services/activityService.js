/**
 * activityService.js — Group Member Activity Tracker for ZENTRIX MD BY ZENTRIX TECH.
 * Tracks the last time each member sent a message in each group.
 * Persists across restarts using a lightweight JSON file store.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, '../../tmp/activity_store.json');

// In-memory store: { botNumber: { groupJid: { memberJid: lastSeenTimestamp } } }
let store = {};

// Load from disk on startup
function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      logger.info('[ActivityService] Loaded activity store from disk.');
    }
  } catch (e) {
    logger.warn(`[ActivityService] Could not load store: ${e.message}`);
    store = {};
  }
}

// Save to disk (debounced — max once every 30s)
let saveTimer = null;
function saveStore() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(store), 'utf-8');
    } catch (e) {
      logger.warn(`[ActivityService] Could not save store: ${e.message}`);
    }
    saveTimer = null;
  }, 30000);
}

loadStore();

/**
 * Record activity for a member in a group.
 */
export function recordActivity(botNumber, groupJid, memberJid) {
  if (!groupJid.endsWith('@g.us')) return;
  if (!memberJid) return;

  if (!store[botNumber]) store[botNumber] = {};
  if (!store[botNumber][groupJid]) store[botNumber][groupJid] = {};

  // Normalize JID — strip device suffix
  const normalized = memberJid.split(':')[0];
  store[botNumber][groupJid][normalized] = Date.now();
  saveStore();
}

/**
 * Get inactive members in a group.
 * @param {string} botNumber
 * @param {string} groupJid
 * @param {Array}  participants  — full participant list from groupMetadata
 * @param {number} days         — inactivity threshold in days
 * @returns {Array} list of { jid, lastSeen } sorted oldest first
 */
export function getInactiveMembers(botNumber, groupJid, participants, days) {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  const groupActivity = store[botNumber]?.[groupJid] || {};

  const inactive = [];

  for (const p of participants) {
    // Skip admins
    if (p.admin === 'admin' || p.admin === 'superadmin') continue;

    const normalized = p.id.split(':')[0];
    const lastSeen = groupActivity[normalized];

    if (!lastSeen || lastSeen < threshold) {
      inactive.push({
        jid: p.id,
        lastSeen: lastSeen || null,
      });
    }
  }

  // Sort: never-seen first, then oldest activity first
  inactive.sort((a, b) => (a.lastSeen || 0) - (b.lastSeen || 0));

  return inactive;
}

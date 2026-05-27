/**
 * cacheService.js — In-memory caching layer for the ZENTRIX MD BY ZENTRIX TECH platform.
 *
 * Provides a lightweight TTL-based in-memory cache as the default caching backend.
 * When Redis is enabled via redisService.js, this module can be replaced or
 * augmented to use Redis as the backing store for distributed caching.
 *
 * This is intentionally simple — for production use with 1000+ sessions,
 * replace this with a proper Redis-backed implementation.
 */

/** @type {Map<string, {value: *, expiresAt: number}>} */
const store = new Map();

/**
 * Sets a value in the cache with a TTL.
 *
 * @param {string} key
 * @param {*} value
 * @param {number} [ttlMs=60000] - Time-to-live in milliseconds. Defaults to 60 seconds.
 */
export function cacheSet(key, value, ttlMs = 60000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Retrieves a value from the cache. Returns null if the key is missing or expired.
 *
 * @param {string} key
 * @returns {*|null}
 */
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Removes a key from the cache.
 *
 * @param {string} key
 */
export function cacheDel(key) {
  store.delete(key);
}

/**
 * Clears all expired entries from the cache.
 * Should be called periodically (e.g., every 5 minutes) to prevent memory growth.
 */
export function cacheEvictExpired() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(key);
    }
  }
}

// Automatically evict expired entries every 5 minutes
setInterval(cacheEvictExpired, 5 * 60 * 1000);

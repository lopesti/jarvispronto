// Simple in-memory TTL cache
const cache = new Map();

/**
 * Set a value with TTL in ms (default 5 min)
 */
function set(key, value, ttlMs = 5 * 60 * 1000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Get a value (returns undefined if expired or missing)
 */
function get(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Delete a key
 */
function del(key) {
  cache.delete(key);
}

/**
 * Periodically clear expired entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}, 60 * 1000);

module.exports = { set, get, del };

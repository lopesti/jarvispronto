// Anti-spam: limits messages per phone per time window
const WINDOW_MS = 10 * 1000; // 10 seconds
const MAX_MESSAGES = 5;

const tracker = new Map();

/**
 * Check if sender is within rate limit
 * @param {string} from - sender ID
 * @returns {boolean} true if allowed
 */
function check(from) {
  const now = Date.now();
  const entry = tracker.get(from) || { count: 0, windowStart: now };

  if (now - entry.windowStart > WINDOW_MS) {
    // Reset window
    entry.count = 1;
    entry.windowStart = now;
  } else {
    entry.count += 1;
  }

  tracker.set(from, entry);

  return entry.count <= MAX_MESSAGES;
}

/**
 * Periodically clean up stale entries to avoid memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tracker.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 10) {
      tracker.delete(key);
    }
  }
}, 60 * 1000);

module.exports = { check };

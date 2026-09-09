const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Remove data files older than MAX_AGE_MS
 */
function runCleanup() {
  if (!fs.existsSync(DATA_DIR)) return;

  const now = Date.now();
  const files = fs.readdirSync(DATA_DIR);

  let removed = 0;
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > MAX_AGE_MS) {
      fs.unlinkSync(filePath);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[CLEANUP] ${removed} arquivo(s) antigos removidos.`);
  }
}

// Run on import and schedule daily
runCleanup();
setInterval(runCleanup, 24 * 60 * 60 * 1000);

module.exports = { runCleanup };

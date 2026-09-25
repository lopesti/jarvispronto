const fs = require('fs');
const path = require('path');

/**
 * Read and parse a JSON file safely
 */
function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Write data as JSON to a file (creates dirs if needed)
 */
function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Append a line to a text file
 */
function appendLine(filePath, line) {
  fs.appendFileSync(filePath, line + '\n', 'utf-8');
}

module.exports = { readJson, writeJson, appendLine };

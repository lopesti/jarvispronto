const fileHandler = require('../utils/fileHandler');
const path = require('path');

const MEMORY_PATH = path.resolve(__dirname, '../../data/memory.json');

/**
 * Load all conversation memories from file
 */
function loadMemory() {
  try {
    return fileHandler.readJson(MEMORY_PATH) || {};
  } catch {
    return {};
  }
}

/**
 * Save all memories to file
 */
function saveMemory(data) {
  fileHandler.writeJson(MEMORY_PATH, data);
}

/**
 * Get memory for a specific user
 */
function getUserMemory(phone) {
  const all = loadMemory();
  return all[phone] || null;
}

/**
 * Set memory for a specific user
 */
function setUserMemory(phone, memoryData) {
  const all = loadMemory();
  all[phone] = { ...memoryData, updatedAt: new Date().toISOString() };
  saveMemory(all);
}

/**
 * Delete memory for a user
 */
function deleteUserMemory(phone) {
  const all = loadMemory();
  delete all[phone];
  saveMemory(all);
}

module.exports = { getUserMemory, setUserMemory, deleteUserMemory };

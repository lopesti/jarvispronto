const intentDetector = require('../utils/intentDetector');

/**
 * Determine if a message has purchase intent
 * @param {string} message
 * @returns {boolean}
 */
function isPurchaseIntent(message) {
  return intentDetector.detect(message) === 'compra';
}

/**
 * Determine if a message is asking about price
 * @param {string} message
 * @returns {boolean}
 */
function isPriceIntent(message) {
  return intentDetector.detect(message) === 'preco';
}

module.exports = { isPurchaseIntent, isPriceIntent };

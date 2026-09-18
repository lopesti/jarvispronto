const crypto = require('crypto');

/**
 * P1 item 18 — injeta request-id em toda requisição e propaga no header de resposta.
 */
function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.length > 0 && incoming.length < 64
      ? incoming
      : crypto.randomBytes(8).toString('hex');
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = { requestIdMiddleware };

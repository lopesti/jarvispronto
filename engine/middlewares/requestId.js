const crypto = require('crypto');

/**
 * O-04 / F-07: gera X-Request-Id e propaga em req.id / res header.
 */
module.exports = function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id =
    (typeof incoming === 'string' && incoming.trim()) ||
    crypto.randomUUID();
  req.id = id;
  req.rid = id;
  res.setHeader('X-Request-Id', id);
  next();
};

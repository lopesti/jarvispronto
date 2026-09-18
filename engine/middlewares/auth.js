const logger = require('../utils/logger');
const { verifyAccessToken } = require('../services/authService');

/**
 * Exige Bearer access token JWT valido.
 */
module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Token invalido' });
  }

  try {
    const decoded = verifyAccessToken(token);
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Tipo de token invalido' });
    }
    req.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'user',
    };
    next();
  } catch (error) {
    logger.warn('Auth falhou: ' + error.message);
    return res.status(401).json({
      error: 'Token invalido ou expirado',
      code: 'TOKEN_EXPIRED',
    });
  }
};

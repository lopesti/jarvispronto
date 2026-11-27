const logger = require('../utils/logger');
const { verifyAccessToken } = require('../services/authService');
const { validateContextToken } = require('../services/adminCompanyContext');

function extractAccessToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }
  if (req.cookies && req.cookies.jarvis_access) {
    return String(req.cookies.jarvis_access);
  }
  return null;
}

module.exports = async function authMiddleware(req, res, next) {
  const token = extractAccessToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Token nao fornecido' });
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
      companyId: decoded.companyId || decoded.company_id || null,
      is_superadmin: decoded.is_superadmin === true,
    };

    if (!req.user.companyId) {
      return res.status(403).json({
        error: 'Usuario sem empresa vinculada. Faca logout e registre novamente.',
        code: 'NO_COMPANY',
      });
    }

    if (process.env.AUTH_CHECK_DB === '1') {
      try {
        const { query } = require('../models/database');
        const { rows } = await query(
          'SELECT id, role, company_id, is_superadmin FROM users WHERE id = $1',
          [req.user.id]
        );

        if (!rows[0]) {
          return res.status(401).json({
            error: 'Usuario inativo ou removido',
            code: 'USER_INACTIVE',
          });
        }

        req.user.role = rows[0].role || req.user.role;
        req.user.companyId = rows[0].company_id || req.user.companyId;
        req.user.is_superadmin = rows[0].is_superadmin === true;
      } catch (e) {
        logger.warn('AUTH_CHECK_DB falhou: ' + e.message);
      }
    }

    // Contexto temporario: so pode ser ativado por SUPERADMIN validado no banco.
    const contextToken = req.headers['x-admin-company-context'];

    if (contextToken) {
      try {
        if (!req.user.is_superadmin) {
          return res.status(403).json({
            error: 'Somente SUPERADMIN pode acessar contexto de empresa',
          });
        }

        const companyId = await validateContextToken(
          String(contextToken),
          req.user.id
        );

        req.user.originalCompanyId = req.user.companyId;
        req.user.companyId = companyId;
        req.user.company_id = companyId;
        req.user.isAdminCompanyContext = true;
      } catch (e) {
        logger.warn('[admin-company-context] ' + e.message);
        return res.status(e.status || 401).json({
          error: e.message || 'Contexto administrativo invalido',
          code: 'INVALID_ADMIN_COMPANY_CONTEXT',
        });
      }
    }

    next();
  } catch (error) {
    logger.warn('Auth falhou: ' + error.message);
    return res.status(401).json({
      error: 'Token invalido ou expirado',
      code: 'TOKEN_EXPIRED',
    });
  }
};

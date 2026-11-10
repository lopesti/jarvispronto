/**
 * Middleware de limite SaaS.
 * Uso: checkLimit('conversations')
 * Se estourar → 402 Payment Required (ou 403).
 */
const usageService = require('../services/usageService');
const logger = require('../utils/logger');

function checkLimit(resourceKey, { softBlock = false } = {}) {
  return async function checkLimitMiddleware(req, res, next) {
    try {
      const companyId = req.user?.companyId || req.user?.company_id;
      if (!companyId) {
        return res.status(401).json({ error: 'Empresa não identificada no token' });
      }

      const result = await usageService.checkLimit(companyId, resourceKey);

      // Anexa info no request para handlers usarem
      req.usageCheck = result;

      if (result.allowed) {
        return next();
      }

      // softBlock: só avisa via header, não corta
      if (softBlock || result.soft) {
        res.setHeader('X-Plan-Limit-Warning', resourceKey);
        res.setHeader('X-Plan-Used', String(result.used));
        res.setHeader('X-Plan-Limit', String(result.limit));
        return next();
      }

      logger.warn(
        `[limit] company=${companyId} resource=${resourceKey} used=${result.used}/${result.limit} reason=${result.reason}`
      );

      return res.status(402).json({
        error: 'Limite do plano atingido',
        resource: resourceKey,
        used: result.used,
        limit: result.limit,
        planCode: result.planCode,
        reason: result.reason,
        upgradeUrl: '/planos',
      });
    } catch (err) {
      logger.error(`[checkLimit] ${err.message}`);
      // Em caso de erro interno, não bloqueia o fluxo principal
      return next();
    }
  };
}

module.exports = checkLimit;

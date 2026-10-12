/**
 * PlanService — consulta planos e limites do tenant.
 */
const { query } = require('../models/database');
const logger = require('../utils/logger');

async function listPlans({ publicOnly = true } = {}) {
  const sql = publicOnly
    ? `SELECT id, code, name, price_monthly, price_yearly, limits, features, sort_order
       FROM plans WHERE active = true AND code <> 'trial' ORDER BY sort_order`
    : `SELECT id, code, name, price_monthly, price_yearly, limits, features, sort_order, active
       FROM plans ORDER BY sort_order`;
  const { rows } = await query(sql);
  return rows;
}

async function getPlanByCode(code) {
  const { rows } = await query(
    `SELECT * FROM plans WHERE code = $1 AND active = true LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function getPlanById(id) {
  const { rows } = await query(`SELECT * FROM plans WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}

/**
 * Retorna assinatura atual + plano da empresa.
 */
async function getCompanySubscription(companyId) {
  const { rows } = await query(
    `SELECT
        s.*,
        p.code AS plan_code,
        p.name AS plan_name,
        p.price_monthly,
        p.price_yearly,
        p.limits,
        p.features
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.company_id = $1
       AND s.status IN ('trial', 'active', 'past_due')
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [companyId]
  );
  return rows[0] || null;
}

/**
 * F-05: cria assinatura trial para uma empresa nova.
 * Idempotente: se a empresa ja tiver assinatura ativa/trial, retorna ela.
 *
 * @param {number} companyId
 * @param {number} trialDays - duracao do trial (default: 14)
 * @returns {object|null} subscription criada ou existente
 */
async function createTrialSubscription(companyId, trialDays = 14) {
  const cid = Number(companyId);
  if (!cid || Number.isNaN(cid)) {
    logger.warn(`[planService] createTrialSubscription: companyId invalido (${companyId})`);
    return null;
  }

  // Se ja tem assinatura ativa/trial/past_due, retorna ela
  const existing = await getCompanySubscription(cid);
  if (existing) {
    return existing;
  }

  // Busca o plano trial
  const trialPlan = await getPlanByCode('trial');
  if (!trialPlan) {
    logger.error('[planService] plano "trial" nao encontrado — verifique migration 020');
    return null;
  }

  // Cria a assinatura trial
  const { rows } = await query(
    `INSERT INTO subscriptions (
        company_id, plan_id, status, billing_cycle,
        trial_ends_at, current_period_start, current_period_end
     ) VALUES ($1, $2, 'trial', 'monthly', NOW() + ($3 || ' days')::interval, NOW(), NOW() + ($3 || ' days')::interval)
     RETURNING *`,
    [cid, trialPlan.id, String(trialDays)]
  );

  // Atualiza cache rapido na companies
  await query(
    `UPDATE companies
        SET plan_code = 'trial',
            subscription_status = 'trial'
      WHERE id = $1`,
    [cid]
  );

  // Registra evento de billing
  await query(
    `INSERT INTO billing_events (company_id, type, payload)
     VALUES ($1, 'subscription.trial_created', $2)`,
    [cid, JSON.stringify({ planCode: 'trial', trialDays, subscriptionId: rows[0].id })]
  );

  logger.info(`[planService] trial criado company=${cid} subscription=${rows[0].id} (${trialDays}d)`);
  return rows[0];
}

/**
 * Verifica se a empresa ainda esta dentro do trial/plano ativo.
 */
function isSubscriptionUsable(sub) {
  if (!sub) return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'past_due') return true; // soft — avisa mas nao corta
  if (sub.status === 'trial') {
    if (!sub.trial_ends_at) return true;
    return new Date(sub.trial_ends_at) > new Date();
  }
  return false;
}

/**
 * Limite numerico do plano. -1 = ilimitado.
 */
function getLimit(sub, key) {
  if (!sub || !sub.limits) return 0;
  const limits = typeof sub.limits === 'string' ? JSON.parse(sub.limits) : sub.limits;
  const val = limits[key];
  return val === undefined || val === null ? 0 : Number(val);
}

module.exports = {
  listPlans,
  getPlanByCode,
  getPlanById,
  getCompanySubscription,
  createTrialSubscription,
  isSubscriptionUsable,
  getLimit,
};
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
 * Verifica se a empresa ainda está dentro do trial/plano ativo.
 */
function isSubscriptionUsable(sub) {
  if (!sub) return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'past_due') return true; // soft — avisa mas não corta
  if (sub.status === 'trial') {
    if (!sub.trial_ends_at) return true;
    return new Date(sub.trial_ends_at) > new Date();
  }
  return false;
}

/**
 * Limite numérico do plano. -1 = ilimitado.
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
  isSubscriptionUsable,
  getLimit,
};

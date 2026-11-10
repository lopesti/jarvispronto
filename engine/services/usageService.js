/**
 * UsageService — contagem de uso mensal e checagem de limites.
 */
const { query } = require('../models/database');
const planService = require('./planService');
const logger = require('../utils/logger');

function currentYearMonth(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function ensureUsageRow(companyId, yearMonth = currentYearMonth()) {
  await query(
    `INSERT INTO usage_monthly (company_id, year_month)
     VALUES ($1, $2)
     ON CONFLICT (company_id, year_month) DO NOTHING`,
    [companyId, yearMonth]
  );
}

async function getUsage(companyId, yearMonth = currentYearMonth()) {
  await ensureUsageRow(companyId, yearMonth);
  const { rows } = await query(
    `SELECT * FROM usage_monthly WHERE company_id = $1 AND year_month = $2 LIMIT 1`,
    [companyId, yearMonth]
  );
  return rows[0];
}

/**
 * Incrementa um contador de uso.
 * keys: conversations | messages_sent | messages_received | users_count | whatsapp_numbers | produtos_count
 */
async function increment(companyId, key, amount = 1) {
  const allowed = new Set([
    'conversations',
    'messages_sent',
    'messages_received',
    'users_count',
    'whatsapp_numbers',
    'produtos_count',
  ]);
  if (!allowed.has(key)) {
    throw new Error(`usage key inválida: ${key}`);
  }
  const yearMonth = currentYearMonth();
  await ensureUsageRow(companyId, yearMonth);
  const { rows } = await query(
    `UPDATE usage_monthly
     SET ${key} = ${key} + $3,
         updated_at = NOW()
     WHERE company_id = $1 AND year_month = $2
     RETURNING *`,
    [companyId, yearMonth, amount]
  );
  return rows[0];
}

/**
 * Sincroniza contadores "estáticos" (users, produtos, whatsapp) a partir do banco.
 */
async function syncStaticCounts(companyId) {
  const yearMonth = currentYearMonth();
  await ensureUsageRow(companyId, yearMonth);

  const [users, produtos] = await Promise.all([
    query(`SELECT COUNT(*)::int AS c FROM users WHERE company_id = $1`, [companyId]),
    query(`SELECT COUNT(*)::int AS c FROM produtos WHERE company_id = $1`, [companyId]),
  ]);

  // whatsapp_numbers: se existir tabela de canais/sessões, ajustar depois.
  // Por enquanto mantém o valor já incrementado ou 0.
  const { rows } = await query(
    `UPDATE usage_monthly
     SET users_count = $3,
         produtos_count = $4,
         updated_at = NOW()
     WHERE company_id = $1 AND year_month = $2
     RETURNING *`,
    [companyId, yearMonth, users.rows[0].c, produtos.rows[0].c]
  );
  return rows[0];
}

/**
 * Checa se a empresa pode consumir mais do recurso.
 * Retorna { allowed, used, limit, remaining, planCode, soft }
 * soft=true → avisar mas não bloquear (ex: past_due)
 */
async function checkLimit(companyId, resourceKey) {
  const sub = await planService.getCompanySubscription(companyId);
  if (!sub) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      planCode: null,
      reason: 'no_subscription',
      soft: false,
    };
  }

  const usable = planService.isSubscriptionUsable(sub);
  const limit = planService.getLimit(sub, resourceKey);
  const usage = await getUsage(companyId);

  // mapeia resourceKey do plano → coluna de usage
  const usageMap = {
    conversations: 'conversations',
    users: 'users_count',
    whatsapp_numbers: 'whatsapp_numbers',
    produtos: 'produtos_count',
  };
  const col = usageMap[resourceKey] || resourceKey;
  const used = Number(usage?.[col] || 0);

  // -1 = ilimitado
  if (limit === -1) {
    return {
      allowed: usable,
      used,
      limit: -1,
      remaining: -1,
      planCode: sub.plan_code,
      status: sub.status,
      soft: sub.status === 'past_due',
    };
  }

  const remaining = Math.max(0, limit - used);
  const within = used < limit;

  return {
    allowed: usable && within,
    used,
    limit,
    remaining,
    planCode: sub.plan_code,
    status: sub.status,
    soft: sub.status === 'past_due',
    reason: !usable ? 'subscription_inactive' : !within ? 'limit_reached' : null,
  };
}

/**
 * Snapshot completo de uso + limites para o painel.
 */
async function getUsageSnapshot(companyId) {
  const sub = await planService.getCompanySubscription(companyId);
  const usage = await syncStaticCounts(companyId);

  if (!sub) {
    return { subscription: null, usage, limits: {}, checks: {} };
  }

  const keys = ['conversations', 'users', 'whatsapp_numbers', 'produtos'];
  const checks = {};
  for (const k of keys) {
    checks[k] = await checkLimit(companyId, k);
  }

  return {
    subscription: {
      status: sub.status,
      planCode: sub.plan_code,
      planName: sub.plan_name,
      billingCycle: sub.billing_cycle,
      trialEndsAt: sub.trial_ends_at,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      priceMonthly: sub.price_monthly,
      features: sub.features,
    },
    usage,
    limits: sub.limits,
    checks,
  };
}

module.exports = {
  currentYearMonth,
  getUsage,
  increment,
  syncStaticCounts,
  checkLimit,
  getUsageSnapshot,
};

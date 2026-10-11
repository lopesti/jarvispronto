/**
 * Asaas billing integration.
 * Docs: https://docs.asaas.com
 *
 * Env:
 *   ASAAS_API_KEY   — access_token
 *   ASAAS_BASE_URL  — default https://api.asaas.com/v3 (sandbox: https://api-sandbox.asaas.com/v3)
 *   ASAAS_WEBHOOK_TOKEN — valida header asaas-access-token
 *   APP_PUBLIC_URL  — callbacks success/cancel
 */
const crypto = require('crypto');
const logger = require('../utils/logger');

const BASE = (process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3').replace(/\/$/, '');
const API_KEY = process.env.ASAAS_API_KEY || '';
const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';

function enabled() {
  return Boolean(API_KEY);
}

async function asaasFetch(path, { method = 'GET', body } = {}) {
  if (!API_KEY) {
    const err = new Error('ASAAS_API_KEY não configurada');
    err.code = 'ASAAS_DISABLED';
    throw err;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.message || res.statusText;
    const err = new Error(`Asaas ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/**
 * Cria ou reutiliza cliente Asaas.
 * externalReference = company_id
 */
async function ensureCustomer({ companyId, name, email, cpfCnpj }) {
  // busca por externalReference
  const found = await asaasFetch(
    `/customers?externalReference=${encodeURIComponent(String(companyId))}&limit=1`
  );
  if (found?.data?.length) return found.data[0];

  return asaasFetch('/customers', {
    method: 'POST',
    body: {
      name: name || `Empresa ${companyId}`,
      email: email || undefined,
      cpfCnpj: cpfCnpj || undefined,
      externalReference: String(companyId),
      notificationDisabled: true,
    },
  });
}

/**
 * Cria assinatura recorrente no Asaas.
 * cycle: MONTHLY | YEARLY
 */
async function createSubscription({
  customerId,
  value,
  cycle = 'MONTHLY',
  description,
  externalReference,
  billingType = 'UNDEFINED', // cliente escolhe na fatura
}) {
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + 1);
  const dueStr = nextDue.toISOString().slice(0, 10);

  return asaasFetch('/subscriptions', {
    method: 'POST',
    body: {
      customer: customerId,
      billingType,
      value: Number(value),
      nextDueDate: dueStr,
      cycle: cycle === 'yearly' || cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      description: description || 'Jarvis CRM',
      externalReference: externalReference || undefined,
    },
  });
}

/**
 * Checkout hospedado (opcional) — cobrança avulsa ou recorrente via página Asaas.
 */
async function createCheckout({
  value,
  name,
  description,
  cycle = 'MONTHLY',
  externalReference,
  recurrent = true,
}) {
  const publicUrl = (process.env.APP_PUBLIC_URL || 'http://localhost').replace(/\/$/, '');
  const body = {
    billingTypes: ['PIX', 'CREDIT_CARD', 'BOLETO'],
    chargeTypes: recurrent ? ['RECURRENT'] : ['DETACHED'],
    minutesToExpire: 120,
    externalReference: externalReference || undefined,
    callback: {
      successUrl: `${publicUrl}/settings?billing=success`,
      cancelUrl: `${publicUrl}/settings?billing=cancel`,
      expiredUrl: `${publicUrl}/settings?billing=expired`,
    },
    items: [
      {
        name: name || 'Jarvis CRM',
        description: description || 'Assinatura',
        quantity: 1,
        value: Number(value),
      },
    ],
  };
  if (recurrent) {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    body.subscription = {
      cycle: cycle === 'yearly' || cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      nextDueDate: next.toISOString().slice(0, 19).replace('T', ' '),
    };
  }
  return asaasFetch('/checkouts', { method: 'POST', body });
}

/**
 * S-01: valida header asaas-access-token.
 * - Em producao, exige ASAAS_WEBHOOK_TOKEN configurado (rejeita se vazio).
 * - Comparacao em tempo constante para evitar timing attack.
 */
function validateWebhookToken(req) {
  if (!WEBHOOK_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(
        '[asaas] ASAAS_WEBHOOK_TOKEN nao configurado em producao — rejeitando webhook'
      );
      return false;
    }
    return true; // dev sem token
  }

  const got =
    req.headers['asaas-access-token'] ||
    req.headers['Asaas-Access-Token'] ||
    req.headers['x-asaas-token'];

  if (!got || typeof got !== 'string') return false;
  if (got.length !== WEBHOOK_TOKEN.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(got, 'utf8'),
      Buffer.from(WEBHOOK_TOKEN, 'utf8')
    );
  } catch {
    return false;
  }
}

module.exports = {
  enabled,
  ensureCustomer,
  createSubscription,
  createCheckout,
  validateWebhookToken,
  asaasFetch,
};
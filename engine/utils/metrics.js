/**
 * Métricas Prometheus com isolamento por tenant (BUG-032)
 *
 * - Contadores globais (soma de todos os tenants)
 * - Contadores por tenant (Map<companyId, counters>)
 * - /metrics          → tudo
 * - /metrics?companyId=X → só do tenant
 */
const startTime = Date.now();

const METRIC_NAMES = [
  'http_requests_total',
  'messages_received_total',
  'messages_sent_total',
  'ia_calls_total',
  'ia_cache_hits_total',
  'auth_failures_total',
];

// Global (agregado de todos os tenants)
const counters = {};
METRIC_NAMES.forEach((n) => (counters[n] = 0));

// Por tenant
const countersByTenant = new Map();

/**
 * Incrementa métrica.
 * @param {string} name
 * @param {number|null} companyId — se null, só incrementa global
 * @param {number} n
 */
function inc(name, companyId = null, n = 1) {
  if (counters[name] !== undefined) {
    counters[name] += n;
  }

  if (companyId) {
    const cid = Number(companyId);
    if (!Number.isNaN(cid)) {
      if (!countersByTenant.has(cid)) {
        const init = {};
        METRIC_NAMES.forEach((n2) => (init[n2] = 0));
        countersByTenant.set(cid, init);
      }
      const t = countersByTenant.get(cid);
      if (t[name] !== undefined) t[name] += n;
    }
  }
}

/**
 * @param {number|null} companyId — filtra por tenant
 */
function getMetrics(companyId = null) {
  const lines = [
    '# HELP process_uptime_seconds Uptime do processo',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${(Date.now() - startTime) / 1000}`,
    '',
  ];

  if (companyId) {
    const cid = Number(companyId);
    const c = countersByTenant.get(cid) || {};
    lines.push(`# === TENANT ${cid} ===`);
    for (const name of METRIC_NAMES) {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}{company_id="${cid}"} ${c[name] || 0}`);
    }
    return lines.join('\n') + '\n';
  }

  lines.push('# === GLOBAL ===');
  for (const [k, v] of Object.entries(counters)) {
    lines.push(`# TYPE ${k} counter`);
    lines.push(`${k} ${v}`);
  }

  lines.push('');
  lines.push('# === POR TENANT ===');
  for (const [cid, t] of countersByTenant.entries()) {
    for (const name of METRIC_NAMES) {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}{company_id="${cid}"} ${t[name] || 0}`);
    }
  }

  return lines.join('\n') + '\n';
}

module.exports = { inc, getMetrics, counters, countersByTenant, METRIC_NAMES };

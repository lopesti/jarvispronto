/**
 * Métricas Prometheus leves (P1 item 18)
 */
const startTime = Date.now();
const counters = {
  http_requests_total: 0,
  messages_received_total: 0,
  messages_sent_total: 0,
  ia_calls_total: 0,
  ia_cache_hits_total: 0,
  auth_failures_total: 0,
};

function inc(name, n = 1) {
  if (counters[name] !== undefined) counters[name] += n;
}

function getMetrics() {
  const lines = [
    '# HELP process_uptime_seconds Uptime do processo',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${(Date.now() - startTime) / 1000}`,
    '',
  ];
  for (const [k, v] of Object.entries(counters)) {
    lines.push(`# TYPE ${k} counter`);
    lines.push(`${k} ${v}`);
  }
  return lines.join('\n') + '\n';
}

module.exports = { inc, getMetrics, counters };

// tests/smoke/lib/http.js
// Helper compartilhado pelos smoke tests (C1-C3).
// Sem dependências externas — usa fetch nativo do Node 18+.

// Ignora cert self-signed no ambiente local.
// Silencia o warning do Node 24 sobre NODE_TLS_REJECT_UNAUTHORIZED.
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const origEmit = process.emitWarning;
  process.emitWarning = (warning, ...args) => {
    if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;
    return origEmit.call(process, warning, ...args);
  };
}

const BASE_HTTPS = process.env.JARVIS_BASE_URL || 'https://localhost';
const BASE_HTTP  = process.env.JARVIS_BASE_URL_HTTP || 'http://localhost';

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const state = { pass: 0, fail: 0, warn: 0 };

async function httpGet(path, opts = {}) {
  const url = `${BASE_HTTPS}${path}`;
  const res = await fetch(url, { redirect: 'manual', ...opts });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

// GET em HTTP puro (sem TLS) — só pra testar redirect 301
async function httpGetPlain(path, opts = {}) {
  const url = `${BASE_HTTP}${path}`;
  const res = await fetch(url, { redirect: 'manual', ...opts });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

async function httpPost(path, body, opts = {}) {
  const url = `${BASE_HTTPS}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

function check(name, condition, extra = '') {
  if (condition) {
    console.log(`  ${C.green}[PASS]${C.reset} ${name}${extra ? ' ' + C.gray + extra + C.reset : ''}`);
    state.pass++;
  } else {
    console.log(`  ${C.red}[FAIL]${C.reset} ${name}${extra ? ' ' + C.gray + extra + C.reset : ''}`);
    state.fail++;
  }
}

function warn(name, extra = '') {
  console.log(`  ${C.yellow}[WARN]${C.reset} ${name}${extra ? ' ' + C.gray + extra + C.reset : ''}`);
  state.warn++;
}

function section(title) {
  console.log(`\n${C.cyan}=== ${title} ===${C.reset}`);
}

function summary(camada) {
  const total = state.pass + state.fail;
  const ok = state.fail === 0;
  console.log(`\n${ok ? C.green : C.red}=== ${camada} — ${state.pass}/${total} PASS${state.warn ? ` (${state.warn} WARN)` : ''} ===${C.reset}`);
  return ok;
}

function exitCode() {
  process.exit(state.fail > 0 ? 1 : 0);
}

module.exports = { BASE_HTTPS, BASE_HTTP, httpGet, httpGetPlain, httpPost, check, warn, section, summary, exitCode, state };
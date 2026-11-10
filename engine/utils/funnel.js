/**
 * Etapas do funil comercial + classificacao por texto (multi-tenant — BUG-031)
 *
 * Regras por tenant vem de companies.config->'funnelRules' (JSONB).
 * Fallback: as regras default abaixo (comportamento global anterior).
 *
 * F-04 (corrigido): normaliza acentos (NFD) antes de comparar keywords.
 * Sem isso, "não quero", "preço", "cartão" nunca casavam.
 */

const { pool } = require('../models/database');
const logger = require('./logger');

const STEPS = [
  'inicio',
  'qualificacao',
  'interesse',
  'objecao',
  'fechamento',
  'vendido',
  'perdido',
];

const STEP_LABELS = {
  inicio: 'Novo',
  qualificacao: 'Qualificacao',
  interesse: 'Interesse',
  objecao: 'Objecao',
  fechamento: 'Fechamento',
  vendido: 'Ganho',
  perdido: 'Perdido',
};

// Default global (usado se o tenant nao configurou)
// Keywords SEM acento — normalizeText() aplica NFD no texto e nas keywords
const DEFAULT_RULES = {
  stepKeywords: {
    perdido:      ['nao quero', 'sem interesse', 'cancela', 'desisto'],
    vendido:      ['comprei', 'paguei', 'pedido feito', 'fechado', 'pode enviar'],
    fechamento:   ['pix', 'cartao', 'boleto', 'link de pagamento', 'fechar', 'quero comprar agora'],
    objecao:      ['caro', 'depois', 'vou pensar', 'nao sei', 'duvida'],
    interesse:    ['preco', 'quanto custa', 'valor', 'promocao', 'desconto', 'tem garantia'],
    qualificacao: ['ola', 'oi', 'bom dia', 'boa tarde', 'quero saber', 'informacao'],
  },
  stepScores: {
    inicio: 10,
    qualificacao: 30,
    interesse: 55,
    objecao: 45,
    fechamento: 80,
    vendido: 100,
    perdido: 0,
  },
};

// Ordem de prioridade das regras (primeira que casa vence)
const CLASSIFY_ORDER = [
  'perdido',
  'vendido',
  'fechamento',
  'objecao',
  'interesse',
];

// ─────────────────────────────────────────────────────────────────
//  F-04: normalizacao de texto (remove acentos)
// ─────────────────────────────────────────────────────────────────

function normalizeText(s) {
  return String(s || '')
    .normalize('NFD')                     // separa letra do acento
    .replace(/[\u0300-\u036f]/g, '')      // remove os diacriticos
    .toLowerCase()
    .replace(/[?!.,;]/g, '')              // remove pontuacao simples
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────
//  Cache de regras por tenant (TTL 60s — mesmo padrao do BUG-009)
// ─────────────────────────────────────────────────────────────────

const _rulesCache = new Map(); // companyId -> { rules, expiresAt }
const RULES_TTL_MS = 60 * 1000;

async function getFunnelRules(companyId) {
  const cid = Number(companyId);
  if (!cid || Number.isNaN(cid)) return DEFAULT_RULES;

  const now = Date.now();
  const hit = _rulesCache.get(cid);
  if (hit && hit.expiresAt > now) return hit.rules;

  try {
    const { rows } = await pool.query(
      `SELECT config->'funnelRules' AS rules FROM companies WHERE id = $1`,
      [cid]
    );
    const tenantRules = rows[0]?.rules;
    const rules = tenantRules && Object.keys(tenantRules).length > 0
      ? {
          stepKeywords: tenantRules.stepKeywords || DEFAULT_RULES.stepKeywords,
          stepScores:   tenantRules.stepScores   || DEFAULT_RULES.stepScores,
        }
      : DEFAULT_RULES;

    _rulesCache.set(cid, { rules, expiresAt: now + RULES_TTL_MS });
    return rules;
  } catch (err) {
    logger.warn(`[funnel] getFunnelRules(${cid}) falhou: ${err.message}`);
    return DEFAULT_RULES;
  }
}

function invalidateFunnelCache(companyId) {
  if (companyId === undefined || companyId === null) {
    _rulesCache.clear();
    return;
  }
  _rulesCache.delete(Number(companyId));
}

// ─────────────────────────────────────────────────────────────────
//  Classificacao e scoring (com normalizacao de acentos)
// ─────────────────────────────────────────────────────────────────

function classifyStep(text, current = 'inicio', rules = DEFAULT_RULES) {
  // F-04: normaliza o texto (remove acentos, lowercase, limpa pontuacao)
  const t = normalizeText(text);
  if (!t) return current;

  const stepKeywords = rules.stepKeywords || DEFAULT_RULES.stepKeywords;

  // 1) Regras de "forca" — primeira que casar vence
  for (const step of CLASSIFY_ORDER) {
    const kws = stepKeywords[step] || [];
    if (kws.some((kw) => t.includes(normalizeText(kw)))) {
      return step;
    }
  }

  // 2) Regra especial: saudacao so promove se ainda estamos no inicio
  const greetKws = stepKeywords.qualificacao || [];
  if (current === 'inicio' && greetKws.some((kw) => t.includes(normalizeText(kw)))) {
    return 'qualificacao';
  }

  // 3) Se ja passou do inicio, mantem onde esta
  if (current !== 'inicio') return current;

  // 4) Fallback: qualquer mensagem em "inicio" vira "qualificacao"
  return 'qualificacao';
}

function scoreForStep(step, rules = DEFAULT_RULES) {
  const map = rules.stepScores || DEFAULT_RULES.stepScores;
  const score = map[step];
  return typeof score === 'number' ? score : 20;
}

module.exports = {
  STEPS,
  STEP_LABELS,
  DEFAULT_RULES,
  getFunnelRules,
  invalidateFunnelCache,
  classifyStep,
  scoreForStep,
  normalizeText,
};
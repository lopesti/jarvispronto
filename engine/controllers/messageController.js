const logger = require('../utils/logger');
const { classifyStep, scoreForStep, getFunnelRules } = require('../utils/funnel');
const conversationRepo = require('../repositories/conversationRepository');
const messageRepo = require('../repositories/messageRepository');

const HANDOFF_KEYWORDS = /\b(atendente|humano|operador|falar com algu[eé]m)\b/i;

/**
 * @param {string} from
 * @param {string} text
 * @param {object} sock
 * @param {object|number} opts  companyId number or { rid, companyId }
 */

/** F-09: lock por phone com TTL 30s — 2ª mensagem concurrent é ignorada */
const phoneLocks = new Map();
const LOCK_TTL_MS = 30000;

async function withPhoneLock(phone, companyId, fn) {
  const key = `${companyId}:${phone}`;
  const existing = phoneLocks.get(key);
  if (existing) {
    const logger = require('../utils/logger');
    logger.info(`[lock] ignorando mensagem concorrente ${key}`);
    return null; // não processa em paralelo
  }
  const entry = { until: Date.now() + LOCK_TTL_MS };
  phoneLocks.set(key, entry);
  try {
    return await fn();
  } finally {
    phoneLocks.delete(key);
  }
}

async function handleMessage(from, text, sock, opts = {}) {
  const _companyIdEarly =
    typeof opts === 'number'
      ? opts
      : Number(opts?.companyId || opts?.user?.companyId) || null;
  if (_companyIdEarly && from) {
    return withPhoneLock(from, _companyIdEarly, () =>
      handleMessageUnlocked(from, text, sock, opts)
    );
  }
  return handleMessageUnlocked(from, text, sock, opts);
}

async function handleMessageUnlocked(from, text, sock, opts = {}) {
  const companyId =
    typeof opts === 'number' ? opts : Number(opts.companyId || opts) || 1;
  const rid = (typeof opts === 'object' && opts.rid) || `msg_${Date.now().toString(36)}`;

  if (
    !from ||
    from.includes('@newsletter') ||
    from.includes('status@broadcast') ||
    from.includes('@broadcast')
  ) {
    logger.info(`[${rid}] Ignorando canal/newsletter: ${from}`);
    return;
  }

  if (!from.endsWith('@s.whatsapp.net') && !from.endsWith('@lid')) {
    logger.info(`[${rid}] Ignorando grupo/outro tipo: ${from}`);
    return;
  }

  const phone = from;
  const channel = 'whatsapp';
  const body = (text || '').trim();
  if (!body) return;

  logger.info(`[${rid}][company=${companyId}][${channel}] ${phone}: ${body.slice(0, 80)}`);

  try {
    const existing = await conversationRepo.getByPhone(phone, companyId);
    const prevStep = existing?.current_step || 'inicio';
    const botMode = existing?.bot_mode || 'full';
    let needsHuman = existing?.needs_human === true;

    // BUG-031: regras de classificacao/score por tenant (fallback global)
    const funnelRules = await getFunnelRules(companyId);
    const nextStep = classifyStep(body, prevStep, funnelRules);
    const score = scoreForStep(nextStep, funnelRules);

    await conversationRepo.upsertStep({
      phone,
      channel,
      currentStep: nextStep,
      leadScore: score,
      companyId,
    });

    // F-06: le o historico ANTES de gravar a mensagem atual.
    // Assim o prompt da IA nao recebe a ultima fala duplicada.
    const history = await messageRepo.getHistory(phone, 10, companyId);

    await messageRepo.insert({
      phone,
      role: 'user',
      content: body,
      direction: 'incoming',
      channel,
      companyId,
    });

    if (HANDOFF_KEYWORDS.test(body) || (botMode === 'hybrid' && score >= 70)) {
      needsHuman = true;
      await conversationRepo.markNeedsHuman(
        phone,
        `Auto-handoff: keyword ou score ${score}. Step ${nextStep}.`,
        companyId
      );
      try {
        const { query } = require('../models/database');
        await query(
          `INSERT INTO billing_events (company_id, type, payload) VALUES ($1, 'handoff.triggered', $2)`,
          [companyId, JSON.stringify({ phone, score, step: nextStep, rid })]
        );
      } catch (_) {}
    }

    if (botMode === 'human' || needsHuman) {
      logger.info(`[${rid}][company=${companyId}] Handoff — bot nao responde`);
      if (sock && HANDOFF_KEYWORDS.test(body)) {
        const note =
          'Certo! Vou transferir voce para um atendente. Em instantes alguem da equipe continua por aqui.';
        await sock.sendMessage(phone, { text: note });
        await messageRepo.insert({
          phone,
          role: 'assistant',
          content: note,
          direction: 'outgoing',
          channel,
          companyId,
        });
      }
      return;
    }

    let responseText;
    try {
      const geminiService = require('../services/geminiService');
      // BUG-008 CORRIGIDO: passa companyId para isolar cache por tenant
      // F-06 CORRIGIDO: history nao contem a mensagem atual
      responseText = await geminiService.generateResponse(body, history, companyId);
      try {
        const { inc } = require('../utils/metrics');
        inc('ia_calls_total', companyId);
      } catch (_) {}
    } catch (aiErr) {
      logger.error(`[${rid}] IA: ${aiErr.message}`);
      responseText =
        'Ola! Recebi sua mensagem. Estou com instabilidade momentanea na IA. Ja anotei seu contato!';
    }

    if (!responseText || !String(responseText).trim()) {
      responseText = 'Ola! Como posso ajudar voce hoje?';
    }

    if (sock) {
      // F-10: delay humano 800–1800ms
      await new Promise((r) => setTimeout(r, 800 + Math.floor(Math.random() * 1000)));
      await sock.sendMessage(phone, { text: String(responseText) });
      try {
        const { inc } = require('../utils/metrics');
        inc('messages_sent_total', companyId);
      } catch (_) {}
    }

    await messageRepo.insert({
      phone,
      role: 'assistant',
      content: String(responseText),
      direction: 'outgoing',
      channel,
      companyId,
    });

    logger.info(`[${rid}][company=${companyId}] OK step=${nextStep} score=${score}`);

    // F-07: usage + automações
    try {
      const usageService = require('../services/usageService');
      await usageService.increment(companyId, 'conversations', 0); // noop se já conta
      await usageService.increment(companyId, 'messages', 1);
    } catch (_) {}
    try {
      const { runAutomations } = require('../services/automationExecutor');
      await runAutomations({
        companyId,
        phone,
        score,
        step: nextStep,
        needsHuman,
        body,
      });
    } catch (autoErr) {
      logger.warn(`[${rid}] automation: ${autoErr.message}`);
    }
  } catch (error) {
    logger.error(`[${rid}] Erro: ${error.message}`);
    try {
      if (sock) {
        await sock.sendMessage(phone, {
          text: 'Desculpe, ocorreu um erro. Tente novamente em instantes.',
        });
      }
    } catch (_) {}
  }
}

module.exports = { handleMessage };
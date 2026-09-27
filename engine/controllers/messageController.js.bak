const logger = require('../utils/logger');
const { classifyStep, scoreForStep } = require('../utils/funnel');
const conversationRepo = require('../repositories/conversationRepository');
const messageRepo = require('../repositories/messageRepository');

const HANDOFF_KEYWORDS = /\b(atendente|humano|pessoa|operador|falar com algu[eé]m)\b/i;

/**
 * @param {string} from
 * @param {string} text
 * @param {object} sock
 * @param {object|number} opts  companyId number or { rid, companyId }
 */
async function handleMessage(from, text, sock, opts = {}) {
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
    const nextStep = classifyStep(body, prevStep);
    const score = scoreForStep(nextStep);

    await conversationRepo.upsertStep({
      phone,
      channel,
      currentStep: nextStep,
      leadScore: score,
      companyId,
    });

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

    const history = await messageRepo.getHistory(phone, 10, companyId);

    let responseText;
    try {
      const geminiService = require('../services/geminiService');
      responseText = await geminiService.generateResponse(body, history);
    } catch (aiErr) {
      logger.error(`[${rid}] IA: ${aiErr.message}`);
      responseText =
        'Ola! Recebi sua mensagem. Estou com instabilidade momentanea na IA. Ja anotei seu contato!';
    }

    if (!responseText || !String(responseText).trim()) {
      responseText = 'Ola! Como posso ajudar voce hoje?';
    }

    if (sock) {
      await sock.sendMessage(phone, { text: String(responseText) });
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

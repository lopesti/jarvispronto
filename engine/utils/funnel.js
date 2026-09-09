/**
 * Etapas do funil comercial + classificacao simples por texto
 */
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

function classifyStep(text, current = 'inicio') {
  const t = (text || '').toLowerCase();
  if (!t) return current;

  if (/(nao quero|sem interesse|cancela|desisto)/.test(t)) return 'perdido';
  if (/(comprei|paguei|pedido feito|fechado|pode enviar)/.test(t)) return 'vendido';
  if (/(pix|cartao|boleto|link de pagamento|fechar|quero comprar agora)/.test(t)) return 'fechamento';
  if (/(caro|depois|vou pensar|nao sei|duvida)/.test(t)) return 'objecao';
  if (/(preco|quanto custa|valor|promocao|desconto|tem garantia)/.test(t)) return 'interesse';
  if (/(ola|oi|bom dia|boa tarde|quero saber|informacao)/.test(t) && current === 'inicio') return 'qualificacao';
  if (current === 'inicio') return 'qualificacao';
  return current;
}

function scoreForStep(step) {
  const map = {
    inicio: 10,
    qualificacao: 30,
    interesse: 55,
    objecao: 45,
    fechamento: 80,
    vendido: 100,
    perdido: 0,
  };
  return map[step] ?? 20;
}

module.exports = { STEPS, STEP_LABELS, classifyStep, scoreForStep };

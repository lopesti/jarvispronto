import Link from "next/link";

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="text-sm text-primary hover:underline">← Voltar</Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 10 de outubro de 2026</p>
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <p>
            Esta política descreve como o JARVIS Comercial trata dados pessoais no contexto do
            atendimento comercial via WhatsApp e do painel web multiempresa.
          </p>
          <h2 id="lgpd" className="text-lg font-semibold text-foreground">LGPD</h2>
          <p>
            Tratamos dados com base em execução de contrato e legítimo interesse para operação do funil de vendas,
            sempre isolados por empresa (company_id). O controlador dos dados dos leads é, em regra, a empresa cliente
            que utiliza o JARVIS; atuamos como operador da plataforma.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Dados coletados</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Dados de conta: nome, e-mail, senha (hash)</li>
            <li>Dados de leads: telefone, mensagens, score, etapa do funil, notas internas</li>
            <li>Dados técnicos: logs, IP, identificadores de sessão</li>
          </ul>
          <h2 className="text-lg font-semibold text-foreground">Direitos do titular</h2>
          <p>
            Acesso, correção, exclusão e portabilidade podem ser solicitados à empresa responsável pelo atendimento
            ou, quando aplicável, via canais de suporte do produto.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Retenção</h2>
          <p>
            O período de retenção de histórico de mensagens pode variar conforme o plano contratado.
            Após cancelamento, dados podem ser excluídos ou anonimizados conforme política operacional.
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 12 de outubro de 2026
        </p>
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <p>
            Esta política descreve como o JARVIS Comercial trata dados pessoais no contexto do
            atendimento comercial via WhatsApp e do painel web multiempresa.
          </p>

          <h2 id="lgpd" className="text-lg font-semibold text-foreground">
            LGPD
          </h2>
          <p>
            Tratamos dados com base em execução de contrato e legítimo interesse para operação do
            funil de vendas, sempre isolados por empresa (company_id). O controlador dos dados dos
            leads é, em regra, a empresa cliente que utiliza o JARVIS; atuamos como operador da
            plataforma.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Dados coletados</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Dados de conta: nome, e-mail, senha (hash)</li>
            <li>Dados de leads: telefone, mensagens, score, etapa do funil, notas internas</li>
            <li>Dados técnicos: logs, IP, identificadores de sessão</li>
            <li>Dados de pagamento: processados pelo suboperador de cobrança (Asaas), não armazenamos cartão</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">Suboperadores</h2>
          <p>
            Para operar o serviço, podemos compartilhar dados estritamente necessários com os
            seguintes suboperadores (processadores):
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Groq</strong> — inferência de IA conversacional
              (conteúdo das mensagens do atendimento, sem dados de pagamento).
            </li>
            <li>
              <strong className="text-foreground">Google (Gemini)</strong> — IA de fallback quando o
              provedor principal estiver indisponível (mesmo tipo de conteúdo).
            </li>
            <li>
              <strong className="text-foreground">Asaas</strong> — cobrança de assinaturas e
              gestão de pagamentos da conta contratante.
            </li>
            <li>
              <strong className="text-foreground">Supabase / PostgreSQL hospedado</strong> —
              armazenamento do banco de dados da aplicação (multi-tenant).
            </li>
            <li>
              <strong className="text-foreground">Infraestrutura de hospedagem (VPS/cloud)</strong> —
              execução de containers, logs técnicos e backups operacionais.
            </li>
          </ul>
          <p>
            Cada suboperador trata dados apenas para a finalidade indicada e sob obrigações
            contratuais de confidencialidade e segurança compatíveis com a LGPD, quando aplicável.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Direitos do titular</h2>
          <p>
            Acesso, correção, exclusão e portabilidade podem ser solicitados à empresa responsável
            pelo atendimento ou, quando aplicável, via canais de suporte do produto.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Retenção</h2>
          <p>
            O período de retenção de histórico de mensagens pode variar conforme o plano contratado.
            Após cancelamento, dados podem ser excluídos ou anonimizados conforme política operacional.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Contato</h2>
          <p>
            Dúvidas sobre privacidade: utilize o canal de suporte indicado no painel ou o e-mail
            de contato da empresa prestadora do JARVIS.
          </p>
        </div>
      </div>
    </div>
  );
}

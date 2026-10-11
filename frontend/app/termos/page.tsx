import Link from "next/link";

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="text-sm text-primary hover:underline">← Voltar</Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 10 de outubro de 2026</p>
        <div className="prose prose-invert mt-8 space-y-4 text-sm text-muted-foreground">
          <p>
            Ao utilizar o JARVIS Comercial (“Serviço”), você concorda com estes Termos.
            O Serviço é uma plataforma multiempresa de atendimento e funil de conversão no WhatsApp com apoio de inteligência artificial.
          </p>
          <h2 className="text-lg font-semibold text-foreground">1. Conta e elegibilidade</h2>
          <p>Você é responsável por manter a confidencialidade das credenciais e por toda atividade na sua conta e empresas vinculadas.</p>
          <h2 className="text-lg font-semibold text-foreground">2. Planos e pagamento</h2>
          <p>Recursos podem variar conforme o plano (Trial, Prata, Gold, Diamante). Limites de uso são aplicados conforme a assinatura vigente. O não pagamento pode resultar em restrição de funcionalidades.</p>
          <h2 className="text-lg font-semibold text-foreground">3. Uso aceitável</h2>
          <p>É proibido usar o Serviço para spam, fraude, conteúdo ilegal ou violação de políticas do WhatsApp/Meta. O uso do conector WhatsApp deve respeitar as regras da plataforma.</p>
          <h2 className="text-lg font-semibold text-foreground">4. Dados e privacidade</h2>
          <p>O tratamento de dados pessoais segue nossa Política de Privacidade e a LGPD. Cada empresa (tenant) possui isolamento lógico de dados.</p>
          <h2 className="text-lg font-semibold text-foreground">5. Limitação de responsabilidade</h2>
          <p>O Serviço é fornecido “como está”. Respostas de IA podem conter imprecisões; o handoff humano deve ser usado quando necessário.</p>
          <h2 className="text-lg font-semibold text-foreground">6. Contato</h2>
          <p>Dúvidas: suporte disponível no painel do produto.</p>
        </div>
      </div>
    </div>
  );
}

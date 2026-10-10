"use client";

import Link from "next/link";
import { Bot } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#67e8f9] shadow-lg shadow-[#00d4aa]/30">
              <Bot className="h-5 w-5 text-[#0a0e17]" />
            </div>
            <span className="text-base font-extrabold tracking-tight">JARVIS</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#diferenciais" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Diferenciais</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <Link href="/planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Entrar</Link>
            <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_8px_#00d4aa]" />
            Mais de 500 empresas já vendem com o JARVIS
          </div>
          <h1 className="mb-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Atendimento e vendas no WhatsApp
            <br />
            <span className="bg-gradient-to-r from-[#00d4aa] to-[#67e8f9] bg-clip-text text-transparent">
              com IA que fecha negócio
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Funil automático, score de lead, handoff humano e multi-empresa — do
            primeiro "oi" até o fechamento, sem perder nenhum cliente no caminho.
          </p>
          <div className="mb-4 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30">
              Começar grátis por 14 dias →
            </Link>
            <Link href="/planos" className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors">
              Ver planos
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong className="text-primary">Sem cartão de crédito</strong> · Cancele quando quiser · Suporte em português
          </p>

          {/* Dashboard mockup */}
          <div className="relative mx-auto mt-16 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="mb-5 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MockStat label="Conversas" value="1.247" />
                <MockStat label="Vendas hoje" value="R$ 12.480" color="text-[#00d4aa]" />
                <MockStat label="Score médio" value="72" color="text-amber-400" />
                <MockStat label="Precisa humano" value="8" color="text-[#67e8f9]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="border-y border-border px-6 py-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Usado por times de venda em todo o Brasil
          </p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50">
            <span className="text-lg font-bold tracking-tight text-muted-foreground">TechBr</span>
            <span className="text-lg font-bold tracking-tight text-muted-foreground">VendeMais</span>
            <span className="text-lg font-bold tracking-tight text-muted-foreground">ComércioX</span>
            <span className="text-lg font-bold tracking-tight text-muted-foreground">LojaDigital</span>
            <span className="text-lg font-bold tracking-tight text-muted-foreground">MultiShop</span>
          </div>
        </div>
      </div>

      {/* Problem */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            tag="O problema"
            title="Você perde vendas todos os dias sem perceber"
            subtitle="Toda conversa não respondida em 5 minutos é uma venda que vai pro concorrente."
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <ProblemCard icon="⏰" title="Demora na resposta" desc="Lead manda mensagem às 22h, você responde às 9h do dia seguinte. Ele já comprou de outro." />
            <ProblemCard icon="📉" title="Sem follow-up" desc="50% dos leads somem porque ninguém lembrou de mandar a segunda mensagem." />
            <ProblemCard icon="🤯" title="Time sobrecarregado" desc="Vendedor gasta 70% do tempo respondendo as mesmas perguntas básicas." />
            <ProblemCard icon="📊" title="Zero visibilidade" desc="Você não sabe quantos leads entraram, quantos viraram venda, nem onde trava." />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            tag="Recursos"
            title="Tudo que seu time precisa em um só lugar"
            subtitle="Não é só chatbot. É uma plataforma completa de vendas."
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Feature icon="🤖" title="IA conversacional" desc="Responde em segundos, 24/7. Aprende com seu produto e fala como você." />
            <Feature icon="🎯" title="Funil automático" desc="Lead se move pelas etapas sozinho, com base no score. Sem arrastar card." />
            <Feature icon="📊" title="Score inteligente" desc="Cada lead recebe uma pontuação. Seu time foca só nos que estão prontos pra comprar." />
            <Feature icon="🙋" title="Handoff humano" desc="Quando a IA trava, avisa seu time. Cliente não fica esperando." />
            <Feature icon="👥" title="Multi-empresa" desc="Cada empresa tem seus dados isolados. Ideal para agências e franquias." />
            <Feature icon="💬" title="Suporte integrado" desc="Chat direto com nosso time, dentro do painel. Sem abrir ticket em outro lugar." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader tag="Como funciona" title="Do zero ao primeiro lead em 5 minutos" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Step num={1} title="Crie sua conta" desc="Cadastro grátis, sem cartão. Sua empresa é criada automaticamente." />
            <Step num={2} title="Conecte o WhatsApp" desc="Escaneie o QR Code. Leva menos de 30 segundos." />
            <Step num={3} title="Configure o prompt" desc="Diga pra IA como falar. Ela já começa a responder na hora." />
            <Step num={4} title="Receba leads" desc="Cada conversa entra no funil, recebe score e é acompanhada por você." />
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section id="diferenciais" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader tag="Por que JARVIS" title="O que nos diferencia dos outros" />
          <div className="grid gap-6 md:grid-cols-3">
            <DiffCard
              title={<>Não é só <span className="text-[#00d4aa]">chatbot</span></>}
              desc="Chatbot responde. JARVIS vende. Funil, score e handoff são nativos."
              items={["Funil com 7 etapas configuráveis", "Score automático por comportamento", "Handoff humano quando precisa"]}
            />
            <DiffCard
              title={<>Multi-empresa <span className="text-[#00d4aa]">de verdade</span></>}
              desc="Isolamento completo de dados. Cada tenant vê só o que é seu."
              items={["Comprovado com testes automatizados", "Prompt personalizado por empresa", "Suporte a N números de WhatsApp"]}
            />
            <DiffCard
              title={<>IA com <span className="text-[#00d4aa]">fallback</span></>}
              desc="Se um provedor cair, outro assume. Seu bot nunca para de responder."
              items={["Groq como primário (rápido)", "Gemini como backup", "FallbackMessage configurável"]}
            />
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader tag="Depoimentos" title="Quem usa, recomenda" />
          <div className="grid gap-6 md:grid-cols-3">
            <Testimonial text="Aumentei minhas vendas em 40% no primeiro mês. O bot qualifica e eu só fecho." name="Renan S." role="Dono da VendeMais" initials="RS" />
            <Testimonial text="Minha equipe parou de responder pergunta repetida. Agora foca em fechar." name="Leilane M." role="Gerente Comercial" initials="LM" />
            <Testimonial text="Testei 5 concorrentes. O JARVIS foi o único com multi-empresa de verdade." name="Fabrício A." role="Agência Digital" initials="FA" />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-[#67e8f9]/5 px-10 py-16 text-center">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Planos que crescem com você</h2>
          <p className="mx-auto mb-8 max-w-lg text-sm text-muted-foreground">Comece grátis. Escolha o plano quando fizer sentido.</p>
          <Link href="/planos" className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Ver planos completos →
          </Link>
          <div className="mt-8 flex flex-wrap justify-center gap-5">
            <MiniPlan name="Prata" price="99" />
            <MiniPlan name="Gold" price="299" highlight />
            <MiniPlan name="Diamante" price="999" cyan />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <SectionHeader tag="Dúvidas frequentes" title="Perguntas e respostas" />
          <div className="space-y-3">
            <Faq q="Preciso saber programar para usar?" a="Não. Tudo é feito pelo painel. Conectar WhatsApp, configurar o prompt e ver os leads são cliques." />
            <Faq q="Funciona com meu número atual do WhatsApp?" a="Sim. Qualquer número que use WhatsApp normal pode ser conectado. Basta escanear o QR Code." />
            <Faq q="O que acontece se eu atingir o limite do plano?" a="Você recebe um aviso. Não paramos de responder — te avisamos e você decide fazer upgrade ou não." />
            <Faq q="Posso cancelar quando quiser?" a="Sim. Sem multa, sem burocracia. Você cancela direto no painel." />
            <Faq q="A IA pode errar?" a="Pode. Por isso existe o handoff: quando a IA não sabe, ela avisa seu time para assumir a conversa." />
            <Faq q="Meus dados estão seguros?" a="Sim. Cada empresa tem seus dados isolados. Nenhum tenant vê informação de outro." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-y border-border bg-gradient-to-br from-primary/10 to-[#67e8f9]/5 px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto para vender mais no WhatsApp?</h2>
          <p className="mx-auto mb-8 max-w-lg text-sm text-muted-foreground">Comece grátis em 5 minutos. Sem cartão, sem compromisso.</p>
          <Link href="/register" className="inline-flex rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90">
            Criar minha conta grátis →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#67e8f9]">
                  <Bot className="h-4 w-4 text-[#0a0e17]" />
                </div>
                <span className="text-sm font-extrabold tracking-tight">JARVIS</span>
              </div>
              <p className="max-w-xs text-xs text-muted-foreground">Atendimento e funil de vendas no WhatsApp, multi-empresa, com IA e painel.</p>
            </div>
            <FooterCol title="Produto" links={[["Recursos", "#features"], ["Planos", "/planos"], ["Como funciona", "#como-funciona"], ["Começar grátis", "/register"]]} />
            <FooterCol title="Suporte" links={[["FAQ", "#faq"], ["Entrar", "/login"], ["Contato", "#"], ["Status", "#"]]} />
            <FooterCol title="Legal" links={[["Termos de uso", "#"], ["Privacidade", "#"], ["LGPD", "#"]]} />
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
            <div>© 2026 JARVIS Comercial. Todos os direitos reservados.</div>
            <div className="flex gap-5">
              <a href="#" className="hover:text-primary transition-colors">Instagram</a>
              <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-primary transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Componentes auxiliares
// ═══════════════════════════════════════════════════════════

function MockStat({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 text-left">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function SectionHeader({ tag, title, subtitle }: { tag: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-14 text-center">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00d4aa]">{tag}</div>
      <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mx-auto max-w-xl text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ProblemCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border border-l-[3px] border-l-red-500/60 bg-card p-6">
      <h3 className="mb-2 text-base font-semibold">
        <span className="mr-2">{icon}</span>{title}
      </h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-card/80">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-xl">{icon}</div>
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00d4aa] to-[#67e8f9] text-lg font-extrabold text-[#0a0e17] shadow-lg shadow-primary/30">
        {num}
      </div>
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function DiffCard({ title, desc, items }: { title: React.ReactNode; desc: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-background p-7">
      <h3 className="mb-3 text-xl font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <ul className="mt-4 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0 font-bold text-[#00d4aa]">✓</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Testimonial({ text, name, role, initials }: { text: string; name: string; role: string; initials: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <p className="mb-5 text-sm italic text-foreground">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00d4aa] to-[#67e8f9] text-xs font-bold text-[#0a0e17]">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
      </div>
    </div>
  );
}

function MiniPlan({ name, price, highlight, cyan }: { name: string; price: string; highlight?: boolean; cyan?: boolean }) {
  const border = highlight ? "border-amber-500" : cyan ? "border-[#67e8f9]" : "border-border";
  const color = highlight ? "text-amber-400" : cyan ? "text-[#67e8f9]" : "text-foreground";
  return (
    <div className={`min-w-[150px] rounded-xl border ${border} bg-card px-6 py-5`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{name}</div>
      <div className={`mt-1 text-2xl font-extrabold ${color}`}>
        <span className="text-xs text-muted-foreground">R$ </span>{price}
        <span className="text-xs text-muted-foreground"> /mês</span>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-semibold">
        {q}
        <span className="text-lg text-primary transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="px-6 pb-5 text-sm text-muted-foreground">{a}</div>
    </details>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2">
        {links.map(([label, href], i) => (
          <li key={i}>
            {href.startsWith("/") ? (
              <Link href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{label}</Link>
            ) : (
              <a href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
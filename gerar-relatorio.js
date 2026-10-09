const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, PageBreak
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: '2E4057' };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, ...opts })] });
}
function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text, bold, size: 20, font: 'Arial' })]
  });
}
function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    children: [new TextRun({ text, size: 20, font: 'Arial' })]
  });
}
function space() {
  return new Paragraph({ children: [new TextRun('')] });
}
function badge(text, fill) {
  return new TableCell({
    borders, width: { size: 1600, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 16, font: 'Arial' })] })]
  });
}

function fileTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1000, 1000, 1000, 3960],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['Arquivo', 'Linhas', 'Complexidade', 'Status', 'Responsabilidade'].map((t, i) => {
          const ws = [2400, 1000, 1000, 1000, 3960][i];
          return new TableCell({
            borders: headerBorders,
            shading: { fill: '2E4057', type: ShadingType.CLEAR },
            width: { size: ws, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, bold: true, color: 'FFFFFF', size: 18 })] })]
          });
        })
      }),
      ...rows.map(([file, lines, complexity, status, role]) => {
        const statusColors = { 'Estável': 'D5E8D4', 'Atenção': 'FFE6CC', 'Crítico': 'F8CECC', 'Simples': 'DAE8FC' };
        const complexityColors = { 'Baixa': 'D5E8D4', 'Média': 'FFE6CC', 'Alta': 'F8CECC' };
        return new TableRow({
          children: [
            new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: file, bold: true, size: 17, font: 'Courier New', color: '1A252F' })] })] }),
            new TableCell({ borders, width: { size: 1000, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: lines, size: 18, font: 'Arial' })] })] }),
            new TableCell({ borders, width: { size: 1000, type: WidthType.DXA }, shading: { fill: complexityColors[complexity] || 'F5F5F5', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: complexity, bold: true, size: 17, font: 'Arial' })] })] }),
            new TableCell({ borders, width: { size: 1000, type: WidthType.DXA }, shading: { fill: statusColors[status] || 'F5F5F5', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: status, bold: true, size: 17, font: 'Arial' })] })] }),
            new TableCell({ borders, width: { size: 3960, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: role, size: 18, font: 'Arial' })] })] }),
          ]
        });
      })
    ]
  });
}

function analysisTable(items) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1600, 3880, 3880],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['Categoria', 'Estado Atual', 'Sugestão de Melhoria'].map((t, i) => {
          const ws = [1600, 3880, 3880][i];
          return new TableCell({
            borders: headerBorders,
            shading: { fill: '2E4057', type: ShadingType.CLEAR },
            width: { size: ws, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: 'FFFFFF', size: 18 })] })]
          });
        })
      }),
      ...items.map(([cat, current, suggestion, catColor]) => new TableRow({
        children: [
          new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, shading: { fill: catColor || 'EAF2FF', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: cat, bold: true, size: 17, font: 'Arial', color: '2E4057' })] })] }),
          new TableCell({ borders, width: { size: 3880, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: current, size: 18, font: 'Arial' })] })] }),
          new TableCell({ borders, width: { size: 3880, type: WidthType.DXA }, shading: { fill: 'F0FFF4', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: suggestion, size: 18, font: 'Arial' })] })] }),
        ]
      }))
    ]
  });
}

const files = [
  {
    name: 'engine/app.js',
    lines: 46,
    complexity: 'Baixa',
    status: 'Estável',
    role: 'Entry point da aplicação',
    description: 'Ponto de entrada do sistema. Inicializa Express, carrega variáveis de ambiente via dotenv, registra rotas e inicia o WhatsApp. Contém handlers globais para erros não capturados e shutdown gracioso.',
    strengths: [
      'dotenv.config() com path absoluto garante leitura correta do .env em qualquer diretório de execução',
      'Handlers de uncaughtException e unhandledRejection evitam crash silencioso',
      'Rota /health disponível para monitoramento externo',
      'Shutdown gracioso via SIGINT desconecta o WhatsApp antes de encerrar',
    ],
    issues: [
      'PORT hardcoded como fallback 3001 — conflita com o Next.js em dev',
      'Não há verificação de saúde do banco de dados no startup',
      'Ausência de middleware de rate limiting HTTP para a API REST',
    ],
    suggestions: [
      'Separar PORT do backend (ex: 3002) do frontend Next.js (3000/3001)',
      'Adicionar checagem de conectividade do DB no startup com aviso claro',
      'Implementar helmet() e express-rate-limit para segurança da API',
      'Adicionar variável APP_ENV (development/production) para logs diferenciados',
    ],
  },
  {
    name: 'engine/controllers/messageController.js',
    lines: 100,
    complexity: 'Alta',
    status: 'Atenção',
    role: 'Orquestra o fluxo de mensagens',
    description: 'Arquivo central do bot. Recebe mensagens do WhatsApp, verifica anti-spam, mantém contexto de conversa em memória, chama a IA e envia resposta com delay humanizado e indicador de digitação.',
    strengths: [
      'Delay humanizado calculado pelo tamanho da resposta (humanDelay)',
      'Indicador "digitando..." via sendPresenceUpdate antes de responder',
      'Contexto de conversa limitado a 20 mensagens evita overflow de tokens',
      'Fallback para botConfig.fallbackMessage se a IA retornar vazio',
      'Isolamento de erros por mensagem — um erro não derruba o loop',
    ],
    issues: [
      'Contexto de conversa armazenado apenas em memória (Map) — perdido ao reiniciar',
      'Sem rate limiting por usuário além do antiSpam básico',
      'Ausência de detecção de grupos — bot responde em grupos indiscriminadamente',
      'Não filtra números bloqueados (extrair_bloqueados.js existe mas não é integrado)',
      'humanDelay não leva em conta latência da IA — pode resultar em delay total muito longo',
    ],
    suggestions: [
      'Persistir contexto no PostgreSQL para sobreviver a reinicializações',
      'Integrar bloqueados.json para ignorar números na blacklist',
      'Adicionar flag para ignorar mensagens de grupos (remoteJid terminando em @g.us)',
      'Calcular humanDelay subtraindo o tempo já gasto na chamada à IA',
      'Adicionar métricas: tempo de resposta, taxa de fallback, etapa mais abandonada',
    ],
  },
  {
    name: 'engine/services/geminiService.js',
    lines: 106,
    complexity: 'Média',
    status: 'Estável',
    role: 'Provedor de IA com fallback duplo',
    description: 'Gerencia as chamadas aos provedores de IA. Usa Groq (llama-3.3-70b-versatile) como primário e Gemini (gemini-2.0-flash-exp) como fallback. O system prompt define personalidade, fluxo de vendas, área de atendimento e limites de resposta.',
    strengths: [
      'Fallback automático Groq → Gemini sem intervenção manual',
      'initGemini() valida as chaves antes de criar os clientes',
      'max_tokens=200 limita o tamanho das respostas da IA',
      'temperature=0.85 equilibra criatividade e coerência',
      'Delay de 150ms antes do Groq evita race conditions em burst',
    ],
    issues: [
      'System prompt hard-coded no arquivo JS — difícil de editar sem conhecimento técnico',
      'Modelo gemini-2.0-flash-exp é experimental — pode ser descontinuado sem aviso',
      'Sem retry automático em caso de erro de rede (timeout, 503)',
      'Sem cache de respostas para perguntas frequentes idênticas',
      'Ausência de logging de tokens consumidos para controle de custo',
    ],
    suggestions: [
      'Mover o system prompt para bot_volumetrao.json e carregá-lo dinamicamente',
      'Implementar retry com backoff exponencial (3 tentativas, 1s/2s/4s)',
      'Adicionar cache com TTL de 5min para respostas de perguntas frequentes (cacheService já existe)',
      'Trocar gemini-2.0-flash-exp por gemini-1.5-flash (estável) ou aguardar GA',
      'Logar tokens usados por chamada para monitorar custo mensal',
    ],
  },
  {
    name: 'engine/services/whatsappService.js',
    lines: 83,
    complexity: 'Média',
    status: 'Estável',
    role: 'Conexão e eventos do WhatsApp',
    description: 'Gerencia a conexão com WhatsApp via Baileys. Exibe QR code no terminal, salva sessão em auth_info_jarvis/, reconecta automaticamente com delay de 5s e processa mensagens recebidas.',
    strengths: [
      'fetchLatestBaileysVersion() garante compatibilidade com o protocolo atual do WA',
      'Logger pino silencioso elimina o erro "Cannot read level" do Baileys',
      'Reconexão com setTimeout(5000) evita loop de reconexão agressivo',
      'Ignora mensagens próprias, status@broadcast e mensagens sem texto',
      'Suporte a caption de imagens além de texto simples',
    ],
    issues: [
      'Sem limite de tentativas de reconexão — reconecta indefinidamente mesmo em ban',
      'QR code exibido apenas no terminal — difícil em servidores sem interface',
      'Sessão armazenada em disco local — não funciona em ambientes multi-instância',
      'Sem detecção de ban do número (código 401/403)',
      'Sem notificação quando o QR expira e precisa ser reescaneado',
    ],
    suggestions: [
      'Adicionar contador de reconexões e parar após 10 tentativas consecutivas (possível ban)',
      'Gerar QR como imagem PNG e expor via endpoint GET /qr para acesso remoto',
      'Para multi-instância: usar Redis ou S3 para armazenar credenciais da sessão',
      'Detectar código 401 e enviar alerta (email/webhook) ao administrador',
      'Implementar webhook de status para notificar conexão/desconexão externamente',
    ],
  },
  {
    name: 'engine/models/database.js',
    lines: 145,
    complexity: 'Média',
    status: 'Estável',
    role: 'Camada de acesso ao PostgreSQL',
    description: 'Gerencia o pool de conexões PostgreSQL com lazy initialization. Cria as tabelas conversations, sales e messages automaticamente no startup. Todas as operações falham silenciosamente para não derrubar o bot.',
    strengths: [
      'Lazy initialization — não falha se DATABASE_URL não estiver configurado',
      'SSL configurado para Railway/Supabase (rejectUnauthorized: false)',
      'pool.on("error") captura erros assíncronos do pg',
      'initDb() idempotente com CREATE TABLE IF NOT EXISTS',
      'Degradação graciosa — bot funciona sem banco de dados',
    ],
    issues: [
      'Tabela conversations não tem UNIQUE constraint em phone — ON CONFLICT não funciona',
      'Sem índices nas colunas phone — queries lentas com volume alto',
      'Sem paginação em getMessages() — pode retornar volume alto sem controle',
      'Senhas e connection string visíveis em logs de erro',
      'Sem migrations versionadas — difícil evoluir o schema',
    ],
    suggestions: [
      'Adicionar UNIQUE(phone) na tabela conversations para o ON CONFLICT funcionar',
      'Criar índices: CREATE INDEX idx_messages_phone ON messages(phone)',
      'Implementar migrations com uma ferramenta como node-pg-migrate',
      'Usar variável de ambiente separada para SSL (DB_SSL=true/false)',
      'Adicionar função de health check do banco para o endpoint /health',
    ],
  },
  {
    name: 'engine/middlewares/antiSpam.js',
    lines: 41,
    complexity: 'Baixa',
    status: 'Estável',
    role: 'Rate limiting por remetente',
    description: 'Limita mensagens por remetente usando janela deslizante de 10 segundos com máximo de 5 mensagens. Limpeza automática de entradas antigas a cada 60 segundos para evitar vazamento de memória.',
    strengths: [
      'Janela deslizante correta com reset automático',
      'Limpeza periódica de entradas antigas evita crescimento infinito do Map',
      'Leve e sem dependências externas',
    ],
    issues: [
      'Configurações WINDOW_MS e MAX_MESSAGES hard-coded',
      'Sem distinção entre grupos e contatos individuais',
      'Não persiste entre reinicializações — usuário bloqueado é liberado ao reiniciar',
      'Sem log de quem foi bloqueado e por quanto tempo',
    ],
    suggestions: [
      'Mover constantes para variáveis de ambiente (SPAM_WINDOW_MS, SPAM_MAX_MSGS)',
      'Grupos merecem limite maior (ex: 20 msgs/10s) por ter múltiplos usuários',
      'Adicionar lista de whitelist para nunca bloquear números VIP',
      'Logar número bloqueado com timestamp para análise de comportamento',
    ],
  },
  {
    name: 'engine/utils/intentDetector.js',
    lines: 38,
    complexity: 'Baixa',
    status: 'Estável',
    role: 'Detecção de intenção por palavras-chave',
    description: 'Detecta intenção do usuário (compra, preço, sim, não) via matching de palavras-chave carregadas do bot_volumetrao.json. Retorna string de intent ou "desconhecido".',
    strengths: [
      'Carrega palavras-chave do bot_volumetrao.json — fonte única de verdade',
      'Fallback embutido caso o arquivo não seja encontrado',
      'Simples, rápido e sem dependências',
    ],
    issues: [
      'Matching por includes() — "não quero" pode triggar intent "quero"',
      'Sem suporte a variações com acentos (ex: "preço" vs "preco")',
      'Não detecta intenção em mensagens longas com múltiplos assuntos',
      'Ordem de verificação das intents pode causar falso positivo',
    ],
    suggestions: [
      'Usar regex com word boundary (\\b) para evitar matching parcial',
      'Normalizar texto: remover acentos e converter para minúsculas antes do match',
      'Priorizar intent negativa ("não") antes das positivas para evitar falso positivo',
      'Considerar delegar detecção de intent para a própria IA em casos ambíguos',
    ],
  },
  {
    name: 'engine/utils/logger.js',
    lines: 20,
    complexity: 'Baixa',
    status: 'Estável',
    role: 'Sistema de logs com níveis',
    description: 'Logger simples com suporte a 4 níveis (error, warn, info, debug) controlados por variável de ambiente LOG_LEVEL. Adiciona timestamp ISO em cada linha.',
    strengths: [
      'LOG_LEVEL via env permite ajuste em produção sem código',
      'Timestamp ISO em todos os logs facilita correlação de eventos',
      'Níveis corretos: error → stderr, demais → stdout',
    ],
    issues: [
      'Logs vão apenas para console — sem persistência em arquivo ou serviço externo',
      'Sem formatação JSON estruturada para ingestão em ferramentas como Datadog/Loki',
      'Sem campo de correlação (requestId/sessionId) para rastrear fluxo de uma conversa',
    ],
    suggestions: [
      'Adicionar opção de salvar logs em arquivo com rotação diária (winston ou pino)',
      'Adicionar campo phone no log de mensagens para facilitar busca por usuário',
      'Considerar migrar para pino em produção (já é dependência do Baileys)',
    ],
  },
  {
    name: 'engine/utils/fileHandler.js',
    lines: 31,
    complexity: 'Baixa',
    status: 'Estável',
    role: 'Utilitário de leitura/escrita de arquivos',
    description: 'Abstração para leitura e escrita de arquivos JSON e texto. Cria diretórios automaticamente e retorna null em vez de lançar exceção quando arquivo não existe.',
    strengths: [
      'readJson() retorna null em vez de throw — tratamento seguro',
      'writeJson() cria diretórios pai com mkdirSync recursive',
      'Interface simples e sem dependências externas',
    ],
    issues: [
      'Sem tratamento de erro em writeJson() — falha silenciosa em disco cheio',
      'Sem suporte a leitura assíncrona — bloqueia o event loop em arquivos grandes',
      'appendLine() não garante atomicidade em escritas concorrentes',
    ],
    suggestions: [
      'Converter para versões async (fs.promises) para não bloquear o event loop',
      'Adicionar try/catch em writeJson() com log de erro em caso de falha de disco',
      'Para logs concorrentes, usar um stream de escrita em vez de appendFileSync',
    ],
  },
  {
    name: 'engine/models/memoryModel.js',
    lines: 50,
    complexity: 'Baixa',
    status: 'Atenção',
    role: 'Persistência de contexto em arquivo',
    description: 'Armazena memória de conversas em arquivo JSON local (data/memory.json). Permite salvar, recuperar e deletar contexto por número de telefone.',
    strengths: [
      'deleteUserMemory() para limpeza de contexto',
      'updatedAt incluído em cada entrada para rastreamento',
      'Caminho resolvido com path.resolve() para consistência',
    ],
    issues: [
      'Lê e escreve o arquivo JSON inteiro a cada operação — ineficiente com muitos usuários',
      'Sem lock de arquivo — escritas concorrentes podem corromper o JSON',
      'Duplica funcionalidade do contexto em memória do messageController',
      'Arquivo pode crescer indefinidamente sem limpeza automática',
    ],
    suggestions: [
      'Substituir por persistência no PostgreSQL (database.js já tem a estrutura)',
      'Se mantiver arquivo, implementar locking com pacote proper-lockfile',
      'Consolidar com o Map do messageController — uma fonte de verdade para contexto',
      'Adicionar TTL por entrada e limpeza automática de sessões antigas',
    ],
  },
  {
    name: 'engine/services/cacheService.js',
    lines: 41,
    complexity: 'Baixa',
    status: 'Simples',
    role: 'Cache in-memory com TTL',
    description: 'Cache em memória com suporte a TTL por chave. Limpeza automática de entradas expiradas a cada 60 segundos. Funções: set(), get(), del().',
    strengths: [
      'TTL real implementado com expiresAt por chave',
      'Limpeza periódica evita crescimento infinito',
      'Interface simples: set/get/del',
    ],
    issues: [
      'Não está sendo utilizado em nenhum lugar do sistema ainda',
      'Sem suporte a namespace ou prefixo de chaves',
      'Não persiste entre reinicializações — cache sempre frio ao iniciar',
    ],
    suggestions: [
      'Integrar no geminiService para cachear respostas de perguntas frequentes',
      'Usar para cachear o system prompt compilado e evitar reprocessamento a cada mensagem',
      'Adicionar método keys() para listar entradas ativas (útil para debug)',
    ],
  },
  {
    name: 'engine/services/salesService.js',
    lines: 21,
    complexity: 'Baixa',
    status: 'Simples',
    role: 'Helpers de detecção de intenção de venda',
    description: 'Exporta isPurchaseIntent() e isPriceIntent() delegando para intentDetector. Arquivo muito pequeno com responsabilidade mínima.',
    strengths: [
      'Separa semântica de vendas da lógica de detecção de palavras-chave',
      'Fácil de expandir com novas intents de venda',
    ],
    issues: [
      'Não é utilizado diretamente — messageController chama intentDetector direto',
      'Duas funções poderiam estar no próprio intentDetector',
    ],
    suggestions: [
      'Expandir com lógica de qualificação de lead (lead quente/frio baseado no histórico)',
      'Adicionar detectClosingIntent() para detectar quando cliente quer encerrar conversa',
      'Ou fundir com intentDetector se não crescer em responsabilidade',
    ],
  },
  {
    name: 'engine/routes/etiquetas.js',
    lines: 55,
    complexity: 'Baixa',
    status: 'Simples',
    role: 'API REST de etiquetas de conversa',
    description: 'Router Express com três endpoints: GET /etiquetas (lista etiquetas), POST /etiquetas/aplicar e DELETE /etiquetas/remover. Ainda sem persistência real — apenas loga a operação.',
    strengths: [
      'Validação básica de body com retorno 400 em campos ausentes',
      'Estrutura de etiquetas bem definida com id, label e cor',
    ],
    issues: [
      'Operações não persistem — aplicar/remover etiqueta não salva em lugar nenhum',
      'Sem autenticação nos endpoints — qualquer um pode chamar a API',
      'Sem integração com a API de etiquetas do WhatsApp Business',
      'Sem endpoint para listar etiquetas de um número específico',
    ],
    suggestions: [
      'Criar tabela etiquetas no PostgreSQL e persistir as operações',
      'Adicionar autenticação por API key no header (Authorization: Bearer)',
      'Integrar com WhatsApp Business API quando disponível no Baileys',
      'Adicionar GET /etiquetas/:phone para listar etiquetas de um contato',
    ],
  },
  {
    name: 'engine/jobs/cleanupJob.js',
    lines: 35,
    complexity: 'Baixa',
    status: 'Estável',
    role: 'Limpeza periódica de arquivos antigos',
    description: 'Remove arquivos na pasta /data com mais de 7 dias. Executa no startup e agenda execução diária via setInterval.',
    strengths: [
      'Verifica existência do diretório antes de listar',
      'Loga quantidade de arquivos removidos',
      'Executa no startup e diariamente de forma automática',
    ],
    issues: [
      'setInterval em processo Node não é confiável para jobs de longa duração',
      'Sem log de quais arquivos foram removidos',
      'Sem tratamento de erro para falhas de permissão de arquivo',
    ],
    suggestions: [
      'Usar node-cron para agendamento mais confiável (cron: "0 3 * * *")',
      'Logar nome dos arquivos removidos para auditoria',
      'Adicionar try/catch por arquivo para continuar mesmo se um falhar',
    ],
  },
  {
    name: 'bot_volumetrao.json',
    lines: 98,
    complexity: 'Baixa',
    status: 'Estável',
    role: 'Configuração do bot e base de conhecimento',
    description: 'Arquivo de configuração central do bot Rodrigo. Define system prompt, fluxo de 8 etapas, 12 Q&As, regras de objeção, palavras-chave e mensagens de sucesso/fallback.',
    strengths: [
      'Fonte única de verdade para comportamento do bot',
      'Editável sem conhecimento técnico de JavaScript',
      'Estrutura clara separando fluxo, Q&A e objeções',
    ],
    issues: [
      'System prompt duplicado entre este arquivo e geminiService.js',
      'Sem versionamento do fluxo — difícil fazer A/B testing',
      'Preços hard-coded (R$139, R$159) — precisam ser atualizados manualmente',
      'Sem validação de schema — erro de digitação no JSON quebra o bot inteiro',
    ],
    suggestions: [
      'Remover system prompt do geminiService.js e usar apenas este arquivo',
      'Mover preços para config.json que já existe',
      'Adicionar validação de schema com ajv no startup para detectar erros cedo',
      'Versionar o arquivo para suportar A/B testing de fluxos',
    ],
  },
];

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, font: 'Arial', color: '1A252F' }, paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E75B6', space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: 'Arial', color: '2E4057' }, paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: 'Arial', color: '2E75B6' }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' } }, children: [new TextRun({ text: 'JarvisPronto — Relatório de Engenharia de Software  ', size: 16, color: '7F8C8D', font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '7F8C8D', font: 'Arial' })] })] })
    },
    children: [
      // CAPA
      space(), space(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'JARVISPRONTO', bold: true, size: 52, font: 'Arial', color: '1A252F' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Relatório de Engenharia de Software', size: 28, font: 'Arial', color: '2E75B6' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'Análise do Estado Atual e Recomendações de Melhoria', size: 22, font: 'Arial', color: '7F8C8D', italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: `Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, size: 18, font: 'Arial', color: '95A5A6' })] }),
      space(),

      // RESUMO EXECUTIVO
      h1('1. Resumo Executivo'),
      p('O JarvisPronto é um bot de vendas para WhatsApp construído com Node.js. O sistema integra a biblioteca Baileys para comunicação com WhatsApp, dois provedores de IA (Groq e Gemini) com fallback automático, um banco de dados PostgreSQL para persistência, e um frontend Next.js. O engine de backend totaliza 939 linhas distribuídas em 15 arquivos.', { size: 20 }),
      space(),
      p('Estado geral do sistema:', { bold: true, size: 20 }),
      space(),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 2340, 2340],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, shading: { fill: 'D5E8D4', type: ShadingType.CLEAR }, width: { size: 2340, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '✅ Funcional', bold: true, size: 20, font: 'Arial', color: '27AE60' })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'WhatsApp + IA', size: 18, font: 'Arial', color: '27AE60' })] })] }),
            new TableCell({ borders, shading: { fill: 'D5E8D4', type: ShadingType.CLEAR }, width: { size: 2340, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '✅ Operacional', bold: true, size: 20, font: 'Arial', color: '27AE60' })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PM2 + PostgreSQL', size: 18, font: 'Arial', color: '27AE60' })] })] }),
            new TableCell({ borders, shading: { fill: 'FFE6CC', type: ShadingType.CLEAR }, width: { size: 2340, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '⚠️ Atenção', bold: true, size: 20, font: 'Arial', color: 'E67E22' })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Contexto em memória', size: 18, font: 'Arial', color: 'E67E22' })] })] }),
            new TableCell({ borders, shading: { fill: 'F8CECC', type: ShadingType.CLEAR }, width: { size: 2340, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '🔴 Pendente', bold: true, size: 20, font: 'Arial', color: 'E74C3C' })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Blacklist / Grupos', size: 18, font: 'Arial', color: 'E74C3C' })] })] }),
          ]})
        ]
      }),
      space(),

      // MAPA DO SISTEMA
      h1('2. Mapa de Arquivos do Sistema'),
      p('Visão geral de todos os arquivos, complexidade e responsabilidade:'),
      space(),
      fileTable([
        ['engine/app.js', '46', 'Baixa', 'Estável', 'Entry point — Express + WA + IA'],
        ['controllers/messageController.js', '100', 'Alta', 'Atenção', 'Orquestra mensagens, contexto e IA'],
        ['services/geminiService.js', '106', 'Média', 'Estável', 'Provedores de IA Groq + Gemini'],
        ['services/whatsappService.js', '83', 'Média', 'Estável', 'Conexão WhatsApp via Baileys'],
        ['services/cacheService.js', '41', 'Baixa', 'Simples', 'Cache in-memory com TTL'],
        ['services/salesService.js', '21', 'Baixa', 'Simples', 'Helpers de intenção de venda'],
        ['models/database.js', '145', 'Média', 'Estável', 'Pool PostgreSQL + tabelas'],
        ['models/memoryModel.js', '50', 'Baixa', 'Atenção', 'Persistência de contexto em arquivo'],
        ['middlewares/antiSpam.js', '41', 'Baixa', 'Estável', 'Rate limiting por remetente'],
        ['utils/intentDetector.js', '38', 'Baixa', 'Estável', 'Detecção de intenção por keywords'],
        ['utils/logger.js', '20', 'Baixa', 'Estável', 'Logs com níveis e timestamp'],
        ['utils/fileHandler.js', '31', 'Baixa', 'Estável', 'Leitura/escrita de JSON e texto'],
        ['routes/etiquetas.js', '55', 'Baixa', 'Simples', 'API REST de etiquetas'],
        ['jobs/cleanupJob.js', '35', 'Baixa', 'Estável', 'Limpeza de arquivos antigos'],
        ['bot_volumetrao.json', '98', 'Baixa', 'Estável', 'Config do bot e base de conhecimento'],
      ]),
      space(),

      // ANÁLISE POR ARQUIVO
      h1('3. Análise Detalhada por Arquivo'),
      ...files.flatMap(f => [
        h2(`${f.name}`),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1800, 7560],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders, shading: { fill: 'F2F2F2', type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Responsabilidade', bold: true, size: 18, font: 'Arial' })] })] }),
              new TableCell({ borders, width: { size: 7560, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: f.role, size: 18, font: 'Arial' })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, shading: { fill: 'F2F2F2', type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Descrição', bold: true, size: 18, font: 'Arial' })] })] }),
              new TableCell({ borders, width: { size: 7560, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: f.description, size: 18, font: 'Arial' })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, shading: { fill: 'F2F2F2', type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Métricas', bold: true, size: 18, font: 'Arial' })] })] }),
              new TableCell({ borders, width: { size: 7560, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: `${f.lines} linhas  |  Complexidade: ${f.complexity}  |  Status: ${f.status}`, size: 18, font: 'Arial' })] })] }),
            ]}),
          ]
        }),
        space(),
        h3('Pontos Fortes'),
        ...f.strengths.map(s => bullet(s)),
        space(),
        h3('Problemas Identificados'),
        ...f.issues.map(i => bullet(i)),
        space(),
        h3('Sugestões de Melhoria'),
        ...f.suggestions.map((s, idx) => numbered(`${s}`)),
        space(), space(),
      ]),

      // ANÁLISE TRANSVERSAL
      new Paragraph({ children: [new PageBreak()] }),
      h1('4. Análise Transversal de Engenharia'),
      space(),
      analysisTable([
        ['Segurança', 'Credenciais reais (API keys, DB password) encontradas no .env sem proteção adicional. API REST sem autenticação.', 'Rotacionar todas as chaves. Adicionar autenticação por API key. Usar variáveis de ambiente do servidor em produção.', 'F8CECC'],
        ['Persistência', 'Contexto de conversa armazenado em memória (Map) — perdido ao reiniciar. memoryModel.js duplica essa responsabilidade.', 'Persistir contexto no PostgreSQL. Consolidar em uma única fonte de verdade. Adicionar TTL de sessão.', 'FFE6CC'],
        ['Resiliência', 'Reconexão automática do WhatsApp implementada. Fallback Groq→Gemini funcional. Sem retry em erros de rede.', 'Adicionar retry com backoff exponencial na IA. Limitar tentativas de reconexão para detectar ban.', 'FFE6CC'],
        ['Observabilidade', 'Logs com timestamp e níveis. Sem métricas de negócio (taxa de conversão, tempo médio de resposta).', 'Implementar dashboard com métricas: mensagens/hora, taxa de conversão, etapa mais abandonada.', 'DAE8FC'],
        ['Escalabilidade', 'Contexto em memória impede múltiplas instâncias. Sessão WhatsApp local impede deploy em cloud.', 'Migrar contexto para Redis. Usar S3/Redis para credenciais WhatsApp. Containerizar com Docker.', 'EAF2FF'],
        ['Manutenibilidade', 'System prompt duplicado entre geminiService.js e bot_volumetrao.json. Preços hard-coded em dois lugares.', 'Usar bot_volumetrao.json como fonte única. Mover preços para config.json. Adicionar validação de schema.', 'D5E8D4'],
        ['Testes', 'Sem testes automatizados de nenhum tipo.', 'Adicionar testes unitários para intentDetector, antiSpam e database. Jest + supertest para a API REST.', 'E1D5E7'],
        ['CI/CD', 'Deploy manual — arquivos copiados manualmente ao servidor.', 'Configurar GitHub Actions para deploy automático ao push na branch main. Dockerizar o backend.', 'E1D5E7'],
      ]),
      space(),

      // ROADMAP
      h1('5. Roadmap de Melhorias'),
      space(),
      h2('Prioridade Alta — Imediato'),
      ...['Persistir contexto de conversa no PostgreSQL', 'Integrar blacklist (extrair_bloqueados.js já existe, falta integrar)', 'Ignorar mensagens de grupos (@g.us) para evitar respostas indevidas', 'Remover system prompt duplicado do geminiService.js', 'Adicionar UNIQUE constraint em conversations.phone no banco'].map(t => bullet(t, true)),
      space(),
      h2('Prioridade Média — Próximas 2 Semanas'),
      ...['Gerar QR code como imagem PNG via endpoint /qr para acesso remoto', 'Implementar retry com backoff exponencial nas chamadas à IA', 'Integrar cacheService no geminiService para perguntas frequentes', 'Adicionar autenticação por API key nos endpoints REST', 'Dashboard básico com métricas de conversas e vendas'].map(t => bullet(t)),
      space(),
      h2('Prioridade Baixa — Próximo Mês'),
      ...['Testes automatizados com Jest', 'Dockerizar o backend para deploy em cloud', 'Migrar contexto para Redis para suportar múltiplas instâncias', 'Configurar CI/CD com GitHub Actions', 'Implementar A/B testing de fluxos de venda'].map(t => bullet(t)),
      space(),

      // CONCLUSÃO
      h1('6. Conclusão'),
      p('O JarvisPronto está operacional e cumprindo sua função principal: atender clientes no WhatsApp com IA, seguir o fluxo de vendas do Rodrigo e registrar pedidos. A arquitetura é adequada para o estágio atual (MVP de um único vendedor).', { size: 20 }),
      space(),
      p('Os principais riscos para o crescimento são a perda de contexto ao reiniciar e a falta de filtragem de grupos/blacklist. Esses dois pontos devem ser resolvidos antes de escalar o volume de atendimentos.', { size: 20 }),
      space(),
      p('Com as melhorias de prioridade alta implementadas, o sistema estará pronto para atender centenas de conversas simultâneas de forma confiável.', { size: 20 }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
fs.writeFileSync('C:/Users/Usuario/Downloads/JarvisPronto_v1.1.0/Relatorio.docx', buffer);
  console.log('Relatório gerado com sucesso!');
});


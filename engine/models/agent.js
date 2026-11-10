const { query } = require('./database');

const TEMPLATES = {
  vendas: {
    name_suffix: 'Vendas',
    system_prompt: `Você é um especialista em vendas deste produto.
Objetivo: qualificar o interesse e fechar a venda de forma consultiva.
Regras:
- Nunca invente preço ou estoque
- Sempre confirme o produto antes de fechar
- Se não souber, encaminhe para um humano
- Seja objetivo, educado e persuasivo sem pressão`,
    welcome_message: 'Olá! Posso te ajudar com informações e condições deste produto.',
  },
  suporte: {
    name_suffix: 'Suporte',
    system_prompt: `Você é o suporte deste produto.
Objetivo: tirar dúvidas e resolver problemas com clareza.
Regras:
- Nunca invente informação técnica
- Se precisar de humano, diga e encaminhe
- Seja empático e objetivo`,
    welcome_message: 'Olá! Em que posso ajudar sobre este produto?',
  },
  qualificacao: {
    name_suffix: 'Qualificação',
    system_prompt: `Você qualifica leads interessados neste produto.
Faça perguntas curtas para entender necessidade, prazo e orçamento.
Não force a venda. Encaminhe para humano quando o lead estiver quente.`,
    welcome_message: 'Oi! Vou te fazer algumas perguntas rápidas para te atender melhor.',
  },
  pos_venda: {
    name_suffix: 'Pós-venda',
    system_prompt: `Você cuida do pós-venda deste produto.
Confirme satisfação, oriente uso e identifique oportunidades de recompra.
Se houver reclamação, encaminhe para humano.`,
    welcome_message: 'Olá! Como está sendo sua experiência com o produto?',
  },
  custom: {
    name_suffix: 'Assistente',
    system_prompt: `Você é o assistente deste produto. Responda com base no conhecimento fornecido. Nunca invente preço. Encaminhe para humano quando necessário.`,
    welcome_message: 'Olá! Como posso ajudar?',
  },
};

class Agent {
  static getTemplates() {
    return Object.keys(TEMPLATES).map((key) => ({
      key,
      ...TEMPLATES[key],
    }));
  }

  static async buildKnowledge(produtoId, companyId) {
    const result = await query(
      `SELECT id, nome, descricao, preco, estoque
       FROM produtos WHERE id = $1 AND company_id = $2`,
      [produtoId, companyId]
    );
    const p = result.rows[0];
    if (!p) return '';

    return `
# Conhecimento do Produto
- ID: ${p.id}
- Nome: ${p.nome}
- Descrição: ${p.descricao || 'Não informada'}
- Preço de venda: R$ ${Number(p.preco).toFixed(2)}
- Estoque atual: ${p.estoque ?? 0}

## Regras obrigatórias
- Nunca invente preço
- Nunca invente estoque
- Nunca dê desconto sem autorização explícita
- Sempre confirme o produto antes de fechar
- Se não souber a resposta, encaminhe para um atendente humano
`.trim();
  }

  static async findAll(companyId, { status, produto_id } = {}) {
    let sql = `
      SELECT a.*, p.nome as produto_nome, p.preco as produto_preco, p.estoque as produto_estoque
      FROM agents a
      JOIN produtos p ON p.id = a.produto_id
      WHERE a.company_id = $1
    `;
    const params = [companyId];
    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    if (produto_id) {
      params.push(produto_id);
      sql += ` AND a.produto_id = $${params.length}`;
    }
    sql += ' ORDER BY a.updated_at DESC';
    const result = await query(sql, params);
    return result.rows;
  }

  static async findById(id, companyId) {
    const result = await query(
      `SELECT a.*, p.nome as produto_nome, p.descricao as produto_descricao,
              p.preco as produto_preco, p.estoque as produto_estoque
       FROM agents a
       JOIN produtos p ON p.id = a.produto_id
       WHERE a.id = $1 AND a.company_id = $2`,
      [id, companyId]
    );
    const agent = result.rows[0];
    if (!agent) return null;

    const tools = await query(
      'SELECT tool_key, enabled, config FROM agent_tools WHERE agent_id = $1 ORDER BY tool_key',
      [id]
    );
    const channels = await query(
      'SELECT channel, enabled FROM agent_channels WHERE agent_id = $1 ORDER BY channel',
      [id]
    );
    agent.tools = tools.rows;
    agent.channels = channels.rows;
    agent.knowledge = await this.buildKnowledge(agent.produto_id, companyId);
    return agent;
  }

  static async findByProduto(produtoId, companyId) {
    const result = await query(
      'SELECT * FROM agents WHERE produto_id = $1 AND company_id = $2',
      [produtoId, companyId]
    );
    return result.rows[0] || null;
  }

  static async create(data, companyId, userId) {
    const {
      produto_id,
      name,
      description,
      template_key = 'custom',
      system_prompt,
      welcome_message,
      temperature = 0.7,
      model = 'gemini',
      tools = [],
      channels = ['whatsapp'],
    } = data;

    if (!produto_id) throw new Error('produto_id é obrigatório');

    const existing = await this.findByProduto(produto_id, companyId);
    if (existing) throw new Error('Já existe um agente para este produto');

    const prod = await query(
      'SELECT id, nome FROM produtos WHERE id = $1 AND company_id = $2',
      [produto_id, companyId]
    );
    if (!prod.rows[0]) throw new Error('Produto não encontrado');

    const tpl = TEMPLATES[template_key] || TEMPLATES.custom;
    const agentName = name || `${prod.rows[0].nome} — ${tpl.name_suffix}`;
    const knowledge = await this.buildKnowledge(produto_id, companyId);
    const finalPrompt = [
      system_prompt || tpl.system_prompt,
      '',
      knowledge,
    ].join('\n');

    const result = await query(
      `INSERT INTO agents
         (company_id, produto_id, name, description, status, template_key,
          system_prompt, welcome_message, temperature, model, version, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, 1, $10)
       RETURNING *`,
      [
        companyId,
        produto_id,
        agentName,
        description || null,
        template_key,
        finalPrompt,
        welcome_message || tpl.welcome_message,
        temperature,
        model,
        userId || null,
      ]
    );
    const agent = result.rows[0];

    const defaultTools = tools.length
      ? tools
      : [
          { tool_key: 'consultar_estoque', enabled: true },
          { tool_key: 'encaminhar_humano', enabled: true },
        ];

    for (const t of defaultTools) {
      await query(
        `INSERT INTO agent_tools (agent_id, tool_key, enabled, config)
         VALUES ($1, $2, $3, $4) ON CONFLICT (agent_id, tool_key) DO NOTHING`,
        [agent.id, t.tool_key, t.enabled !== false, JSON.stringify(t.config || {})]
      );
    }

    for (const ch of channels) {
      await query(
        `INSERT INTO agent_channels (agent_id, channel, enabled)
         VALUES ($1, $2, true) ON CONFLICT (agent_id, channel) DO NOTHING`,
        [agent.id, ch]
      );
    }

    await query(
      `INSERT INTO agent_versions (agent_id, version, system_prompt, welcome_message, tools_snapshot, created_by)
       VALUES ($1, 1, $2, $3, $4, $5)`,
      [agent.id, finalPrompt, welcome_message || tpl.welcome_message, JSON.stringify(defaultTools), userId || null]
    );

    return this.findById(agent.id, companyId);
  }

  static async update(id, data, companyId, userId) {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;

    const name = data.name ?? existing.name;
    const description = data.description !== undefined ? data.description : existing.description;
    const status = data.status ?? existing.status;
    const template_key = data.template_key ?? existing.template_key;
    let system_prompt = data.system_prompt !== undefined ? data.system_prompt : existing.system_prompt;
    const welcome_message = data.welcome_message !== undefined ? data.welcome_message : existing.welcome_message;
    const temperature = data.temperature !== undefined ? data.temperature : existing.temperature;
    const model = data.model ?? existing.model;

    // Refresh knowledge if requested or product context
    if (data.refresh_knowledge) {
      const knowledge = await this.buildKnowledge(existing.produto_id, companyId);
      // Keep user instructions, replace knowledge block
      const base = (system_prompt || '').split('# Conhecimento do Produto')[0].trim();
      system_prompt = `${base}\n\n${knowledge}`.trim();
    }

    const newVersion = Number(existing.version || 1) + 1;

    const result = await query(
      `UPDATE agents SET
         name = $1, description = $2, status = $3, template_key = $4,
         system_prompt = $5, welcome_message = $6, temperature = $7, model = $8,
         version = $9, updated_at = NOW()
       WHERE id = $10 AND company_id = $11
       RETURNING *`,
      [name, description, status, template_key, system_prompt, welcome_message, temperature, model, newVersion, id, companyId]
    );

    if (data.tools && Array.isArray(data.tools)) {
      await query('DELETE FROM agent_tools WHERE agent_id = $1', [id]);
      for (const t of data.tools) {
        await query(
          `INSERT INTO agent_tools (agent_id, tool_key, enabled, config) VALUES ($1, $2, $3, $4)`,
          [id, t.tool_key, t.enabled !== false, JSON.stringify(t.config || {})]
        );
      }
    }

    if (data.channels && Array.isArray(data.channels)) {
      await query('DELETE FROM agent_channels WHERE agent_id = $1', [id]);
      for (const ch of data.channels) {
        const channel = typeof ch === 'string' ? ch : ch.channel;
        const enabled = typeof ch === 'string' ? true : ch.enabled !== false;
        await query(
          `INSERT INTO agent_channels (agent_id, channel, enabled) VALUES ($1, $2, $3)`,
          [id, channel, enabled]
        );
      }
    }

    await query(
      `INSERT INTO agent_versions (agent_id, version, system_prompt, welcome_message, tools_snapshot, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, newVersion, system_prompt, welcome_message, JSON.stringify(data.tools || existing.tools || []), userId || null]
    );

    return this.findById(id, companyId);
  }

  static async publish(id, companyId, userId) {
    return this.update(id, { status: 'published' }, companyId, userId);
  }

  static async archive(id, companyId, userId) {
    return this.update(id, { status: 'archived' }, companyId, userId);
  }

  static async delete(id, companyId) {
    const result = await query(
      'DELETE FROM agents WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId]
    );
    return result.rows[0] || null;
  }

  static async preview(id, companyId, userMessage) {
    const agent = await this.findById(id, companyId);
    if (!agent) throw new Error('Agente não encontrado');

    // Resposta simulada baseada no prompt (sem chamar LLM externo no preview estrutural)
    // Em produção o geminiService usa o system_prompt do agente
    return {
      agent_id: agent.id,
      agent_name: agent.name,
      status: agent.status,
      model: agent.model,
      system_prompt_preview: (agent.system_prompt || '').slice(0, 500),
      user_message: userMessage,
      assistant_message:
        agent.welcome_message ||
        `Olá! Sou o agente "${agent.name}" do produto ${agent.produto_nome}. Como posso ajudar?`,
      tools_enabled: (agent.tools || []).filter((t) => t.enabled).map((t) => t.tool_key),
      knowledge_loaded: Boolean(agent.knowledge),
    };
  }


  /**
   * Agentes publicados do tenant (para o fluxo de conversa).
   */
  static async findPublished(companyId) {
    const result = await query(
      `SELECT a.id, a.produto_id, a.name, a.system_prompt, a.welcome_message,
              a.temperature, a.model, a.template_key,
              p.nome as produto_nome, p.preco as produto_preco, p.estoque as produto_estoque,
              p.descricao as produto_descricao
       FROM agents a
       JOIN produtos p ON p.id = a.produto_id
       WHERE a.company_id = $1 AND a.status = 'published'
       ORDER BY a.id`,
      [companyId]
    );
    return result.rows;
  }

  /**
   * Resolve qual agente usar para a mensagem.
   * 1) agent_id já na conversa
   * 2) único agente publicado do tenant
   * 3) match do nome do produto no texto
   * 4) null → usa prompt genérico do tenant
   */
  static async resolveForConversation(companyId, userInput, conversation = {}) {
    const published = await this.findPublished(companyId);
    if (!published.length) return null;

    if (conversation.agent_id) {
      const pinned = published.find((a) => Number(a.id) === Number(conversation.agent_id));
      if (pinned) return pinned;
    }

    if (published.length === 1) return published[0];

    const text = String(userInput || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    for (const a of published) {
      const nome = String(a.produto_nome || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!nome) continue;
      // match se o nome do produto (ou primeiras palavras significativas) aparece na msg
      const tokens = nome.split(/\s+/).filter((t) => t.length >= 3);
      if (tokens.length && tokens.every((t) => text.includes(t))) return a;
      if (nome.length >= 4 && text.includes(nome)) return a;
    }

    return null;
  }

  // Superadmin: todos os agentes
  static async findAllGlobal({ limit = 100 } = {}) {
    const result = await query(
      `SELECT a.*, p.nome as produto_nome, c.name as company_name
       FROM agents a
       JOIN produtos p ON p.id = a.produto_id
       LEFT JOIN companies c ON c.id = a.company_id
       ORDER BY a.updated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

module.exports = Agent;

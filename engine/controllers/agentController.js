const Agent = require('../models/agent');
const logger = require('../utils/logger');

function getCompanyId(req) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    const err = new Error('Sem empresa vinculada');
    err.status = 403;
    throw err;
  }
  return companyId;
}

class AgentController {
  static async list(req, res) {
    try {
      const companyId = getCompanyId(req);
      const list = await Agent.findAll(companyId, {
        status: req.query.status,
        produto_id: req.query.produto_id ? Number(req.query.produto_id) : undefined,
      });
      res.json(list);
    } catch (error) {
      logger.error('Agent list:', error.message);
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const companyId = getCompanyId(req);
      const agent = await Agent.findById(req.params.id, companyId);
      if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
      res.json(agent);
    } catch (error) {
      logger.error('Agent getById:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  static async getByProduto(req, res) {
    try {
      const companyId = getCompanyId(req);
      const agent = await Agent.findByProduto(Number(req.params.produtoId), companyId);
      if (!agent) return res.status(404).json({ error: 'Nenhum agente para este produto' });
      const full = await Agent.findById(agent.id, companyId);
      res.json(full);
    } catch (error) {
      logger.error('Agent getByProduto:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const companyId = getCompanyId(req);
      const userId = req.user?.id;
      const agent = await Agent.create(req.body, companyId, userId);
      res.status(201).json({ message: 'Agente criado', agent });
    } catch (error) {
      logger.error('Agent create:', error.message);
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const companyId = getCompanyId(req);
      const userId = req.user?.id;
      const agent = await Agent.update(req.params.id, req.body, companyId, userId);
      if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
      res.json({ message: 'Agente atualizado', agent });
    } catch (error) {
      logger.error('Agent update:', error.message);
      res.status(400).json({ error: error.message });
    }
  }

  static async publish(req, res) {
    try {
      const companyId = getCompanyId(req);
      const agent = await Agent.publish(req.params.id, companyId, req.user?.id);
      if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
      try {
        const { invalidateSystemPromptCache } = require('../services/geminiService');
        invalidateSystemPromptCache(companyId);
      } catch (_) {}
      res.json({ message: 'Agente publicado', agent });
    } catch (error) {
      logger.error('Agent publish:', error.message);
      res.status(400).json({ error: error.message });
    }
  }

  static async archive(req, res) {
    try {
      const companyId = getCompanyId(req);
      const agent = await Agent.archive(req.params.id, companyId, req.user?.id);
      if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
      res.json({ message: 'Agente arquivado', agent });
    } catch (error) {
      logger.error('Agent archive:', error.message);
      res.status(400).json({ error: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const companyId = getCompanyId(req);
      const result = await Agent.delete(req.params.id, companyId);
      if (!result) return res.status(404).json({ error: 'Agente não encontrado' });
      res.json({ message: 'Agente excluído' });
    } catch (error) {
      logger.error('Agent delete:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  static async preview(req, res) {
    try {
      const companyId = getCompanyId(req);
      const message = req.body.message || 'Olá';
      const result = await Agent.preview(req.params.id, companyId, message);
      res.json(result);
    } catch (error) {
      logger.error('Agent preview:', error.message);
      res.status(400).json({ error: error.message });
    }
  }

  static async templates(req, res) {
    try {
      res.json(Agent.getTemplates());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listGlobal(req, res) {
    try {
      if (!req.user?.is_superadmin) {
        return res.status(403).json({ error: 'Apenas superadmin' });
      }
      const list = await Agent.findAllGlobal({ limit: Number(req.query.limit) || 100 });
      res.json(list);
    } catch (error) {
      logger.error('Agent listGlobal:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AgentController;

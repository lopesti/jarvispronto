const Produto = require('../models/produto');
const logger = require('../utils/logger');

class ProdutoController {
  static async create(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: 'Sem empresa vinculada', code: 'NO_COMPANY' });
      }
      const { nome, descricao, preco, estoque } = req.body;
      if (!nome || preco === undefined || preco === null || preco === '') {
        return res.status(400).json({ error: 'Nome e preco sao obrigatorios' });
      }
      const produto = await Produto.create(
        {
          nome,
          descricao,
          preco: Number(preco),
          estoque: estoque !== undefined ? Number(estoque) : 0,
        },
        companyId
      );
      res.status(201).json({ message: 'Produto criado com sucesso', produto });
    } catch (error) {
      logger.error('Erro ao criar produto:', error.message);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  }

  static async list(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: 'Sem empresa vinculada', code: 'NO_COMPANY' });
      }
      res.json(await Produto.findAll(companyId));
    } catch (error) {
      logger.error('Erro ao listar produtos:', error.message);
      res.status(500).json({ error: 'Erro ao listar produtos' });
    }
  }

  static async getById(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: 'Sem empresa vinculada', code: 'NO_COMPANY' });
      }
      const produto = await Produto.findById(req.params.id, companyId);
      if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' });
      res.json(produto);
    } catch (error) {
      logger.error('Erro ao buscar produto:', error.message);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  }

  static async update(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: 'Sem empresa vinculada', code: 'NO_COMPANY' });
      }
      const existing = await Produto.findById(req.params.id, companyId);
      if (!existing) return res.status(404).json({ error: 'Produto nao encontrado' });
      const { nome, descricao, preco, estoque } = req.body;
      const produto = await Produto.update(
        req.params.id,
        {
          nome: nome ?? existing.nome,
          descricao: descricao !== undefined ? descricao : existing.descricao,
          preco: preco !== undefined ? Number(preco) : Number(existing.preco),
          estoque: estoque !== undefined ? Number(estoque) : existing.estoque,
        },
        companyId
      );
      res.json({ message: 'Produto atualizado com sucesso', produto });
    } catch (error) {
      logger.error('Erro ao atualizar produto:', error.message);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  }

  static async delete(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: 'Sem empresa vinculada', code: 'NO_COMPANY' });
      }
      const existing = await Produto.findById(req.params.id, companyId);
      if (!existing) return res.status(404).json({ error: 'Produto nao encontrado' });
      await Produto.delete(req.params.id, companyId);
      res.json({ message: 'Produto excluido com sucesso' });
    } catch (error) {
      logger.error('Erro ao excluir produto:', error.message);
      res.status(500).json({ error: 'Erro ao excluir produto' });
    }
  }
}

module.exports = ProdutoController;

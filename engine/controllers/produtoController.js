const Produto = require('../models/produto');
const logger = require('../utils/logger');

class ProdutoController {
  // CREATE - Criar produto
  static async create(req, res) {
    try {
      const { nome, descricao, preco, categoria, estoque, status } = req.body;
      
      if (!nome || !preco) {
        return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
      }

      const produto = await Produto.create({ nome, descricao, preco, categoria, estoque, status });
      res.status(201).json({ message: 'Produto criado com sucesso', produto });
    } catch (error) {
      logger.error('Erro ao criar produto:', error);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  }

  // READ - Listar todos os produtos
  static async list(req, res) {
    try {
      const produtos = await Produto.findAll();
      res.json(produtos);
    } catch (error) {
      logger.error('Erro ao listar produtos:', error);
      res.status(500).json({ error: 'Erro ao listar produtos' });
    }
  }

  // READ - Buscar produto por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const produto = await Produto.findById(id);
      
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      
      res.json(produto);
    } catch (error) {
      logger.error('Erro ao buscar produto:', error);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  }

  // UPDATE - Atualizar produto
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, descricao, preco, categoria, estoque, status } = req.body;
      
      const produtoExistente = await Produto.findById(id);
      if (!produtoExistente) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const produto = await Produto.update(id, { nome, descricao, preco, categoria, estoque, status });
      res.json({ message: 'Produto atualizado com sucesso', produto });
    } catch (error) {
      logger.error('Erro ao atualizar produto:', error);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  }

  // DELETE - Deletar produto
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      const produtoExistente = await Produto.findById(id);
      if (!produtoExistente) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      await Produto.delete(id);
      res.json({ message: 'Produto deletado com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar produto:', error);
      res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  }
}

module.exports = ProdutoController;

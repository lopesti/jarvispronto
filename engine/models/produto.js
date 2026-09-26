const { query } = require('./database');

class Produto {
    static async findAll(companyId) {
        const result = await query(
            'SELECT * FROM produtos WHERE company_id = $1 ORDER BY id',
            [companyId]
        );
        return result.rows;
    }

    static async findById(id, companyId) {
        const result = await query(
            'SELECT * FROM produtos WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );
        return result.rows[0] || null;
    }

    static async create(data, companyId) {
        const { nome, descricao, preco, estoque } = data;
        const result = await query(
            `INSERT INTO produtos (nome, descricao, preco, estoque, company_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING *`,
            [nome, descricao || null, preco, estoque || 0, companyId]
        );
        return result.rows[0];
    }

    static async update(id, data, companyId) {
        const { nome, descricao, preco, estoque } = data;
        const result = await query(
            `UPDATE produtos
             SET nome = $1, descricao = $2, preco = $3, estoque = $4, updated_at = NOW()
             WHERE id = $5 AND company_id = $6
             RETURNING *`,
            [nome, descricao, preco, estoque, id, companyId]
        );
        return result.rows[0] || null;
    }

    static async delete(id, companyId) {
        const result = await query(
            'DELETE FROM produtos WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );
        return result.rows[0] || null;
    }
}

module.exports = Produto;

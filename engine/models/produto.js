const { query } = require('./database');

class Produto {
    static async findAll() {
        const result = await query('SELECT * FROM produtos ORDER BY id');
        return result.rows;
    }

    static async findById(id) {
        const result = await query('SELECT * FROM produtos WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async create(data) {
        const { nome, descricao, preco, estoque } = data;
        const result = await query(
            `INSERT INTO produtos (nome, descricao, preco, estoque, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING *`,
            [nome, descricao || null, preco, estoque || 0]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const { nome, descricao, preco, estoque } = data;
        const result = await query(
            `UPDATE produtos
             SET nome = $1, descricao = $2, preco = $3, estoque = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [nome, descricao, preco, estoque, id]
        );
        return result.rows[0] || null;
    }

    static async delete(id) {
        const result = await query('DELETE FROM produtos WHERE id = $1 RETURNING id', [id]);
        return result.rows[0] || null;
    }
}

module.exports = Produto;

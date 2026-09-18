const fs = require('fs');
const path = require('path');
const { pool } = require('./database');
const logger = require('../utils/logger');

function stripBom(content) {
    if (!content) return content;
    if (content.charCodeAt(0) === 0xfeff) return content.slice(1);
    if (content.startsWith('\uFEFF')) return content.replace(/^\uFEFF/, '');
    return content;
}

async function runMigrations() {
    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        if (!fs.existsSync(migrationsDir)) {
            logger.warn('Pasta de migrations nao encontrada');
            return;
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW()
            )
        `);

        const files = fs
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const already = await pool.query(
                'SELECT 1 FROM schema_migrations WHERE filename = $1',
                [file]
            );
            if (already.rows.length > 0) {
                logger.info('Migration ' + file + ' ja aplicada, pulando');
                continue;
            }

            let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            sql = stripBom(sql).trim();
            if (!sql) continue;

            await pool.query(sql);
            await pool.query(
                'INSERT INTO schema_migrations (filename) VALUES ($1)',
                [file]
            );
            logger.info('Migration ' + file + ' executada');
        }

        logger.info('Todas as migrations executadas com sucesso!');
    } catch (error) {
        logger.error('Erro ao executar migrations:', error.message);
    }
}

module.exports = { runMigrations };

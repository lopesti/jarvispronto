const fs = require('fs');
const path = require('path');
const { pool } = require('./database');
const logger = require('../utils/logger');

function stripBom(content) {
    if (!content) return content;
    if (content.charCodeAt(0) === 0xfeff) return content.slice(1);
    return content;
}

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
        logger.warn('[migrate] Pasta de migrations nao encontrada');
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

    let executedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
        const already = await pool.query(
            'SELECT 1 FROM schema_migrations WHERE filename = $1',
            [file]
        );
        if (already.rows.length > 0) {
            logger.info('[migrate] ' + file + ' ja aplicada, pulando');
            skippedCount++;
            continue;
        }

        let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        sql = stripBom(sql).trim();
        if (!sql) {
            logger.warn('[migrate] ' + file + ' esta vazia, pulando');
            continue;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query(
                'INSERT INTO schema_migrations (filename) VALUES ($1)',
                [file]
            );
            await client.query('COMMIT');
            logger.info('[migrate] ' + file + ' executada');
            executedCount++;
        } catch (err) {
            await client.query('ROLLBACK');
            logger.error('[migrate] FALHA em ' + file + ': ' + err.message);
            throw new Error('Migration falhou em ' + file + ': ' + err.message);
        } finally {
            client.release();
        }
    }

    logger.info(
        '[migrate] Todas as migrations executadas com sucesso! ' +
        '(' + executedCount + ' novas, ' + skippedCount + ' ja aplicadas)'
    );
}

module.exports = { runMigrations };
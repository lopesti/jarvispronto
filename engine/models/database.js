const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
    logger.info('PostgreSQL conectado com sucesso!');
});

pool.on('error', (err) => {
    logger.error('Erro no PostgreSQL:', err.message);
});

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();
const getPool = () => pool;

module.exports = { query, getClient, getPool, pool };

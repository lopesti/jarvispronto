const { Pool } = require('pg');
const logger = require('../utils/logger');

// Detecta se precisa de SSL (Supabase, Neon, AWS RDS exigem)
const isRemote =
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('localhost') &&
  !process.env.DATABASE_URL.includes('127.0.0.1') &&
  !process.env.DATABASE_URL.includes('@postgres:');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  // Correcao: 5s era curto demais no Docker Windows (cold connection).
  // 15s da margem pra o pool reabrir conexao sem derrubar o request.
  connectionTimeoutMillis: 15000,
});

pool.on('connect', () => {
  logger.info('PostgreSQL conectado com sucesso!');
});

pool.on('error', (err) => {
  logger.error('Erro no PostgreSQL: ' + err.message);
});

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();
const getPool = () => pool;

module.exports = { query, getClient, getPool, pool };
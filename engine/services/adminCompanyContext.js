const jwt = require('jsonwebtoken');
const db = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'jarvis-comercial';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'jarvis-panel';

async function createContextToken(adminId, companyId) {
  const admin = await db.query(
    'SELECT id, is_superadmin FROM users WHERE id = $1',
    [adminId]
  );

  if (!admin.rows[0] || admin.rows[0].is_superadmin !== true) {
    const error = new Error('Acesso restrito ao SUPERADMIN');
    error.status = 403;
    throw error;
  }

  const company = await db.query(
    'SELECT id, name FROM companies WHERE id = $1',
    [companyId]
  );

  if (!company.rows[0]) {
    const error = new Error('Empresa nao encontrada');
    error.status = 404;
    throw error;
  }

  const token = jwt.sign(
    {
      sub: String(adminId),
      companyId: Number(companyId),
      type: 'admin_company_context',
    },
    JWT_SECRET,
    {
      expiresIn: '8h',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

  return { token, company: company.rows[0] };
}

async function validateContextToken(token, adminId) {
  const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (
    decoded.type !== 'admin_company_context' ||
    String(decoded.sub) !== String(adminId) ||
    !Number.isInteger(Number(decoded.companyId))
  ) {
    throw new Error('Contexto administrativo invalido');
  }

  const admin = await db.query(
    'SELECT id, is_superadmin FROM users WHERE id = $1',
    [adminId]
  );

  if (!admin.rows[0] || admin.rows[0].is_superadmin !== true) {
    const error = new Error('Permissao SUPERADMIN revogada');
    error.status = 403;
    throw error;
  }

  const company = await db.query(
    'SELECT id FROM companies WHERE id = $1',
    [decoded.companyId]
  );

  if (!company.rows[0]) {
    const error = new Error('Empresa do contexto nao encontrada');
    error.status = 403;
    throw error;
  }

  return Number(decoded.companyId);
}

module.exports = { createContextToken, validateContextToken };

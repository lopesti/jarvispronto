const express = require('express');
const router = express.Router();
const { query } = require('../models/database');
const logger = require('../utils/logger');
const authMiddleware = require('../middlewares/auth');
const {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  validatePassword,
  validateEmail,
  hashPassword,
  comparePassword,
} = require('../services/authService');

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'user',
    companyId: row.company_id || row.companyId || null,
    created_at: row.created_at,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'Nome deve ter ao menos 2 caracteres' });
    }
    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ error: emailErr });
    const passErr = validatePassword(password);
    if (passErr) return res.status(400).json({ error: passErr });

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await query('SELECT id FROM users WHERE email = $1', [
      normalizedEmail,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email ja cadastrado' });
    }

    const hashedPassword = await hashPassword(password);

    // Cria empresa isolada para este cadastro (multi-tenant)
    const companyName = String(name).trim() + " — Empresa";
    const slugBase = normalizedEmail.split("@")[0].replace(/[^a-z0-9]/gi, "-").slice(0, 40);
    const slug = slugBase + "-" + Date.now().toString(36);
    const companyRes = await query(
      `INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id, name`,
      [companyName, slug]
    );
    const company = companyRes.rows[0];

    const result = await query(
      `INSERT INTO users (name, email, password, role, company_id, created_at)
       VALUES ($1, $2, $3, 'owner', $4, NOW())
       RETURNING id, name, email, role, company_id, created_at`,
      [String(name).trim(), normalizedEmail, hashedPassword, company.id]
    );

    const user = result.rows[0];
    user.company_id = company.id;
    const accessToken = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    res.status(201).json({
      message: 'Usuario criado com sucesso',
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      user: publicUser(user),
    });
  } catch (error) {
    logger.error('Erro no registro: ' + error.message);
    res.status(500).json({ error: 'Erro ao criar usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailErr = validateEmail(email);
    if (emailErr || !password) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const result = await query('SELECT * FROM users WHERE email = $1', [
      normalizedEmail,
    ]);

    // resposta generica evita enumeracao de usuarios
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const user = result.rows[0];
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      user: publicUser(user),
    });
  } catch (error) {
    logger.error('Erro no login: ' + error.message);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken obrigatorio' });
    }
    const out = await rotateRefreshToken(refreshToken);
    res.json({
      token: out.accessToken,
      accessToken: out.accessToken,
      refreshToken: out.refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      user: publicUser(out.user),
    });
  } catch (error) {
    logger.warn('Refresh falhou: ' + error.message);
    res.status(error.status || 401).json({ error: error.message || 'Nao autorizado' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    await revokeRefreshToken(refreshToken);
    res.json({ message: 'Logout realizado' });
  } catch (error) {
    res.json({ message: 'Logout realizado' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar perfil' });
  }
});

module.exports = router;

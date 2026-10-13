const express = require('express');
const router = express.Router();
const { query } = require('../models/database');
const logger = require('../utils/logger');
const authMiddleware = require('../middlewares/auth');
const planService = require('../services/planService');
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

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const common = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
  };
  // access ~ 15 min (ou o que o JWT definir)
  res.cookie('jarvis_access', accessToken, { ...common, maxAge: 15 * 60 * 1000 });
  // refresh ~ 7 dias
  if (refreshToken) {
    res.cookie('jarvis_refresh', refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
}

function clearAuthCookies(res) {
  res.clearCookie('jarvis_access', { path: '/' });
  res.clearCookie('jarvis_refresh', { path: '/' });
}


const loginAttempts = new Map(); // email -> { count, until }
const LOCKOUT_MAX = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'user',
    companyId: row.company_id || row.companyId || null,
    is_superadmin: row.is_superadmin === true,
    created_at: row.created_at,
  };
}

router.post('/register', async (req, res) => {
  // ─── FIX: respeita flags de registro publico (Fase 3 do relatorio) ───
  const registrationAllowed =
    process.env.ALLOW_REGISTER !== 'false' &&
    process.env.ENABLE_REGISTRATION !== 'false' &&
    process.env.ALLOW_PUBLIC_SIGNUP !== 'false';

  if (!registrationAllowed) {
    return res.status(403).json({
      error: 'Cadastro publico desabilitado',
      code: 'REGISTRATION_DISABLED',
    });
  }
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

    // ─── BUG-081: empresa nova nasce com prompt generico proprio ───
    const defaultConfig = {
      systemPrompt:
        `Voce e o assistente virtual da ${companyName}. ` +
        `Responda sempre em portugues, de forma educada e objetiva. ` +
        `Ajude o cliente a conhecer os produtos, tirar duvidas e avancar na compra. ` +
        `Quando nao souber algo, seja honesto e ofereca falar com um atendente humano.`,
      fallbackMessage: 'Desculpe, nao entendi. Pode reformular sua pergunta?',
    };

    const companyRes = await query(
      `INSERT INTO companies (name, slug, config) VALUES ($1, $2, $3::jsonb) RETURNING id, name`,
      [companyName, slug, JSON.stringify(defaultConfig)]
    );
    const company = companyRes.rows[0];

    const result = await query(
      `INSERT INTO users (name, email, password, role, company_id, created_at)
       VALUES ($1, $2, $3, 'owner', $4, NOW())
       RETURNING id, name, email, role, company_id, is_superadmin, created_at`,
      [String(name).trim(), normalizedEmail, hashedPassword, company.id]
    );

    const user = result.rows[0];
    user.company_id = company.id;

    // F-05: toda empresa nova nasce com trial de 14 dias.
    // Se falhar, o cadastro continua — mas loga o aviso pra investigar.
    try {
      await planService.createTrialSubscription(company.id);
    } catch (trialErr) {
      logger.warn(
        `[auth] falha ao criar trial company=${company.id}: ${trialErr.message}`
      );
    }

    const accessToken = signAccessToken(user);

    // F-01: createRefreshToken devolve { raw, familyId } — extrai raw
    const refreshOut = await createRefreshToken(user.id);

    setAuthCookies(res, accessToken, refreshOut.raw);
    res.status(201).json({
      message: 'Usuario criado com sucesso',
      token: accessToken,
      accessToken,
      refreshToken: refreshOut.raw,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      user: publicUser(user),
    });
  } catch (error) {
    logger.error('Erro no registro: ' + error.message);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
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
    const attempt = loginAttempts.get(normalizedEmail);
    if (attempt && attempt.until > Date.now()) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
    }
    const result = await query('SELECT * FROM users WHERE email = $1', [
      normalizedEmail,
    ]);

    if (result.rows.length === 0) {
      const c = (attempt?.count || 0) + 1;
      loginAttempts.set(normalizedEmail, {
        count: c,
        until: c >= LOCKOUT_MAX ? Date.now() + LOCKOUT_MS : 0,
      });
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const user = result.rows[0];
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      const c = (attempt?.count || 0) + 1;
      loginAttempts.set(normalizedEmail, {
        count: c,
        until: c >= LOCKOUT_MAX ? Date.now() + LOCKOUT_MS : 0,
      });
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }
    loginAttempts.delete(normalizedEmail);

    const accessToken = signAccessToken(user);

    // F-01: createRefreshToken devolve { raw, familyId } — extrai raw
    const refreshOut = await createRefreshToken(user.id);

    setAuthCookies(res, accessToken, refreshOut.raw);
    res.json({
      token: accessToken,
      accessToken,
      refreshToken: refreshOut.raw,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      user: publicUser(user),
    });
  } catch (error) {
    logger.error('Erro no login: ' + error.message);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    // S-04: aceita body ou cookie httpOnly
    const refreshToken =
      (req.body && req.body.refreshToken) ||
      (req.cookies && req.cookies.jarvis_refresh) ||
      null;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken obrigatorio' });
    }
    const out = await rotateRefreshToken(refreshToken);
    setAuthCookies(res, out.accessToken, out.refreshToken);
    res.json({
      token: out.accessToken,
      accessToken: out.accessToken,
      refreshToken: out.refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      user: publicUser(out.user),
    });
  } catch (error) {
    logger.warn('Refresh falhou: ' + error.message);
    clearAuthCookies(res);
    res.status(error.status || 401).json({ error: error.message || 'Nao autorizado' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const refreshToken =
      (req.body && req.body.refreshToken) ||
      (req.cookies && req.cookies.jarvis_refresh) ||
      null;
    await revokeRefreshToken(refreshToken);
    clearAuthCookies(res);
    res.json({ message: 'Logout realizado' });
  } catch (error) {
    clearAuthCookies(res);
    res.json({ message: 'Logout realizado' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    // BUG-007 corrigido + is_superadmin incluido
    const result = await query(
      'SELECT id, name, email, role, company_id, is_superadmin, created_at FROM users WHERE id = $1',
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
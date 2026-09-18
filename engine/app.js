require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const logger = require('./utils/logger');
const authMiddleware = require('./middlewares/auth');
const { requestIdMiddleware } = require('./middlewares/requestId');

const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  logger.error('[boot] Variaveis obrigatorias faltando: ' + missing.join(', '));
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  const weakSecrets = ['jarvis_secret', 'troque_por_um_segredo_longo_e_aleatorio', 'changeme', 'secret'];
  if (weakSecrets.some((s) => (process.env.JWT_SECRET || '').includes(s) || (process.env.PGPASSWORD || '').includes(s))) {
    logger.error('[boot] BOOT ABORTADO: JWT_SECRET ou PGPASSWORD ainda usam valor default/fraco. Defina secrets fortes no .env');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const useQueue = process.env.USE_MESSAGE_QUEUE === '1';

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.CORS_ALLOWED_ORIGINS ||
  'http://localhost,http://localhost:80,http://127.0.0.1,http://localhost:3000,http://localhost:3001'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // 1.2 — regex ancorada (não aceita evil-localhost.com)
      if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      logger.warn(`[CORS] Origem rejeitada: ${origin}`);
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  })
);

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  return next(err);
});

app.use(requestIdMiddleware);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes, tente mais tarde' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas tentativas de login/registro' },
});

app.use('/api', apiLimiter);
app.use('/auth', authLimiter);

app.use('/auth', require('./routes/auth'));
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/produtos', authMiddleware, require('./routes/produtos'));
app.use('/api/conversations', authMiddleware, require('./routes/conversations'));
app.use('/api/etiquetas', authMiddleware, require('./routes/etiquetas'));
app.use('/api/simulation', authMiddleware, require('./routes/simulation'));
app.use('/api/channels', require('./routes/channels'));
app.use('/qr', require('./routes/qr'));
app.use('/qr-image', require('./routes/qr-image'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'Escova Alisadora 3 em 1',
    version: '1.5.1',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    mode: useQueue ? 'queue' : 'inline',
  });
});

app.get('/metrics', (req, res) => {
  const { getMetrics } = require('./utils/metrics');
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(getMetrics());
});

app.get('/qr-page', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/qr.html'));
});

const whatsappService = require('./services/whatsappService');

// 1.5 — um rid por mensagem, propagado no fluxo
async function handleMessage(from, text, sock) {
  const rid = crypto.randomBytes(4).toString('hex');
  const preview = String(text || '').slice(0, 60);
  logger.info(`[${rid}] Mensagem de ${from}: ${preview}`);
  try {
    if (useQueue) {
      const { enqueueIncoming } = require('./services/messageQueue');
      await enqueueIncoming({ from, text, channel: 'whatsapp', rid });
    } else {
      const messageController = require('./controllers/messageController');
      await messageController.handleMessage(from, text, sock, { rid });
    }
  } catch (error) {
    logger.error(`[${rid}] Erro ao processar: ${error.message}`);
  }
}

// 1.1 — em modo fila a API NÃO abre socket WA (worker é o dono)
if (useQueue) {
  logger.info('[boot] Modo fila: API nao abre socket WA (worker e o dono unico)');
} else {
  whatsappService.connect(handleMessage);
}

const { runMigrations } = require('./models/migrate');
runMigrations();

app.listen(PORT, () => {
  logger.info(`[boot] Servidor rodando em http://0.0.0.0:${PORT} v1.5.1 mode=${useQueue ? 'queue' : 'inline'}`);
  logger.info('[boot] Via Nginx: http://localhost/ | QR: http://localhost/qr');
});

process.on('SIGINT', async () => {
  logger.info('[boot] Desligando...');
  if (!useQueue) {
    await whatsappService.disconnect();
  }
  process.exit(0);
});

// 1.4 — uncaughtException encerra o processo
process.on('uncaughtException', (err) => {
  logger.error('[boot] uncaughtException: ' + (err.stack || err.message));
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('[boot] unhandledRejection: ' + (err && err.stack ? err.stack : err));
});

module.exports = app;

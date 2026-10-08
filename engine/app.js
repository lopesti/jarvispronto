require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const authMiddleware = require('./middlewares/auth');
const requireSuperadmin = require('./middlewares/requireSuperadmin');

// ═══════════════════════════════════════════════════════════
//  Validação de env obrigatórios
// ═══════════════════════════════════════════════════════════
const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
    logger.error('Variaveis obrigatorias faltando: ' + missing.join(', '));
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════
//  Modo fila vs inline
// ═══════════════════════════════════════════════════════════
const useQueue = process.env.USE_MESSAGE_QUEUE === '1';

if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ═══════════════════════════════════════════════════════════
//  CORS — allowlist estrita (BUG-004 CORRIGIDO)
//  + aceita *.trycloudflare.com (Cloudflare Tunnel quick)
// ═══════════════════════════════════════════════════════════
const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost,http://localhost:80,http://127.0.0.1,http://localhost:3000,http://localhost:3001,https://localhost,https://127.0.0.1'
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
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return cb(null, true);
            }
            // ─── Cloudflare Tunnel (quick tunnels trycloudflare.com) ───
            if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) {
                return cb(null, true);
            }
            logger.warn('[CORS] Origem rejeitada: ' + origin);
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

// ═══════════════════════════════════════════════════════════
//  Rate limiting
// ═══════════════════════════════════════════════════════════
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 3000 : 30000,
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

// ═══════════════════════════════════════════════════════════
//  Rotas
// ═══════════════════════════════════════════════════════════
app.use('/auth', require('./routes/auth'));

app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/produtos', authMiddleware, require('./routes/produtos'));
app.use('/api/conversations', authMiddleware, require('./routes/conversations'));
app.use('/api/etiquetas', authMiddleware, require('./routes/etiquetas'));
app.use('/api/simulation', authMiddleware, require('./routes/simulation'));
app.use('/api/channels', authMiddleware, require('./routes/channels'));
app.use('/api/companies', authMiddleware, require('./routes/companies'));
app.use('/api/whatsapp', authMiddleware, require('./routes/whatsapp'));

// ─── Suporte (empresa) e Admin (superadmin) — FASE 3.1 ───
app.use('/api/support', authMiddleware, require('./routes/support'));
app.use('/api/admin/support', authMiddleware, requireSuperadmin, require('./routes/adminSupport'));

app.use('/internal', require('./routes/internal'));

// ═══════════════════════════════════════════════════════════
//  Health check + Metrics
// ═══════════════════════════════════════════════════════════
app.get('/metrics', (req, res) => {
    const { getMetrics } = require('./utils/metrics');
    const companyId = req.query.companyId ? Number(req.query.companyId) : null;
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(getMetrics(companyId));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.6.0',
        timestamp: new Date().toISOString(),
    });
});

// ═══════════════════════════════════════════════════════════
//  404 handler JSON (BUG-076)
// ═══════════════════════════════════════════════════════════
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// ═══════════════════════════════════════════════════════════
//  WhatsApp — modo fila vs inline
// ═══════════════════════════════════════════════════════════
const whatsappService = require('./services/whatsappService');

if (useQueue) {
    logger.info('[boot] Modo fila ativo (USE_MESSAGE_QUEUE=1)');
    logger.info('[boot] Socket WA: gerenciado pelo worker (docker compose --profile full up)');
} else {
    logger.info('[boot] Modo inline (USE_MESSAGE_QUEUE=0)');
    logger.info('[boot] WhatsApp: modo multi-empresa. Conecte em POST /api/whatsapp/connect');

    if (process.env.WA_AUTO_CONNECT_COMPANY && process.env.WA_AUTO_CONNECT_COMPANY !== '0') {
        const cid = Number(process.env.WA_AUTO_CONNECT_COMPANY) || 1;
        whatsappService
            .connectCompany(cid, (from, text, sock, companyId) => {
                const messageController = require('./controllers/messageController');
                return messageController.handleMessage(from, text, sock, {
                    companyId: companyId || cid,
                });
            })
            .catch((e) => logger.error('WA auto-connect: ' + e.message));
    }
}

// ═══════════════════════════════════════════════════════════
//  Migrations + Listen
// ═══════════════════════════════════════════════════════════
const { runMigrations } = require('./models/migrate');

(async () => {
    try {
        logger.info('[boot] Rodando migrations...');
        await runMigrations();
        logger.info('[boot] Migrations OK. Subindo servidor...');

        app.listen(PORT, () => {
            logger.info(`Servidor rodando em http://0.0.0.0:${PORT} v1.6.0 mode=${useQueue ? 'queue' : 'inline'}`);
            logger.info('Via Nginx: http://localhost/');
        });
    } catch (err) {
        logger.error('[boot] FALHA nas migrations. API nao vai subir.');
        logger.error(err.message);
        process.exit(1);
    }
})();
process.on('SIGINT', async () => {
    logger.info('Desligando...');
    if (!useQueue) {
        await whatsappService.disconnect();
    }
    process.exit(0);
});
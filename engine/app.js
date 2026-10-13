require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const authMiddleware = require('./middlewares/auth');
const requireSuperadmin = require('./middlewares/requireSuperadmin');
const { promoteFromEnv: promoteSuperadmin } = require('./services/superadminService');

// ═══════════════════════════════════════════════════════════════
//  Validação de env obrigatórios
// ═══════════════════════════════════════════════════════════════
const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
    logger.error('Variaveis obrigatorias faltando: ' + missing.join(', '));
    process.exit(1);
}

const app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());
try { app.use(require('helmet')({ contentSecurityPolicy: false })); } catch (_) {}
app.use(require('./middlewares/requestId'));
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════
//  Modo fila vs inline
// ═══════════════════════════════════════════════════════════════
const useQueue = process.env.USE_MESSAGE_QUEUE === '1';

if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ═══════════════════════════════════════════════════════════════
//  CORS — allowlist estrita (BUG-004 CORRIGIDO)
//  + aceita *.trycloudflare.com (Cloudflare Tunnel quick)
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  Rate limiting
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  Rotas
// ═══════════════════════════════════════════════════════════════
app.use('/auth', require('./routes/auth'));

app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/produtos', authMiddleware, require('./routes/produtos'));
app.use('/api/conversations', authMiddleware, require('./routes/conversations'));
app.use('/api/etiquetas', authMiddleware, require('./routes/etiquetas'));
// F-12: simulation desabilitada
// app.use('/api/simulation', authMiddleware, require('./routes/simulation'));
app.use('/api/channels', authMiddleware, require('./routes/channels'));
app.use('/api/companies', authMiddleware, require('./routes/companies'));
app.use('/api/whatsapp', authMiddleware, require('./routes/whatsapp'));

// ─── Suporte (empresa) e Admin (superadmin) — FASE 3.1 ───
app.use('/api/support', authMiddleware, require('./routes/support'));
app.use('/api/admin/support', authMiddleware, requireSuperadmin, require('./routes/adminSupport'));
app.use('/api/admin/companies', authMiddleware, requireSuperadmin, require('./routes/adminCompanies'));
app.use('/api/admin/users', authMiddleware, requireSuperadmin, require('./routes/adminUsers'));

// ─── SaaS: planos, assinatura e uso ───
app.use('/api', require('./routes/billing'));
app.use('/api/crm', require('./routes/crm'));

if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_INTERNAL_ROUTES !== '0') {
    app.use('/internal', require('./routes/internal'));
} else if (process.env.ENABLE_INTERNAL_ROUTES === '1') {
    app.use('/internal', require('./routes/internal'));
} else {
    const loggerBoot = require('./utils/logger');
    loggerBoot.info('[boot] /internal desabilitado (produção)');
}

// ═══════════════════════════════════════════════════════════════
//  Health check + Metrics
// ═══════════════════════════════════════════════════════════════
app.get('/metrics', (req, res) => {
    const crypto = require('crypto');
    const expected = process.env.METRICS_TOKEN || process.env.INTERNAL_SIM_TOKEN || '';
    const got = req.headers['x-metrics-token'] || req.query.token || '';
    if (!expected) {
        if (process.env.NODE_ENV === 'production') {
            return res.status(503).json({ error: 'METRICS_TOKEN nao configurado' });
        }
    } else {
        const a = Buffer.from(String(got));
        const b = Buffer.from(String(expected));
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    const { getMetrics } = require('./utils/metrics');
    const companyId = req.query.companyId ? Number(req.query.companyId) : null;
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(getMetrics(companyId));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.15.0',
        timestamp: new Date().toISOString(),
    });
});

// ═══════════════════════════════════════════════════════════════
//  404 handler JSON (BUG-076)
// ═══════════════════════════════════════════════════════════════
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// ═══════════════════════════════════════════════════════════════
//  WhatsApp — modo fila vs inline
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  O-03: shutdown gracioso (SIGINT, SIGTERM, uncaughtException)
// ═══════════════════════════════════════════════════════════════
let httpServer = null;
let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`[shutdown] Recebido ${signal}. Encerrando...`);

    // Timeout de seguranca: se algo travar, forca saida em 10s
    const forceExit = setTimeout(() => {
        logger.error('[shutdown] Timeout apos 10s — forcando saida');
        process.exit(1);
    }, 10000);
    forceExit.unref();

    // 1. Para de aceitar novas conexoes HTTP
    try {
        if (httpServer) {
            await new Promise((resolve) => httpServer.close(resolve));
            logger.info('[shutdown] HTTP server fechado');
        }
    } catch (e) {
        logger.warn('[shutdown] Erro ao fechar HTTP: ' + e.message);
    }

    // 2. Desconecta WhatsApp (somente em modo inline)
    try {
        if (!useQueue) {
            await whatsappService.disconnect();
            logger.info('[shutdown] WhatsApp desconectado');
        }
    } catch (e) {
        logger.warn('[shutdown] Erro ao desconectar WA: ' + e.message);
    }

    // 3. Fecha pool Postgres
    try {
        const { pool } = require('./models/database');
        await pool.end();
        logger.info('[shutdown] Pool Postgres fechado');
    } catch (e) {
        logger.warn('[shutdown] Erro ao fechar DB: ' + e.message);
    }

    logger.info('[shutdown] Encerrado com sucesso');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
    logger.error(`[fatal] uncaughtException: ${err.message}`);
    logger.error(err.stack || '');
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
    logger.error(`[fatal] unhandledRejection: ${reason}`);
    shutdown('unhandledRejection');
});

// ═══════════════════════════════════════════════════════════════
//  Migrations + Listen
// ═══════════════════════════════════════════════════════════════
const { runMigrations } = require('./models/migrate');

(async () => {
    try {
        logger.info('[boot] Rodando migrations...');
        await runMigrations();
        logger.info('[boot] Migrations OK. Subindo servidor...');

        // S-08: promove SUPERADMIN_EMAIL a superadmin (idempotente)
        await promoteSuperadmin();

        httpServer = app.listen(PORT, () => {
            logger.info(`Servidor rodando em http://0.0.0.0:${PORT} v1.15.0 mode=${useQueue ? 'queue' : 'inline'}`);
            logger.info('Via Nginx: http://localhost/');
            try {
                const { startTaskReminderCron } = require('./services/taskReminderService');
                startTaskReminderCron();
            } catch (e) {
                logger.warn('[boot] task reminder: ' + e.message);
            }
            try {
                const { startHandoffReturnCron } = require('./services/handoffReturnService');
                startHandoffReturnCron();
            } catch (e) {
                logger.warn('[boot] handoff return: ' + e.message);
            }
        });
    } catch (err) {
        logger.error('[boot] FALHA nas migrations. API nao vai subir.');
        logger.error(err.message);
        process.exit(1);
    }
})();
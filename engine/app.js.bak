require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const authMiddleware = require('./middlewares/auth');

const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
    logger.error('Variaveis obrigatorias faltando: ' + missing.join(', '));
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost,http://localhost:80,http://127.0.0.1,http://localhost:3000,http://localhost:3001'
).split(',').map((s) => s.trim());

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            return cb(null, true); // nginx same-origin often omite; permitir em dev
        },
        credentials: true,
    })
);

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

// Rotas de leitura operacional — em producao ideal exigir JWT; liberado para demo local do painel
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/produtos', authMiddleware, require('./routes/produtos'));
app.use('/api/conversations', authMiddleware, require('./routes/conversations'));
app.use('/api/etiquetas', authMiddleware, require('./routes/etiquetas'));
app.use('/api/simulation', authMiddleware, require('./routes/simulation'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

// Usado apenas pelo jarvis-simulator (rede interna do Docker). Protegido por
// INTERNAL_SIM_TOKEN dentro da própria rota — ver engine/routes/internal.js
app.use('/internal', require('./routes/internal'));


app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        product: 'Escova Alisadora 3 em 1',
        version: '1.4.0',
        timestamp: new Date().toISOString(),
    });
});

app.get('/qr', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/qr.html'));
});

const whatsappService = require('./services/whatsappService');

// WhatsApp multi-tenant: cada empresa conecta via POST /api/whatsapp/connect
// (nao inicia sessao global no boot — evita compartilhar numero entre usuarios)
logger.info('WhatsApp: modo multi-empresa. Conecte em POST /api/whatsapp/connect apos login.');

// Opcional: auto-conectar empresa 1 se WA_AUTO_CONNECT_COMPANY=1
if (process.env.WA_AUTO_CONNECT_COMPANY) {
    const cid = Number(process.env.WA_AUTO_CONNECT_COMPANY) || 1;
    whatsappService
        .connectCompany(cid, (from, text, sock, companyId) => {
            const messageController = require('./controllers/messageController');
            return messageController.handleMessage(from, text, sock, { companyId: companyId || cid });
        })
        .catch((e) => logger.error('WA auto-connect: ' + e.message));
}

const { runMigrations } = require('./models/migrate');
runMigrations();

app.listen(PORT, () => {
    logger.info('Servidor rodando em http://0.0.0.0:' + PORT);
    logger.info('Via Nginx: http://localhost/');
    logger.info('QR: http://localhost/qr');
});

process.on('SIGINT', async () => {
    logger.info('Desligando...');
    await whatsappService.disconnect();
    process.exit(0);
});

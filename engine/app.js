require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');

const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length) {
    logger.error('Variaveis obrigatorias faltando: ' + missing.join(', '));
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisicoes, tente novamente mais tarde'
});
app.use('/api', limiter);

app.use('/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/etiquetas', require('./routes/etiquetas'));
app.use('/api/pizza', require('./routes/pizzaRoutes'));
app.use('/api/simulation', require('./routes/simulation'));
app.use('/api/channels', require('./routes/channels'));


app.use('/qr', require('./routes/qr'));
app.use('/qr-image', require('./routes/qr-image'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/qr', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/qr.html'));
});

const whatsappService = require('./services/whatsappService');

async function handleMessage(from, text, sock) {
    logger.info('Mensagem de ' + from + ': ' + text);
    try {
        const messageController = require('./controllers/messageController');
        await messageController.handleMessage(from, text, sock);
    } catch (error) {
        logger.error('Erro ao processar mensagem:', error.message);
    }
}

whatsappService.connect(handleMessage);

const { runMigrations } = require('./models/migrate');
runMigrations();

app.listen(PORT, () => {
    logger.info('Servidor rodando em http://0.0.0.0:' + PORT);
    logger.info('Dashboard: http://localhost:' + PORT + '/');
    logger.info('QR Code: http://localhost:' + PORT + '/qr');
});

process.on('SIGINT', async () => {
    logger.info('Desligando...');
    await whatsappService.disconnect();
    process.exit(0);
});





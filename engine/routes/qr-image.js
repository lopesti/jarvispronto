const express = require('express');
const router = express.Router();
const qrcode = require('qrcode');

// Rota para servir a imagem do QR Code
router.get('/', async (req, res) => {
    try {
        const qrData = global.currentQR;
        if (!qrData) {
            return res.status(404).send('QR Code não disponível');
        }
        
        // Gerar imagem PNG
        const qrImage = await qrcode.toBuffer(qrData, { type: 'png' });
        res.setHeader('Content-Type', 'image/png');
        res.send(qrImage);
    } catch (error) {
        console.error('Erro ao gerar QR:', error);
        res.status(500).send('Erro ao gerar QR Code');
    }
});

module.exports = router;

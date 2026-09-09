const express = require('express');
const router = express.Router();
const qrcode = require('qrcode');

router.get('/image', async (req, res) => {
    try {
        const qrData = global.currentQR;
        if (!qrData) {
            return res.status(404).json({ error: 'QR Code não disponível' });
        }
        
        const qrImage = await qrcode.toDataURL(qrData);
        res.json({ qrImage });
    } catch (error) {
        console.error('Erro ao gerar QR:', error);
        res.status(500).json({ error: 'Erro ao gerar QR Code' });
    }
});

module.exports = router;

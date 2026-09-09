const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Cardápio com imagens (emojis + URLs)
const menu = {
    pizzas: [
        { 
            id: 1, 
            nome: 'Margherita', 
            ingredientes: 'Molho de tomate, mussarela, manjericão', 
            preco: 45.90, 
            categoria: 'Tradicional',
            emoji: '🍕',
            imagem: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300&h=200&fit=crop'
        },
        { 
            id: 2, 
            nome: 'Pepperoni', 
            ingredientes: 'Molho de tomate, mussarela, pepperoni', 
            preco: 52.90, 
            categoria: 'Tradicional',
            emoji: '🍕',
            imagem: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300&h=200&fit=crop'
        },
        { 
            id: 3, 
            nome: 'Calabresa', 
            ingredientes: 'Molho de tomate, mussarela, calabresa, cebola', 
            preco: 49.90, 
            categoria: 'Tradicional',
            emoji: '🍕',
            imagem: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop'
        },
        { 
            id: 4, 
            nome: 'Portuguesa', 
            ingredientes: 'Molho de tomate, mussarela, presunto, ovo, cebola, ervilha', 
            preco: 55.90, 
            categoria: 'Especial',
            emoji: '🍕',
            imagem: 'https://images.unsplash.com/photo-1574071318508-1cd2f5c2a5f6?w=300&h=200&fit=crop'
        },
        { 
            id: 5, 
            nome: 'Quatro Queijos', 
            ingredientes: 'Molho de tomate, mussarela, provolone, parmesão, gorgonzola', 
            preco: 58.90, 
            categoria: 'Especial',
            emoji: '🧀',
            imagem: 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=300&h=200&fit=crop'
        },
        { 
            id: 6, 
            nome: 'Frango com Catupiry', 
            ingredientes: 'Molho de tomate, mussarela, frango desfiado, catupiry', 
            preco: 54.90, 
            categoria: 'Especial',
            emoji: '🐔',
            imagem: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop'
        }
    ],
    bebidas: [
        { id: 101, nome: 'Refrigerante 2L', preco: 12.00, emoji: '🥤', imagem: 'https://images.unsplash.com/photo-1581009146145-b5b050a2dd2b?w=150&h=150&fit=crop' },
        { id: 102, nome: 'Suco Natural 500ml', preco: 8.00, emoji: '🧃', imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&h=150&fit=crop' },
        { id: 103, nome: 'Água Mineral', preco: 4.00, emoji: '💧', imagem: 'https://images.unsplash.com/photo-1548839142-2e5b1f2f5d4e?w=150&h=150&fit=crop' }
    ],
    bordas: [
        { id: 201, nome: 'Sem borda', preco: 0.00, emoji: '🚫' },
        { id: 202, nome: 'Borda de Catupiry', preco: 5.00, emoji: '🧀' },
        { id: 203, nome: 'Borda de Cheddar', preco: 5.00, emoji: '🧀' }
    ]
};

const orders = [];
let orderCounter = 0;

router.get('/menu', (req, res) => {
    res.json({
        success: true,
        data: menu
    });
});

router.post('/order', (req, res) => {
    try {
        const { cliente, items, endereco } = req.body;

        if (!cliente || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cliente e itens são obrigatórios'
            });
        }

        orderCounter++;
        const orderId = 'PED-' + String(orderCounter).padStart(4, '0');

        let total = 0;
        const itensCompletos = items.map(item => {
            const preco = item.preco || 0;
            const subtotal = preco * (item.quantidade || 1);
            total += subtotal;
            return {
                ...item,
                preco: preco,
                subtotal: subtotal
            };
        });

        const order = {
            id: orderId,
            cliente: cliente,
            items: itensCompletos,
            total: total,
            endereco: endereco || 'Retirar na loja',
            status: 'recebido',
            createdAt: new Date().toISOString()
        };

        orders.push(order);
        logger.info('Pedido criado: ' + orderId + ' - ' + cliente);

        res.json({
            success: true,
            data: {
                pedido: order,
                mensagem: 'Pedido ' + orderId + ' recebido com sucesso!'
            }
        });
    } catch (error) {
        logger.error('Erro ao criar pedido:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar pedido'
        });
    }
});

router.get('/order/:id', (req, res) => {
    const orderId = req.params.id;
    const order = orders.find(o => o.id === orderId);

    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Pedido não encontrado'
        });
    }

    res.json({
        success: true,
        data: order
    });
});

router.get('/history', (req, res) => {
    res.json({
        success: true,
        data: orders.slice(-10).reverse()
    });
});

module.exports = router;

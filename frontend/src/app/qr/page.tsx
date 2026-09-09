'use client';

import { useState, useEffect } from 'react';

export default function QRPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [qrImage, setQrImage] = useState('');

    const loadQR = async () => {
        setLoading(true);
        setError('');
        
        try {
            // Usar a nova rota /qr-image que serve a imagem diretamente
            const response = await fetch('http://localhost:3000/qr-image');
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setQrImage(url);
                setError('');
            } else {
                setError('QR Code não disponível. Aguarde o WhatsApp iniciar.');
            }
        } catch (err) {
            console.error('Erro ao carregar QR:', err);
            setError('Erro ao conectar ao servidor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQR();
        const interval = setInterval(loadQR, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <h1 className="text-2xl font-bold text-center">📱 Conectar WhatsApp</h1>
                <p className="text-center text-gray-600 mt-2">
                    Escaneie o QR Code com seu WhatsApp
                </p>

                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Carregando QR Code...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
                        ❌ {error}
                        <button 
                            onClick={loadQR}
                            className="ml-2 text-blue-500 hover:text-blue-700 underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {qrImage && (
                    <div className="flex justify-center mt-4">
                        <img 
                            src={qrImage} 
                            alt="QR Code" 
                            className="border-4 border-gray-300 rounded-lg p-2"
                            style={{ width: '300px', height: '300px' }}
                        />
                    </div>
                )}

                <button 
                    onClick={loadQR}
                    className="w-full mt-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    disabled={loading}
                >
                    {loading ? '🔄 Carregando...' : '🔄 Atualizar QR Code'}
                </button>

                <div className="mt-4 text-sm text-gray-500 text-center space-y-1">
                    <p>1. Abra o WhatsApp no celular</p>
                    <p>2. Toque em WhatsApp Web</p>
                    <p>3. Escaneie o QR Code</p>
                </div>
            </div>
        </div>
    );
}

// tests/setup/env.js
// Carrega envs de teste — roda antes de todos os testes.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-16-chars-minimum-ok';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
process.env.INTERNAL_SIM_TOKEN = 'test-internal-token';
process.env.GEMINI_API_KEY = '';   // desabilita IA real nos testes
process.env.GROQ_API_KEY = '';     // desabilita IA real nos testes
process.env.USE_MESSAGE_QUEUE = '0';
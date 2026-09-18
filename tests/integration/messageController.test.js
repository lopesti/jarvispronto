jest.mock('../../engine/repositories/conversationRepository', () => ({
  getByPhone: jest.fn().mockResolvedValue(null),
  upsertStep: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../engine/repositories/messageRepository', () => ({
  insert: jest.fn().mockResolvedValue(undefined),
  getHistory: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../engine/services/geminiService', () => ({
  generateResponse: jest.fn().mockResolvedValue('Resposta mock IA'),
}));

const conversationRepo = require('../../engine/repositories/conversationRepository');
const messageRepo = require('../../engine/repositories/messageRepository');
const geminiService = require('../../engine/services/geminiService');
const { handleMessage } = require('../../engine/controllers/messageController');

describe('messageController.handleMessage', () => {
  const sock = { sendMessage: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    jest.clearAllMocks();
    geminiService.generateResponse.mockResolvedValue('Resposta mock IA');
  });

  test('mensagem normal persiste e envia', async () => {
    await handleMessage('5511999999999@s.whatsapp.net', 'ola', sock, { rid: 't1' });
    expect(conversationRepo.upsertStep).toHaveBeenCalled();
    expect(messageRepo.insert).toHaveBeenCalled();
    expect(sock.sendMessage).toHaveBeenCalledWith(
      '5511999999999@s.whatsapp.net',
      expect.objectContaining({ text: expect.any(String) })
    );
  });

  test('newsletter ignorada', async () => {
    await handleMessage('x@newsletter', 'oi', sock);
    expect(sock.sendMessage).not.toHaveBeenCalled();
  });

  test('status@broadcast ignorada', async () => {
    await handleMessage('status@broadcast', 'oi', sock);
    expect(sock.sendMessage).not.toHaveBeenCalled();
  });

  test('grupo @g.us ignorado', async () => {
    await handleMessage('123@g.us', 'oi', sock);
    expect(sock.sendMessage).not.toHaveBeenCalled();
  });

  test('texto vazio ignorado', async () => {
    await handleMessage('5511999999999@s.whatsapp.net', '   ', sock);
    expect(sock.sendMessage).not.toHaveBeenCalled();
  });

  test('IA falha → fallback', async () => {
    geminiService.generateResponse.mockRejectedValue(new Error('down'));
    await handleMessage('5511999999999@s.whatsapp.net', 'preco', sock, { rid: 't2' });
    expect(sock.sendMessage).toHaveBeenCalled();
    const text = sock.sendMessage.mock.calls[0][1].text;
    expect(text.length).toBeGreaterThan(5);
  });
});

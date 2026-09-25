const http = require('http');

const data = JSON.stringify({
  name: "Joao Silva",
  email: "joao@teste.com",
  password: "123456"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Resposta:', responseData);
    try {
      const json = JSON.parse(responseData);
      console.log('✅ Sucesso!', json);
    } catch (e) {
      console.log('❌ Erro ao parsear JSON:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

req.write(data);
req.end();

console.log('📤 Enviando requisição para /auth/register...');
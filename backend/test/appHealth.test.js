const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const app = require('../src/app');

function iniciarServidor() {
  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();

      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function getStatus(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  await response.arrayBuffer();
  return response.status;
}

test('/api/health nao e bloqueado pelo limite global de requisicoes', async () => {
  const server = await iniciarServidor();

  try {
    for (let i = 0; i < 101; i += 1) {
      const status = await getStatus(server.baseUrl, '/api/health');
      assert.equal(status, 200);
    }
  } finally {
    await server.close();
  }
});

test('limite global continua protegendo as demais rotas', async () => {
  const server = await iniciarServidor();

  try {
    let status;

    for (let i = 0; i < 101; i += 1) {
      status = await getStatus(server.baseUrl, '/api/rota-inexistente');
    }

    assert.equal(status, 429);
  } finally {
    await server.close();
  }
});

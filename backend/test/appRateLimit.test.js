const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const app = require('../src/app');

test('limites geral e publico ficam isolados e preservam o health check', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const consoleError = console.error;
    console.error = () => {};
    let response;

    try {
      response = await fetch(`${baseUrl}/api/auth/me`);
    } finally {
      console.error = consoleError;
    }

    assert.equal(response.status, 401);
    assert.equal(response.headers.get('RateLimit-Remaining'), '99');

    for (let tentativa = 1; tentativa < 100; tentativa += 1) {
      response = await fetch(`${baseUrl}/api/rota-inexistente`);
      assert.equal(response.status, 404);
    }

    response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);

    response = await fetch(`${baseUrl}/api/publico/rota-inexistente`);
    assert.equal(response.status, 404);

    for (let tentativa = 1; tentativa < 100; tentativa += 1) {
      response = await fetch(`${baseUrl}/api/publico/rota-inexistente`);
      assert.equal(response.status, 404);
    }

    response = await fetch(`${baseUrl}/api/publico/rota-inexistente`);
    const body = await response.json();
    const retryAfter = Number(response.headers.get('Retry-After'));

    assert.equal(response.status, 429);
    assert.ok(retryAfter > 0 && retryAfter <= 900);
    assert.equal(body.retry_after, retryAfter);
    assert.equal(
      body.erro,
      'Muitas requisicoes. Aguarde antes de tentar novamente.'
    );
  } finally {
    server.close();
    await once(server, 'close');
  }
});

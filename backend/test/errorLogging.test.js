const assert = require('node:assert/strict');
const { test } = require('node:test');
const { criarRegistroErroSeguro } = require('../src/utils/errorLogging');

test('registro de erro nao inclui URL, token ou mensagem livre', () => {
  const registro = criarRegistroErroSeguro(
    {
      code: 'PUBLIC_APPOINTMENT_ERROR',
      message: 'Falha para token-super-secreto',
    },
    {
      method: 'GET',
      originalUrl: '/api/publico/agendamento/token-super-secreto?email=cliente@teste.com',
    },
    500
  );

  assert.deepEqual(registro, {
    codigo: 'PUBLIC_APPOINTMENT_ERROR',
    metodo: 'GET',
    status: 500,
  });
  assert.equal(JSON.stringify(registro).includes('token-super-secreto'), false);
  assert.equal(JSON.stringify(registro).includes('cliente@teste.com'), false);
});

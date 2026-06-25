const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const authServicePath = require.resolve('../src/services/authService');

function carregarAuthServiceComPool(pool) {
  delete require.cache[authServicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => pool;
  return require('../src/services/authService');
}

test('cadastrarUsuario rejeita campos obrigatorios ausentes', async () => {
  const { cadastrarUsuario } = carregarAuthServiceComPool({
    execute: async () => {
      throw new Error('Banco nao deveria ser consultado.');
    },
  });

  await assert.rejects(
    () => cadastrarUsuario({ nome: '', email: '', senha: '' }),
    (err) => err.status === 400 && err.publicMessage === 'Nome, e-mail e senha sao obrigatorios.'
  );
});

test('cadastrarUsuario rejeita e-mail invalido', async () => {
  const { cadastrarUsuario } = carregarAuthServiceComPool({
    execute: async () => {
      throw new Error('Banco nao deveria ser consultado.');
    },
  });

  await assert.rejects(
    () => cadastrarUsuario({ nome: 'Ana', email: 'email-invalido', senha: 'senha123' }),
    (err) => err.status === 400 && err.publicMessage === 'Informe um e-mail valido.'
  );
});

test('cadastrarUsuario rejeita senha curta', async () => {
  const { cadastrarUsuario } = carregarAuthServiceComPool({
    execute: async () => {
      throw new Error('Banco nao deveria ser consultado.');
    },
  });

  await assert.rejects(
    () => cadastrarUsuario({ nome: 'Ana', email: 'ana@teste.com', senha: '1234567' }),
    (err) => err.status === 400 && err.publicMessage === 'A senha deve ter pelo menos 8 caracteres.'
  );
});

test('autenticarUsuario rejeita credenciais ausentes', async () => {
  const { autenticarUsuario } = carregarAuthServiceComPool({
    execute: async () => {
      throw new Error('Banco nao deveria ser consultado.');
    },
  });

  await assert.rejects(
    () => autenticarUsuario({ email: '', senha: '' }),
    (err) => err.status === 400 && err.publicMessage === 'E-mail e senha sao obrigatorios.'
  );
});

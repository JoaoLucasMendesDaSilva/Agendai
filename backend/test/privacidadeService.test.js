const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const servicePath = require.resolve('../src/services/privacidadeService');

function carregarService(pool) {
  delete require.cache[servicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => pool;
  return require('../src/services/privacidadeService');
}

test('rejeita solicitacao LGPD sem dados obrigatorios', () => {
  const { validarSolicitacao } = carregarService({});
  assert.throws(
    () => validarSolicitacao({ nome: '', email: '', tipo: '' }),
    (erro) => erro.status === 400 && erro.publicMessage.includes('obrigatorios')
  );
});

test('rejeita tipo de solicitacao desconhecido', () => {
  const { validarSolicitacao } = carregarService({});
  assert.throws(
    () => validarSolicitacao({ nome: 'Ana', email: 'ana@teste.com', tipo: 'outro' }),
    (erro) => erro.status === 400 && erro.publicMessage === 'Tipo de solicitacao invalido.'
  );
});

test('cria solicitacao com parametros e dados normalizados', async () => {
  const chamadas = [];
  const { criarSolicitacaoPrivacidade } = carregarService({
    query: async (sql, params) => {
      chamadas.push({ sql, params });
      return { rows: [{ id: 9, tipo: 'acesso', status: 'recebida' }] };
    },
  });

  const resultado = await criarSolicitacaoPrivacidade({
    negocio_id: '20',
    nome: ' Ana ',
    email: ' ANA@TESTE.COM ',
    tipo: 'acesso',
    mensagem: ' Quero confirmar meus dados. ',
  });

  assert.deepEqual(resultado, { id: 9, tipo: 'acesso', status: 'recebida' });
  assert.match(chamadas[0].sql, /INSERT INTO solicitacoes_lgpd/);
  assert.deepEqual(chamadas[0].params, [20, 'acesso', 'Ana', 'ana@teste.com', 'Quero confirmar meus dados.']);
});

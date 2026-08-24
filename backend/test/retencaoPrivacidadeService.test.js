const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const servicePath = require.resolve('../src/services/retencaoPrivacidadeService');

function carregarService(pool) {
  delete require.cache[servicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => pool;
  return require('../src/services/retencaoPrivacidadeService');
}

test('valida limites dos dias de retencao', () => {
  const { lerDiasRetencao } = carregarService({});
  assert.equal(lerDiasRetencao('', 730, 'RETENCAO'), 730);
  assert.throws(() => lerDiasRetencao('29', 730, 'RETENCAO'));
  assert.throws(() => lerDiasRetencao('3651', 730, 'RETENCAO'));
});

test('anonimizacao individual exige negocio e e-mail validos', async () => {
  const { anonimizarTitular } = carregarService({ query: async () => ({ rowCount: 0 }) });
  await assert.rejects(() => anonimizarTitular({ negocioId: 0, email: 'ana@teste.com' }));
  await assert.rejects(() => anonimizarTitular({ negocioId: 2, email: 'invalido' }));
});

test('anonimizacao individual limita o update ao negocio e e-mail', async () => {
  const chamadas = [];
  const { anonimizarTitular } = carregarService({
    query: async (sql, params) => {
      chamadas.push({ sql, params });
      return { rowCount: 2 };
    },
  });

  assert.equal(await anonimizarTitular({ negocioId: '3', email: ' ANA@TESTE.COM ' }), 2);
  assert.match(chamadas[0].sql, /WHERE negocio_id = \$1/);
  assert.deepEqual(chamadas[0].params, [3, 'ana@teste.com']);
});

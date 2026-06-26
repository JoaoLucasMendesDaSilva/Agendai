const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const negocioServicePath = require.resolve('../src/services/negocioService');

const USUARIO_ID = 7;
const NEGOCIO_ID = 20;

function carregarNegocioServiceComPool(pool) {
  delete require.cache[negocioServicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => pool;
  return require('../src/services/negocioService');
}

function normalizarSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function ehConsultaNegocioUsuario(sql) {
  return normalizarSql(sql).includes(
    'SELECT id FROM negocios WHERE usuario_id = ? LIMIT 1'
  );
}

function ehConsultaSlug(sql) {
  return normalizarSql(sql).includes(
    'SELECT id FROM negocios WHERE slug_publico = ? LIMIT 1'
  );
}

function ehInsercaoNegocio(sql) {
  return normalizarSql(sql).includes('INSERT INTO negocios');
}

function ehConsultaNegocioPorId(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM negocios') &&
    consulta.includes('WHERE id = ? AND usuario_id = ?') &&
    consulta.includes('LIMIT 1')
  );
}

function ehAtualizacaoNegocio(sql) {
  return normalizarSql(sql).includes('UPDATE negocios SET');
}

function negocioLinha(diasFuncionamento = '[1,2,3,4,5]') {
  return {
    id: NEGOCIO_ID,
    nome: 'Studio Teste',
    slug_publico: 'studio-teste',
    descricao: null,
    telefone: '13999990000',
    endereco: 'Rua Teste, 100',
    cidade: 'Cubatao',
    horario_abertura: '08:00:00',
    horario_fechamento: '18:00:00',
    dias_funcionamento: diasFuncionamento,
    logo_url: null,
    banner_url: null,
    ativo: 1,
  };
}

function criarPoolCriacaoValida() {
  const chamadas = [];
  const pool = {
    chamadas,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocioUsuario(sql)) {
        assert.deepEqual(params, [USUARIO_ID]);
        return [[]];
      }

      if (ehConsultaSlug(sql)) {
        assert.deepEqual(params, ['studio-teste']);
        return [[]];
      }

      if (ehInsercaoNegocio(sql)) {
        assert.equal(params[0], USUARIO_ID);
        assert.equal(params[1], 'Studio Teste');
        assert.equal(params[9], '[1,3,5]');
        return [{ insertId: NEGOCIO_ID }];
      }

      if (ehConsultaNegocioPorId(sql)) {
        assert.deepEqual(params, [NEGOCIO_ID, USUARIO_ID]);
        return [[negocioLinha('[1,3,5]')]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };

  return pool;
}

function criarPoolAtualizacao(negocioAtual = negocioLinha()) {
  const chamadas = [];
  let diasFuncionamento = negocioAtual.dias_funcionamento;
  const pool = {
    chamadas,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocioPorId(sql)) {
        assert.deepEqual(params, [NEGOCIO_ID, USUARIO_ID]);
        return [[{ ...negocioAtual, dias_funcionamento: diasFuncionamento }]];
      }

      if (ehAtualizacaoNegocio(sql)) {
        assert.deepEqual(params, ['[0,6]', NEGOCIO_ID, USUARIO_ID]);
        diasFuncionamento = params[0];
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };

  return pool;
}

test('criarNegocio rejeita dias_funcionamento vazio', async () => {
  const { criarNegocio } = carregarNegocioServiceComPool({
    execute: async (sql, params) => {
      assert.ok(ehConsultaNegocioUsuario(sql));
      assert.deepEqual(params, [USUARIO_ID]);
      return [[]];
    },
  });

  await assert.rejects(
    () =>
      criarNegocio(USUARIO_ID, {
        nome: 'Studio Teste',
        dias_funcionamento: [],
      }),
    (err) =>
      err.status === 400 &&
      err.publicMessage === 'Selecione ao menos um dia de funcionamento.'
  );
});

test('atualizarNegocio rejeita dias_funcionamento vazio', async () => {
  const pool = criarPoolAtualizacao();
  const { atualizarNegocio } = carregarNegocioServiceComPool(pool);

  await assert.rejects(
    () =>
      atualizarNegocio(USUARIO_ID, NEGOCIO_ID, {
        dias_funcionamento: [],
      }),
    (err) =>
      err.status === 400 &&
      err.publicMessage === 'Selecione ao menos um dia de funcionamento.'
  );

  assert.equal(
    pool.chamadas.some(({ sql }) => ehAtualizacaoNegocio(sql)),
    false
  );
});

test('criarNegocio rejeita dias_funcionamento repetido', async () => {
  const { criarNegocio } = carregarNegocioServiceComPool({
    execute: async (sql, params) => {
      assert.ok(ehConsultaNegocioUsuario(sql));
      assert.deepEqual(params, [USUARIO_ID]);
      return [[]];
    },
  });

  await assert.rejects(
    () =>
      criarNegocio(USUARIO_ID, {
        nome: 'Studio Teste',
        dias_funcionamento: [1, 1],
      }),
    (err) =>
      err.status === 400 &&
      err.publicMessage ===
        'dias_funcionamento nao deve conter dias repetidos.'
  );
});

test('criarNegocio aceita dias_funcionamento valido', async () => {
  const pool = criarPoolCriacaoValida();
  const { criarNegocio } = carregarNegocioServiceComPool(pool);

  const negocio = await criarNegocio(USUARIO_ID, {
    nome: 'Studio Teste',
    dias_funcionamento: [1, 3, 5],
  });

  assert.deepEqual(negocio.dias_funcionamento, [1, 3, 5]);
  assert.equal(
    pool.chamadas.some(({ sql }) => ehInsercaoNegocio(sql)),
    true
  );
});

test('atualizarNegocio aceita dias_funcionamento valido', async () => {
  const pool = criarPoolAtualizacao();
  const { atualizarNegocio } = carregarNegocioServiceComPool(pool);

  const negocio = await atualizarNegocio(USUARIO_ID, NEGOCIO_ID, {
    dias_funcionamento: [0, 6],
  });

  assert.deepEqual(negocio.dias_funcionamento, [0, 6]);
  assert.equal(
    pool.chamadas.some(({ sql }) => ehAtualizacaoNegocio(sql)),
    true
  );
});

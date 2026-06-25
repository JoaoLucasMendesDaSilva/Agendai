const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const publicoServicePath = require.resolve('../src/services/publicoService');

const TOKEN_VALIDO = 'a'.repeat(64);
const TOKEN_HASH_VALIDO = 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb';

function carregarPublicoServiceComPool(pool) {
  delete require.cache[publicoServicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => pool;
  return require('../src/services/publicoService');
}

function agendamentoGerenciavel(status = 'concluido') {
  return {
    negocio_nome: 'Studio Teste',
    servico_nome: 'Corte',
    profissional_nome: 'Ana',
    cliente_nome: 'Cliente Teste',
    data_hora_inicio: '2026-07-01 10:00:00',
    data_hora_fim: '2026-07-01 11:00:00',
    status,
    observacoes: null,
  };
}

function dadosAgendamento(status = 'concluido') {
  return {
    id: 10,
    negocio_id: 20,
    servico_id: 30,
    profissional_id: 40,
    status,
    negocio_ativo: 1,
    horario_abertura: '08:00:00',
    horario_fechamento: '18:00:00',
    dias_funcionamento: '[1,2,3,4,5]',
  };
}

test('token publico invalido retorna erro 404 publico', async () => {
  const { buscarAgendamentoPublicoPorToken } = carregarPublicoServiceComPool({
    execute: async () => {
      throw new Error('Banco nao deveria ser consultado.');
    },
  });

  await assert.rejects(
    () => buscarAgendamentoPublicoPorToken('token-invalido'),
    (err) => err.status === 404
  );
});

test('buscarAgendamentoPublicoPorToken nao expoe token_publico_hash', async () => {
  const { buscarAgendamentoPublicoPorToken } = carregarPublicoServiceComPool({
    execute: async (sql, params) => {
      assert.equal(params[0], TOKEN_HASH_VALIDO);
      assert.match(sql, /WHERE a\.token_publico_hash = \?/);
      return [[{ ...agendamentoGerenciavel('confirmado'), token_publico_hash: TOKEN_HASH_VALIDO }]];
    },
  });

  const agendamento = await buscarAgendamentoPublicoPorToken(TOKEN_VALIDO);

  assert.equal(agendamento.status, 'confirmado');
  assert.equal(Object.hasOwn(agendamento, 'token_publico_hash'), false);
});

test('cancelarAgendamentoPublicoPorToken bloqueia agendamento concluido', async () => {
  let chamadas = 0;
  const { cancelarAgendamentoPublicoPorToken } = carregarPublicoServiceComPool({
    execute: async () => {
      chamadas += 1;

      if (chamadas === 1) {
        return [{ affectedRows: 0 }];
      }

      return [[agendamentoGerenciavel('concluido')]];
    },
  });

  await assert.rejects(
    () => cancelarAgendamentoPublicoPorToken(TOKEN_VALIDO),
    (err) => err.status === 409 && err.publicMessage === 'Agendamento concluido nao pode ser cancelado.'
  );
});

test('confirmarPresencaPublicaPorToken bloqueia agendamento concluido', async () => {
  let chamadas = 0;
  const { confirmarPresencaPublicaPorToken } = carregarPublicoServiceComPool({
    execute: async () => {
      chamadas += 1;

      if (chamadas === 1) {
        return [{ affectedRows: 0 }];
      }

      return [[agendamentoGerenciavel('concluido')]];
    },
  });

  await assert.rejects(
    () => confirmarPresencaPublicaPorToken(TOKEN_VALIDO),
    (err) => err.status === 409 && err.publicMessage === 'Agendamento concluido nao pode ser confirmado.'
  );
});

test('confirmarPresencaPublicaPorToken mantem retorno idempotente para confirmado', async () => {
  let chamadas = 0;
  const { confirmarPresencaPublicaPorToken } = carregarPublicoServiceComPool({
    execute: async () => {
      chamadas += 1;

      if (chamadas === 1) {
        return [{ affectedRows: 0 }];
      }

      return [[agendamentoGerenciavel('confirmado')]];
    },
  });

  const resultado = await confirmarPresencaPublicaPorToken(TOKEN_VALIDO);

  assert.equal(resultado.jaConfirmado, true);
  assert.equal(resultado.agendamento.status, 'confirmado');
});

test('listarHorariosReagendamentoPublico bloqueia agendamento concluido', async () => {
  const { listarHorariosReagendamentoPublico } = carregarPublicoServiceComPool({
    execute: async () => [[dadosAgendamento('concluido')]],
  });

  await assert.rejects(
    () => listarHorariosReagendamentoPublico(TOKEN_VALIDO, { data: '2026-07-02' }),
    (err) => err.status === 409 && err.publicMessage === 'Agendamento concluido nao pode ser reagendado.'
  );
});

test('reagendarAgendamentoPublicoPorToken bloqueia agendamento concluido', async () => {
  const connection = {
    beginTransaction: async () => {},
    execute: async () => [[dadosAgendamento('concluido')]],
    rollback: async () => {},
    release: () => {},
  };
  const { reagendarAgendamentoPublicoPorToken } = carregarPublicoServiceComPool({
    getConnection: async () => connection,
  });

  await assert.rejects(
    () =>
      reagendarAgendamentoPublicoPorToken(TOKEN_VALIDO, {
        data_hora_inicio: '2099-07-02T10:00:00',
      }),
    (err) => err.status === 409 && err.publicMessage === 'Agendamento concluido nao pode ser reagendado.'
  );
});

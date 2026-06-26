const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const agendamentosServicePath = require.resolve('../src/services/agendamentosService');

const AGENDAMENTO_ID = 10;
const NEGOCIO_ID = 20;
const PROFISSIONAL_ID = 30;
const USUARIO_ID = 40;

function carregarAgendamentosServiceComPool(pool) {
  delete require.cache[agendamentosServicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => pool;
  return require('../src/services/agendamentosService');
}

function normalizarSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function ehConsultaNegocio(sql) {
  return normalizarSql(sql).includes('SELECT id FROM negocios WHERE usuario_id = ?');
}

function ehConsultaAgendamentoParaStatus(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos') &&
    consulta.includes('profissional_id') &&
    consulta.includes('data_hora_inicio') &&
    consulta.includes('data_hora_fim') &&
    consulta.includes('WHERE id = ? AND negocio_id = ?') &&
    !consulta.includes('INNER JOIN')
  );
}

function ehConsultaConflito(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos') &&
    consulta.includes('id <> ?') &&
    consulta.includes("status IN ('pendente', 'confirmado')") &&
    consulta.includes('data_hora_inicio < ?') &&
    consulta.includes('data_hora_fim > ?')
  );
}

function ehAtualizacaoStatus(sql) {
  return normalizarSql(sql).includes('UPDATE agendamentos SET status = ?');
}

function ehConsultaDetalheAgendamento(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos a') &&
    consulta.includes('INNER JOIN servicos s') &&
    consulta.includes('INNER JOIN profissionais p') &&
    consulta.includes('WHERE a.id = ? AND a.negocio_id = ?')
  );
}

function agendamentoAlvo() {
  return {
    id: AGENDAMENTO_ID,
    profissional_id: PROFISSIONAL_ID,
    data_hora_inicio: '2026-07-01 10:00:00',
    data_hora_fim: '2026-07-01 11:00:00',
    status: 'cancelado',
  };
}

function agendamentoDetalhado(status) {
  return {
    id: AGENDAMENTO_ID,
    negocio_id: NEGOCIO_ID,
    servico_id: 50,
    servico_nome: 'Corte',
    profissional_id: PROFISSIONAL_ID,
    profissional_nome: 'Ana',
    cliente_nome: 'Cliente Teste',
    cliente_telefone: '13999990000',
    cliente_email: 'cliente@teste.com',
    data_hora_inicio: '2026-07-01 10:00:00',
    data_hora_fim: '2026-07-01 11:00:00',
    status,
    observacoes: null,
  };
}

function criarPoolAtualizacaoStatus({ status, conflitos = [] }) {
  const chamadas = [];
  const pool = {
    chamadas,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocio(sql)) {
        assert.deepEqual(params, [USUARIO_ID]);
        return [[{ id: NEGOCIO_ID }]];
      }

      if (ehConsultaAgendamentoParaStatus(sql)) {
        assert.deepEqual(params, [AGENDAMENTO_ID, NEGOCIO_ID]);
        return [[agendamentoAlvo()]];
      }

      if (ehConsultaConflito(sql)) {
        assert.deepEqual(params, [
          NEGOCIO_ID,
          PROFISSIONAL_ID,
          AGENDAMENTO_ID,
          agendamentoAlvo().data_hora_fim,
          agendamentoAlvo().data_hora_inicio,
        ]);
        return [conflitos];
      }

      if (ehAtualizacaoStatus(sql)) {
        assert.deepEqual(params, [status, AGENDAMENTO_ID, NEGOCIO_ID]);
        return [{ affectedRows: 1 }];
      }

      if (ehConsultaDetalheAgendamento(sql)) {
        assert.deepEqual(params, [AGENDAMENTO_ID, NEGOCIO_ID]);
        return [[agendamentoDetalhado(status)]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };

  return pool;
}

test('atualizarStatusAgendamento rejeita confirmado quando outro ativo sobrepoe o horario', async () => {
  const pool = criarPoolAtualizacaoStatus({
    status: 'confirmado',
    conflitos: [{ id: 99 }],
  });
  const { atualizarStatusAgendamento } = carregarAgendamentosServiceComPool(pool);

  await assert.rejects(
    () =>
      atualizarStatusAgendamento(USUARIO_ID, AGENDAMENTO_ID, {
        status: 'confirmado',
      }),
    (err) =>
      err.status === 409 &&
      err.publicMessage === 'Horario indisponivel para este profissional.'
  );

  assert.equal(pool.chamadas.some(({ sql }) => ehConsultaConflito(sql)), true);
  assert.equal(pool.chamadas.some(({ sql }) => ehAtualizacaoStatus(sql)), false);
});

test('atualizarStatusAgendamento rejeita pendente quando outro ativo sobrepoe o horario', async () => {
  const pool = criarPoolAtualizacaoStatus({
    status: 'pendente',
    conflitos: [{ id: 99 }],
  });
  const { atualizarStatusAgendamento } = carregarAgendamentosServiceComPool(pool);

  await assert.rejects(
    () =>
      atualizarStatusAgendamento(USUARIO_ID, AGENDAMENTO_ID, {
        status: 'pendente',
      }),
    (err) =>
      err.status === 409 &&
      err.publicMessage === 'Horario indisponivel para este profissional.'
  );

  assert.equal(pool.chamadas.some(({ sql }) => ehConsultaConflito(sql)), true);
  assert.equal(pool.chamadas.some(({ sql }) => ehAtualizacaoStatus(sql)), false);
});

test('atualizarStatusAgendamento nao consulta conflitos para status terminais', async () => {
  for (const status of ['cancelado', 'concluido']) {
    const pool = criarPoolAtualizacaoStatus({ status });
    const { atualizarStatusAgendamento } = carregarAgendamentosServiceComPool(pool);

    const agendamento = await atualizarStatusAgendamento(USUARIO_ID, AGENDAMENTO_ID, {
      status,
    });

    assert.equal(agendamento.status, status);
    assert.equal(pool.chamadas.some(({ sql }) => ehConsultaConflito(sql)), false);
  }
});

test('atualizarStatusAgendamento confirma quando nao existe outro ativo sobreposto', async () => {
  const pool = criarPoolAtualizacaoStatus({
    status: 'confirmado',
    conflitos: [],
  });
  const { atualizarStatusAgendamento } = carregarAgendamentosServiceComPool(pool);

  const agendamento = await atualizarStatusAgendamento(USUARIO_ID, AGENDAMENTO_ID, {
    status: 'confirmado',
  });

  const consultaConflito = pool.chamadas.find(({ sql }) => ehConsultaConflito(sql));

  assert.equal(agendamento.status, 'confirmado');
  assert.ok(consultaConflito);
  assert.match(normalizarSql(consultaConflito.sql), /id <> \?/);
  assert.deepEqual(consultaConflito.params, [
    NEGOCIO_ID,
    PROFISSIONAL_ID,
    AGENDAMENTO_ID,
    agendamentoAlvo().data_hora_fim,
    agendamentoAlvo().data_hora_inicio,
  ]);
});

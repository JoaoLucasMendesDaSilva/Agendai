const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const publicoServicePath = require.resolve('../src/services/publicoService');

const TOKEN_VALIDO = 'a'.repeat(64);
const TOKEN_HASH_VALIDO = 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb';
const NEGOCIO_ID = 20;
const SERVICO_ID = 30;
const PROFISSIONAL_ID = 40;

function carregarPublicoServiceComPool(pool) {
  delete require.cache[publicoServicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => pool;
  return require('../src/services/publicoService');
}

function normalizarSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function ehConsultaNegocioPublico(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM negocios') &&
    consulta.includes('WHERE ativo = true') &&
    consulta.includes('LIMIT 1')
  );
}

function ehConsultaNegocioPublicoPorSlug(sql) {
  return (
    ehConsultaNegocioPublico(sql) &&
    normalizarSql(sql).includes('slug_publico = ?')
  );
}

function ehConsultaNegocioPublicoPorId(sql) {
  return (
    ehConsultaNegocioPublico(sql) &&
    normalizarSql(sql).includes('id = ?')
  );
}

function ehConsultaServico(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM servicos') &&
    consulta.includes('WHERE id = ? AND negocio_id = ? AND ativo = true')
  );
}

function ehConsultaProfissional(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM profissionais') &&
    consulta.includes('WHERE id = ? AND negocio_id = ? AND ativo = true')
  );
}

function ehConsultaConflitoCriacao(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos') &&
    !consulta.includes('id <> ?') &&
    consulta.includes("status IN ('pendente', 'confirmado')") &&
    consulta.includes('data_hora_inicio < ?') &&
    consulta.includes('data_hora_fim > ?')
  );
}

function ehConsultaConflitoReagendamento(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos') &&
    consulta.includes('id <> ?') &&
    consulta.includes("status IN ('pendente', 'confirmado')") &&
    consulta.includes('data_hora_inicio < ?') &&
    consulta.includes('data_hora_fim > ?')
  );
}

function ehConsultaHorariosOcupados(sql) {
  return normalizarSql(sql).includes('SELECT data_hora_inicio, data_hora_fim');
}

function ehInsercaoAgendamento(sql) {
  return normalizarSql(sql).includes('INSERT INTO agendamentos');
}

function ehAtualizacaoReagendamento(sql) {
  return normalizarSql(sql).includes('UPDATE agendamentos SET data_hora_inicio = ?');
}

function ehConsultaAgendamentoCriado(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos') &&
    consulta.includes('WHERE id = ?') &&
    !consulta.includes('INNER JOIN')
  );
}

function ehConsultaAgendamentoPorHash(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos a') &&
    consulta.includes('INNER JOIN negocios n') &&
    consulta.includes('WHERE a.token_publico_hash = ?') &&
    !consulta.includes('INNER JOIN servicos s')
  );
}

function ehConsultaAgendamentoGerenciavel(sql) {
  const consulta = normalizarSql(sql);

  return (
    consulta.includes('FROM agendamentos a') &&
    consulta.includes('INNER JOIN servicos s') &&
    consulta.includes('INNER JOIN profissionais p') &&
    consulta.includes('WHERE a.token_publico_hash = ?')
  );
}

function negocioPublico(sobrescritos = {}) {
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
    intervalo_agendamento_minutos: 30,
    dias_funcionamento: '[0,1,2,3,4,5,6]',
    logo_url: null,
    banner_url: null,
    ...sobrescritos,
  };
}

function servicoPublico() {
  return {
    id: SERVICO_ID,
    nome: 'Corte',
    descricao: null,
    duracao_minutos: 60,
    preco: '50.00',
  };
}

function profissionalPublico() {
  return {
    id: PROFISSIONAL_ID,
    nome: 'Ana',
    especialidade: 'Cabelo',
  };
}

function payloadAgendamento(dataHoraInicio) {
  return {
    servico_id: SERVICO_ID,
    profissional_id: PROFISSIONAL_ID,
    cliente_nome: 'Cliente Teste',
    cliente_telefone: '13999990000',
    cliente_email: 'cliente@teste.com',
    data_hora_inicio: dataHoraInicio,
    observacoes: null,
  };
}

function agendamentoCriado(dataHoraInicio = '2099-07-01 08:30:00') {
  return {
    id: 99,
    servico_id: SERVICO_ID,
    profissional_id: PROFISSIONAL_ID,
    cliente_nome: 'Cliente Teste',
    cliente_telefone: '13999990000',
    cliente_email: 'cliente@teste.com',
    data_hora_inicio: dataHoraInicio,
    data_hora_fim: '2099-07-01 09:30:00',
    status: 'confirmado',
    observacoes: null,
  };
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

function dadosAgendamento(status = 'concluido', sobrescritos = {}) {
  return {
    id: 10,
    negocio_id: 20,
    servico_id: 30,
    profissional_id: 40,
    status,
    negocio_ativo: 1,
    horario_abertura: '08:00:00',
    horario_fechamento: '18:00:00',
    intervalo_agendamento_minutos: 30,
    dias_funcionamento: '[1,2,3,4,5]',
    ...sobrescritos,
  };
}

function criarPoolCriacaoPublica(negocio = negocioPublico()) {
  const chamadas = [];
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaServico(sql)) {
        assert.deepEqual(params, [SERVICO_ID, NEGOCIO_ID]);
        return [[servicoPublico()]];
      }

      if (ehConsultaProfissional(sql)) {
        assert.deepEqual(params, [PROFISSIONAL_ID, NEGOCIO_ID]);
        return [[profissionalPublico()]];
      }

      if (ehConsultaConflitoCriacao(sql)) {
        return [[]];
      }

      if (ehInsercaoAgendamento(sql)) {
        return [{ insertId: 99 }];
      }

      if (ehConsultaAgendamentoCriado(sql)) {
        assert.deepEqual(params, [99]);
        return [[agendamentoCriado()]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };
  const pool = {
    chamadas,
    getConnection: async () => connection,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocioPublico(sql)) {
        assert.deepEqual(params, ['studio-teste']);
        return [[negocio]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };

  return pool;
}

function criarPoolReagendamentoPublico(
  agendamento = dadosAgendamento('confirmado')
) {
  const chamadas = [];
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaAgendamentoPorHash(sql)) {
        assert.deepEqual(params, [TOKEN_HASH_VALIDO]);
        return [[agendamento]];
      }

      if (ehConsultaServico(sql)) {
        assert.deepEqual(params, [SERVICO_ID, NEGOCIO_ID]);
        return [[servicoPublico()]];
      }

      if (ehConsultaProfissional(sql)) {
        assert.deepEqual(params, [PROFISSIONAL_ID, NEGOCIO_ID]);
        return [[profissionalPublico()]];
      }

      if (ehConsultaConflitoReagendamento(sql)) {
        return [[]];
      }

      if (ehAtualizacaoReagendamento(sql)) {
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };
  const pool = {
    chamadas,
    getConnection: async () => connection,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaAgendamentoGerenciavel(sql)) {
        assert.deepEqual(params, [TOKEN_HASH_VALIDO]);
        return [[agendamentoGerenciavel('confirmado')]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };

  return pool;
}

function criarPoolListagemPublica(negocio = negocioPublico()) {
  const chamadas = [];
  const pool = {
    chamadas,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocioPublico(sql)) {
        assert.deepEqual(params, ['studio-teste']);
        return [[negocio]];
      }

      if (ehConsultaServico(sql)) {
        assert.deepEqual(params, [SERVICO_ID, NEGOCIO_ID]);
        return [[servicoPublico()]];
      }

      if (ehConsultaProfissional(sql)) {
        assert.deepEqual(params, [PROFISSIONAL_ID, NEGOCIO_ID]);
        return [[profissionalPublico()]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };

  return pool;
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

test('obterNegocio prioriza slug numerico antes de id', async () => {
  const { obterNegocio } = carregarPublicoServiceComPool({
    execute: async (sql, params) => {
      if (ehConsultaNegocioPublicoPorSlug(sql)) {
        assert.deepEqual(params, ['123']);
        return [[
          negocioPublico({
            id: NEGOCIO_ID,
            nome: 'Negocio 123',
            slug_publico: '123',
          }),
        ]];
      }

      if (ehConsultaNegocioPublicoPorId(sql)) {
        assert.deepEqual(params, [123]);
        return [[
          negocioPublico({
            id: 123,
            nome: 'Outro negocio',
            slug_publico: 'outro-negocio',
          }),
        ]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  });

  const negocio = await obterNegocio('123');

  assert.equal(negocio.id, NEGOCIO_ID);
  assert.equal(negocio.nome, 'Negocio 123');
  assert.equal(negocio.slug_publico, '123');
});

test('obterNegocio mantem fallback por id quando slug numerico nao existe', async () => {
  const chamadas = [];
  const { obterNegocio } = carregarPublicoServiceComPool({
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocioPublicoPorSlug(sql)) {
        assert.deepEqual(params, ['123']);
        return [[]];
      }

      if (ehConsultaNegocioPublicoPorId(sql)) {
        assert.deepEqual(params, [123]);
        return [[
          negocioPublico({
            id: 123,
            nome: 'Studio por ID',
            slug_publico: 'studio-por-id',
          }),
        ]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  });

  const negocio = await obterNegocio('123');

  assert.equal(negocio.id, 123);
  assert.equal(negocio.slug_publico, 'studio-por-id');
  assert.deepEqual(
    chamadas.map(({ params }) => params),
    [['123'], [123]]
  );
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

test('criarAgendamentoPublico rejeita horario fora da grade do negocio', async () => {
  const pool = criarPoolCriacaoPublica();
  const { criarAgendamentoPublico } = carregarPublicoServiceComPool(pool);

  await assert.rejects(
    () =>
      criarAgendamentoPublico(
        'studio-teste',
        payloadAgendamento('2099-07-01T08:15:00')
      ),
    (err) =>
      err.status === 400 &&
      err.publicMessage === 'Horario fora da grade de agendamento do negocio.'
  );

  assert.equal(
    pool.chamadas.some(({ sql }) => ehConsultaConflitoCriacao(sql)),
    false
  );
});

test('criarAgendamentoPublico aceita horario alinhado a grade do negocio', async () => {
  const pool = criarPoolCriacaoPublica();
  const { criarAgendamentoPublico } = carregarPublicoServiceComPool(pool);

  const agendamento = await criarAgendamentoPublico(
    'studio-teste',
    payloadAgendamento('2099-07-01T08:30:00')
  );

  assert.equal(agendamento.data_hora_inicio, '2099-07-01T08:30:00');
  assert.equal(agendamento.data_hora_fim, '2099-07-01T09:30:00');
  assert.equal(typeof agendamento.token_gerenciamento, 'string');
  assert.equal(agendamento.token_gerenciamento.length, 64);
  assert.equal(
    pool.chamadas.some(({ sql }) => ehConsultaConflitoCriacao(sql)),
    true
  );
});

test('criarAgendamentoPublico rejeita negocio sem dias de funcionamento', async () => {
  const pool = criarPoolCriacaoPublica(
    negocioPublico({ dias_funcionamento: '[]' })
  );
  const { criarAgendamentoPublico } = carregarPublicoServiceComPool(pool);

  await assert.rejects(
    () =>
      criarAgendamentoPublico(
        'studio-teste',
        payloadAgendamento('2099-07-01T08:30:00')
      ),
    (err) =>
      err.status === 400 &&
      err.publicMessage === 'Negocio nao atende neste dia.'
  );

  assert.equal(
    pool.chamadas.some(({ sql }) => ehConsultaConflitoCriacao(sql)),
    false
  );
});

test('reagendarAgendamentoPublicoPorToken rejeita horario fora da grade do negocio', async () => {
  const pool = criarPoolReagendamentoPublico();
  const { reagendarAgendamentoPublicoPorToken } =
    carregarPublicoServiceComPool(pool);

  await assert.rejects(
    () =>
      reagendarAgendamentoPublicoPorToken(TOKEN_VALIDO, {
        data_hora_inicio: '2099-07-01T08:15:00',
      }),
    (err) =>
      err.status === 400 &&
      err.publicMessage === 'Horario fora da grade de agendamento do negocio.'
  );

  assert.equal(
    pool.chamadas.some(({ sql }) => ehConsultaConflitoReagendamento(sql)),
    false
  );
});

test('reagendarAgendamentoPublicoPorToken rejeita negocio sem dias de funcionamento', async () => {
  const pool = criarPoolReagendamentoPublico(
    dadosAgendamento('confirmado', { dias_funcionamento: '[]' })
  );
  const { reagendarAgendamentoPublicoPorToken } =
    carregarPublicoServiceComPool(pool);

  await assert.rejects(
    () =>
      reagendarAgendamentoPublicoPorToken(TOKEN_VALIDO, {
        data_hora_inicio: '2099-07-01T08:30:00',
      }),
    (err) =>
      err.status === 400 &&
      err.publicMessage === 'Negocio nao atende neste dia.'
  );

  assert.equal(
    pool.chamadas.some(({ sql }) => ehConsultaConflitoReagendamento(sql)),
    false
  );
});

test('listarHorariosDisponiveis retorna vazio para negocio sem dias de funcionamento', async () => {
  const pool = criarPoolListagemPublica(
    negocioPublico({ dias_funcionamento: '[]' })
  );
  const { listarHorariosDisponiveis } = carregarPublicoServiceComPool(pool);

  const resultado = await listarHorariosDisponiveis('studio-teste', {
    data: '2099-07-01',
    servico_id: SERVICO_ID,
    profissional_id: PROFISSIONAL_ID,
  });

  assert.deepEqual(resultado, {
    data: '2099-07-01',
    servico_id: SERVICO_ID,
    profissional_id: PROFISSIONAL_ID,
    horarios: [],
  });
  assert.equal(
    pool.chamadas.some(({ sql }) => ehConsultaHorariosOcupados(sql)),
    false
  );
});

const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const negocioServicePath = require.resolve('../src/services/negocioService');

const USUARIO_ID = 7;
const NEGOCIO_ID = 20;
const CONSTRAINT_OWNER = 'uk_negocios_usuario_id';
const CONSTRAINT_SLUG = 'uk_negocios_slug_publico';

function adaptarPoolPostgres(pool) {
  if (!pool.query && pool.execute) {
    pool.query = async (sql, params) => {
      const [resultado] = await pool.execute(sql, params);
      return Array.isArray(resultado)
        ? { rows: resultado, rowCount: resultado.length }
        : {
            rows: resultado?.insertId ? [{ id: resultado.insertId }] : [],
            rowCount: resultado?.affectedRows || 0,
          };
    };
  }

  return pool;
}

function carregarNegocioServiceComPool(pool) {
  delete require.cache[negocioServicePath];
  require('../src/config/database');
  require.cache[databasePath].exports.getDatabasePool = () => adaptarPoolPostgres(pool);
  return require('../src/services/negocioService');
}

function normalizarSql(sql) {
  return sql.replace(/\$\d+/g, '?').replace(/\s+/g, ' ').trim();
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

function dadosCriacao(nome = 'Studio Teste') {
  return {
    nome,
    dias_funcionamento: [1, 3, 5],
    contato_privacidade: 'privacidade@studio-teste.com',
  };
}

function erroPostgres(code, constraint) {
  return Object.assign(new Error('detalhe interno'), { code, constraint });
}

function criarPoolComErroNaInsercao(erroInsercao) {
  const chamadas = [];

  return {
    chamadas,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocioUsuario(sql)) return [[]];
      if (ehInsercaoNegocio(sql)) throw erroInsercao;

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
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

      if (ehInsercaoNegocio(sql)) {
        assert.equal(params[0], USUARIO_ID);
        assert.equal(params[1], 'Studio Teste');
        assert.equal(params[2], 'studio-teste');
        assert.equal(params[7], 'privacidade@studio-teste.com');
        assert.equal(params[10], '[1,3,5]');
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
    contato_privacidade: 'privacidade@studio-teste.com',
  });

  assert.deepEqual(negocio.dias_funcionamento, [1, 3, 5]);
  assert.equal(negocio.slug_publico, 'studio-teste');
  assert.equal(
    pool.chamadas.some(({ sql }) => ehInsercaoNegocio(sql)),
    true
  );
  assert.equal(pool.chamadas.some(({ sql }) => ehConsultaSlug(sql)), false);
});

test('criarNegocio traduz conflito de owner no insert', async () => {
  const pool = criarPoolComErroNaInsercao(
    erroPostgres('23505', CONSTRAINT_OWNER)
  );
  const { criarNegocio } = carregarNegocioServiceComPool(pool);

  await assert.rejects(
    () => criarNegocio(USUARIO_ID, dadosCriacao()),
    (err) =>
      err.status === 409 &&
      err.publicMessage === 'Usuario ja possui negocio cadastrado.' &&
      !Object.hasOwn(err, 'constraint')
  );
  assert.equal(
    pool.chamadas.filter(({ sql }) => ehInsercaoNegocio(sql)).length,
    1
  );
});

test('criarNegocio preserva unique violation desconhecida', async () => {
  const erro = erroPostgres('23505', 'outra_constraint');
  const { criarNegocio } = carregarNegocioServiceComPool(
    criarPoolComErroNaInsercao(erro)
  );

  await assert.rejects(
    () => criarNegocio(USUARIO_ID, dadosCriacao()),
    (err) => err === erro
  );
});

test('criarNegocio preserva erro que nao e unique violation', async () => {
  const erro = erroPostgres('40P01');
  const { criarNegocio } = carregarNegocioServiceComPool(
    criarPoolComErroNaInsercao(erro)
  );

  await assert.rejects(
    () => criarNegocio(USUARIO_ID, dadosCriacao()),
    (err) => err === erro
  );
});

test('criarNegocio mantem lookup sequencial amigavel do owner', async () => {
  let consultas = 0;
  const { criarNegocio } = carregarNegocioServiceComPool({
    execute: async (sql, params) => {
      consultas += 1;
      assert.ok(ehConsultaNegocioUsuario(sql));
      assert.deepEqual(params, [USUARIO_ID]);
      return [[{ id: NEGOCIO_ID }]];
    },
  });

  await assert.rejects(
    () => criarNegocio(USUARIO_ID, dadosCriacao()),
    (err) =>
      err.status === 409 &&
      err.publicMessage === 'Usuario ja possui negocio cadastrado.'
  );
  assert.equal(consultas, 1);
});

test('criarNegocio evita slug publico apenas numerico', async () => {
  let slugInserido = null;
  const pool = {
    execute: async (sql, params) => {
      if (ehConsultaNegocioUsuario(sql)) {
        assert.deepEqual(params, [USUARIO_ID]);
        return [[]];
      }

      if (ehInsercaoNegocio(sql)) {
        slugInserido = params[2];
        assert.equal(params[0], USUARIO_ID);
        assert.equal(params[1], '123');
        assert.equal(slugInserido, 'negocio-123');
        return [{ insertId: NEGOCIO_ID }];
      }

      if (ehConsultaNegocioPorId(sql)) {
        assert.deepEqual(params, [NEGOCIO_ID, USUARIO_ID]);
        return [[
          {
            ...negocioLinha('[1,3,5]'),
            nome: '123',
            slug_publico: slugInserido,
          },
        ]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };
  const { criarNegocio } = carregarNegocioServiceComPool(pool);

  const negocio = await criarNegocio(USUARIO_ID, {
    nome: '123',
    dias_funcionamento: [1, 3, 5],
    contato_privacidade: 'privacidade@studio-teste.com',
  });

  assert.equal(negocio.slug_publico, 'negocio-123');
  assert.equal(/^\d+$/.test(negocio.slug_publico), false);
});

test('criarNegocio mantem sufixo em slug numerico com colisao', async () => {
  const slugsTentados = [];
  let slugInserido = null;
  const pool = {
    execute: async (sql, params) => {
      if (ehConsultaNegocioUsuario(sql)) {
        assert.deepEqual(params, [USUARIO_ID]);
        return [[]];
      }

      if (ehInsercaoNegocio(sql)) {
        slugInserido = params[2];
        slugsTentados.push(slugInserido);
        assert.equal(params[1], '123');

        if (slugInserido === 'negocio-123') {
          throw erroPostgres('23505', CONSTRAINT_SLUG);
        }

        assert.equal(slugInserido, 'negocio-123-2');
        return [{ insertId: NEGOCIO_ID }];
      }

      if (ehConsultaNegocioPorId(sql)) {
        return [[
          {
            ...negocioLinha('[1,3,5]'),
            nome: '123',
            slug_publico: slugInserido,
          },
        ]];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };
  const { criarNegocio } = carregarNegocioServiceComPool(pool);

  const negocio = await criarNegocio(USUARIO_ID, {
    nome: '123',
    dias_funcionamento: [1, 3, 5],
    contato_privacidade: 'privacidade@studio-teste.com',
  });

  assert.deepEqual(slugsTentados, ['negocio-123', 'negocio-123-2']);
  assert.equal(negocio.slug_publico, 'negocio-123-2');
});

test('criarNegocio limita tentativas de slug a 100', async () => {
  const erro = erroPostgres('23505', CONSTRAINT_SLUG);
  const pool = criarPoolComErroNaInsercao(erro);
  const { criarNegocio } = carregarNegocioServiceComPool(pool);

  await assert.rejects(
    () => criarNegocio(USUARIO_ID, dadosCriacao()),
    (err) =>
      err.status === 409 &&
      err.publicMessage === 'Nao foi possivel gerar um link publico unico.'
  );

  const insercoes = pool.chamadas.filter(({ sql }) => ehInsercaoNegocio(sql));
  assert.equal(insercoes.length, 100);
  assert.equal(insercoes[0].params[2], 'studio-teste');
  assert.equal(insercoes.at(-1).params[2], 'studio-teste-100');
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

test('atualizarNegocio preserva slug publico ao renomear', async () => {
  const chamadas = [];
  let negocio = {
    ...negocioLinha(),
    nome: 'Studio Antigo',
    slug_publico: 'studio-antigo',
  };
  const pool = {
    chamadas,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });

      if (ehConsultaNegocioPorId(sql)) return [[negocio]];

      if (ehAtualizacaoNegocio(sql)) {
        assert.doesNotMatch(normalizarSql(sql), /slug_publico/);
        assert.deepEqual(params, ['Studio Novo', NEGOCIO_ID, USUARIO_ID]);
        negocio = { ...negocio, nome: 'Studio Novo' };
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Consulta inesperada: ${normalizarSql(sql)}`);
    },
  };
  const { atualizarNegocio } = carregarNegocioServiceComPool(pool);

  const atualizado = await atualizarNegocio(USUARIO_ID, NEGOCIO_ID, {
    nome: 'Studio Novo',
  });

  assert.equal(atualizado.nome, 'Studio Novo');
  assert.equal(atualizado.slug_publico, 'studio-antigo');
  assert.equal(chamadas.some(({ sql }) => ehConsultaSlug(sql)), false);
});

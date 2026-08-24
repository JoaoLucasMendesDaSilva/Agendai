const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  MigrationRunnerError,
  calculateChecksum,
  classifyBaselineSignatures,
  classifyBaselineSnapshot,
  defaultMatches,
  discoverMigrations,
  matchesIdentitySequence,
  matchesDomainConstraint,
  matchesPersistentOwnedRelation,
  matchesUpdateFunction,
  matchesUpdateTrigger,
  migrationSetKind,
  roleSetPrivilegeForVersion,
  runMigrations,
  scanMigrationSql,
  validateHistoryRows,
} = require('../src/database/migrationRunner');
const { main, parseArguments } = require('../scripts/migrate');

const FIXTURES = path.join(__dirname, 'fixtures', 'migrations');

test('descobre migrations contíguas em ordem e preserva checksum dos bytes', async () => {
  const migrations = await discoverMigrations(path.join(FIXTURES, 'valid'));

  assert.deepEqual(migrations.map(({ version, name }) => [version, name]), [
    [1, '001_first.sql'],
    [2, '002_second.sql'],
  ]);
  assert.equal(migrations[0].checksum, calculateChecksum(migrations[0].bytes));
  assert.notEqual(
    migrations[0].checksum,
    calculateChecksum(Buffer.concat([migrations[0].bytes, Buffer.from(' ')]))
  );
});

for (const [fixture, code] of [
  ['gap', 'MIGRATION_SEQUENCE_INVALID'],
  ['duplicate', 'MIGRATION_SEQUENCE_INVALID'],
  ['invalid-name', 'MIGRATION_FILENAME_INVALID'],
  ['unknown-sql', 'MIGRATION_FILENAME_INVALID'],
]) {
  test(`rejeita diretório de migrations inválido: ${fixture}`, async () => {
    await assert.rejects(
      discoverMigrations(path.join(FIXTURES, fixture)),
      (error) => error instanceof MigrationRunnerError && error.code === code
    );
  });
}

test('histórico aceita somente o prefixo exato de nome e checksum', async () => {
  const migrations = await discoverMigrations(path.join(FIXTURES, 'valid'));
  const rows = migrations.slice(0, 1).map((migration) => ({
    checksum: migration.checksum,
    name: migration.name,
    version: migration.version,
  }));

  assert.equal(validateHistoryRows(rows, migrations).appliedCount, 1);
  assert.throws(
    () => validateHistoryRows([{ ...rows[0], name: '001_changed.sql' }], migrations),
    (error) => error.code === 'MIGRATION_HISTORY_DRIFT'
  );
  assert.throws(
    () => validateHistoryRows([{ ...rows[0], checksum: '0'.repeat(64) }], migrations),
    (error) => error.code === 'MIGRATION_HISTORY_DRIFT'
  );
  assert.throws(
    () => validateHistoryRows([{ ...rows[0], version: 2 }], migrations),
    (error) => error.code === 'MIGRATION_HISTORY_ROWS_INVALID'
  );
});

test('baseline aceita apenas prefixos estruturais completos e contíguos', () => {
  for (let prefix = 0; prefix <= 4; prefix += 1) {
    const signatures = Array.from(
      { length: 4 },
      (_, index) => (index < prefix ? 'complete' : 'absent')
    );
    assert.equal(classifyBaselineSignatures(signatures).prefix, prefix);
  }

  assert.throws(
    () => classifyBaselineSignatures(['complete', 'partial', 'absent', 'absent']),
    (error) => error.code === 'MIGRATION_BASELINE_INVALID'
  );
  assert.throws(
    () => classifyBaselineSignatures(['absent', 'complete', 'absent', 'absent']),
    (error) => error.code === 'MIGRATION_BASELINE_INVALID'
  );
});

test('rejeita UTF-8 inválido antes da execução', async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'agendai-migration-'));

  try {
    await fs.promises.writeFile(
      path.join(directory, '001_invalid_utf8.sql'),
      Buffer.from([0xc3, 0x28])
    );
    await assert.rejects(
      discoverMigrations(directory),
      (error) => error.code === 'MIGRATION_UTF8_INVALID'
    );
  } finally {
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
});

test('rejeita symlink sem ler seu conteúdo', async () => {
  const root = path.resolve('virtual-symlink-root');
  const fsApi = {
    lstat: async () => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
    }),
    readdir: async () => [
      {
        isSymbolicLink: () => true,
        name: '001_link.sql',
      },
    ],
    realpath: async () => root,
  };

  await assert.rejects(
    discoverMigrations(root, { fsApi }),
    (error) => error.code === 'MIGRATION_PATH_INVALID'
  );
});

test('rejeita deterministicamente alvo resolvido fora da raiz', async () => {
  const root = path.resolve('virtual-migration-root');
  const outside = path.resolve('virtual-outside', '001_escape.sql');
  const fileStat = {
    isDirectory: () => false,
    isFile: () => true,
    isSymbolicLink: () => false,
  };
  const rootStat = {
    isDirectory: () => true,
    isFile: () => false,
    isSymbolicLink: () => false,
  };
  const fsApi = {
    lstat: async (target) => (target === root ? rootStat : fileStat),
    readFile: async () => Buffer.from('SELECT 1;\n'),
    readdir: async () => [
      {
        isFile: () => true,
        isSymbolicLink: () => false,
        name: '001_escape.sql',
      },
    ],
    realpath: async (target) => (target === root ? root : outside),
  };

  await assert.rejects(
    discoverMigrations(root, { fsApi }),
    (error) => error.code === 'MIGRATION_PATH_INVALID'
  );
});

test('catálogo vazio é fresh e objeto parcial é STOP', () => {
  const emptySnapshot = {
    columns: [],
    constraints: [],
    extensions: [],
    functions: [],
    indexes: [],
    policies: [],
    privileges: [],
    relations: [],
    rules: [],
    sequences: [],
    triggers: [],
  };

  assert.equal(classifyBaselineSnapshot(emptySnapshot).prefix, 0);
  assert.equal(
    classifyBaselineSnapshot({
      ...emptySnapshot,
      extensions: [{ extname: 'btree_gist' }],
    }).prefix,
    0
  );
  assert.throws(
    () =>
      classifyBaselineSnapshot({
        ...emptySnapshot,
        relations: [
          {
            relkind: 'r',
            rls_enabled: false,
            rls_forced: false,
            table_name: 'usuarios',
          },
        ],
      }),
    (error) => error.code === 'MIGRATION_BASELINE_INVALID'
  );
});

test('constraints críticas exigem definição canônica sem enfraquecimento', () => {
  const baseRow = {
    columns: ['status'],
    constraint_name: 'chk_agendamentos_status',
    constraint_type: 'c',
    deferrable: false,
    deferred: false,
    foreign_columns: [],
    foreign_table: null,
    functions_catalog_only: true,
    has_no_parent: true,
    inheritance_count: 0,
    is_local: true,
    no_inherit: false,
    operators_catalog_only: true,
    table_name: 'agendamentos',
    validated: true,
  };
  const definition =
    "CHECK (status = ANY (ARRAY['pendente', 'confirmado', 'cancelado', 'concluido']))";

  assert.equal(
    matchesDomainConstraint({ ...baseRow, definition }, 'chk_agendamentos_status'),
    true
  );
  assert.equal(
    matchesDomainConstraint(
      {
        ...baseRow,
        definition:
          "CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'confirmado'::character varying, 'cancelado'::character varying, 'concluido'::character varying])::text[])))",
      },
      'chk_agendamentos_status'
    ),
    true
  );
  assert.equal(
    matchesDomainConstraint(
      { ...baseRow, definition: `${definition.slice(0, -1)} OR true)` },
      'chk_agendamentos_status'
    ),
    false
  );
  assert.equal(
    matchesDomainConstraint(
      {
        ...baseRow,
        definition:
          "CHECK (status = ANY (ARRAY['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO']))",
      },
      'chk_agendamentos_status'
    ),
    false
  );
  assert.equal(
    matchesDomainConstraint(
      { ...baseRow, functions_catalog_only: false, definition },
      'chk_agendamentos_status'
    ),
    false
  );
});

test('EXCLUDE preserva case dos status e exige dependências de catálogo', () => {
  const row = {
    columns: ['profissional_id', null],
    constraint_name: 'ex_agendamentos_profissional_periodo_ativo',
    constraint_type: 'x',
    deferrable: false,
    deferred: false,
    definition:
      "EXCLUDE USING gist (profissional_id WITH =, tsrange(data_hora_inicio, data_hora_fim, '[)') WITH &&) WHERE (status = ANY (ARRAY['pendente', 'confirmado']))",
    functions_catalog_only: true,
    has_no_parent: true,
    inheritance_count: 0,
    is_local: true,
    no_inherit: false,
    operators_catalog_only: true,
    table_name: 'agendamentos',
    validated: true,
  };

  assert.equal(
    matchesDomainConstraint(
      row,
      'ex_agendamentos_profissional_periodo_ativo'
    ),
    true
  );
  assert.equal(
    matchesDomainConstraint(
      {
        ...row,
        definition:
          "EXCLUDE USING gist (profissional_id WITH =, tsrange(data_hora_inicio, data_hora_fim, '[)') WITH &&) WHERE (status = ANY (ARRAY['PENDENTE', 'CONFIRMADO']))",
      },
      'ex_agendamentos_profissional_periodo_ativo'
    ),
    false
  );
  assert.equal(
    matchesDomainConstraint(
      { ...row, operators_catalog_only: false },
      'ex_agendamentos_profissional_periodo_ativo'
    ),
    false
  );
});

test('defaults textuais preservam case e não aceitam coluna gerada equivalente', () => {
  assert.equal(
    defaultMatches("'confirmado'::character varying", 'confirmado'),
    true
  );
  assert.equal(
    defaultMatches("'CONFIRMADO'::character varying", 'confirmado'),
    false
  );
  assert.equal(defaultMatches("'Cubatao'::character varying", 'Cubatao'), true);
  assert.equal(defaultMatches("'CUBATAO'::character varying", 'Cubatao'), false);
  assert.equal(defaultMatches(null, '0'), false);
  assert.equal(defaultMatches('0.00::numeric', '0'), true);
});

test('função e trigger de updated_at rejeitam semântica adicional', () => {
  const functionRow = {
    arguments: '',
    body: 'BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;',
    function_kind: 'f',
    function_name: 'atualizar_updated_at',
    language_name: 'plpgsql',
    leakproof: false,
    no_runtime_config: true,
    owner_name: 'migration_owner',
    parallel_safety: 'u',
    result_type: 'trigger',
    security_definer: false,
    strict: false,
    volatility: 'v',
  };
  assert.equal(matchesUpdateFunction(functionRow, 'migration_owner'), true);
  assert.equal(
    matchesUpdateFunction(
      {
        ...functionRow,
        body: 'BEGIN NEW.updated_at = CURRENT_TIMESTAMP; DELETE FROM usuarios; RETURN NEW; END;',
      },
      'migration_owner'
    ),
    false
  );

  const triggerRow = {
    argument_count: 0,
    definition:
      'CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at()',
    enabled: 'O',
    function_arguments: '',
    function_name: 'atualizar_updated_at',
    function_schema: 'public',
    no_when_clause: true,
    no_parent_trigger: true,
    no_transition_tables: true,
    table_name: 'usuarios',
    trigger_columns: '',
    trigger_name: 'trg_usuarios_updated_at',
    trigger_type: 19,
  };
  assert.equal(
    matchesUpdateTrigger(triggerRow, 'trg_usuarios_updated_at', 'usuarios'),
    true
  );
  assert.equal(
    matchesUpdateTrigger(
      {
        ...triggerRow,
        definition:
          'CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW WHEN (false) EXECUTE FUNCTION public.atualizar_updated_at()',
      },
      'trg_usuarios_updated_at',
      'usuarios'
    ),
    false
  );
  assert.equal(
    matchesUpdateTrigger(
      {
        ...triggerRow,
        definition:
          'CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public."ATUALIZAR_UPDATED_AT"()',
        function_name: 'ATUALIZAR_UPDATED_AT',
      },
      'trg_usuarios_updated_at',
      'usuarios'
    ),
    false
  );
  assert.equal(
    matchesUpdateTrigger(
      { ...triggerRow, function_schema: 'shadow_schema' },
      'trg_usuarios_updated_at',
      'usuarios'
    ),
    false
  );
});

test('relações e sequências estruturais exigem persistência normal', () => {
  const relation = {
    has_inheritance: false,
    is_partition: false,
    owner_name: 'migration_owner',
    persistence: 'p',
    relkind: 'r',
    table_name: 'usuarios',
  };
  assert.equal(
    matchesPersistentOwnedRelation(relation, 'usuarios', 'migration_owner'),
    true
  );
  assert.equal(
    matchesPersistentOwnedRelation(
      { ...relation, persistence: 'u' },
      'usuarios',
      'migration_owner'
    ),
    false
  );

  const sequence = {
    cache_size: 1,
    column_name: 'id',
    cycles: false,
    data_type: 'integer',
    increment_by: 1,
    max_value: 2147483647,
    min_value: 1,
    owner_name: 'migration_owner',
    persistence: 'p',
    sequence_name: 'usuarios_id_seq',
    start_value: 1,
    table_name: 'usuarios',
  };
  assert.equal(
    matchesIdentitySequence(sequence, 'usuarios', 'migration_owner'),
    true
  );
  assert.equal(
    matchesIdentitySequence(
      { ...sequence, persistence: 'u' },
      'usuarios',
      'migration_owner'
    ),
    false
  );
});

test('scanner ignora comandos dentro de comentários, strings e dollar bodies', async () => {
  const [migration] = await discoverMigrations(path.join(FIXTURES, 'safe-dollar'));
  assert.doesNotThrow(() => scanMigrationSql(migration.sql, migration.name));
  assert.doesNotThrow(() =>
    scanMigrationSql("-- COMMIT\nSELECT 'BEGIN; VACUUM';", '001_safe.sql')
  );
  assert.doesNotThrow(() =>
    scanMigrationSql(
      String.raw`SELECT E'aspas\' ; COMMIT; VACUUM'; SELECT 1;`,
      '001_escape.sql'
    )
  );
  assert.doesNotThrow(() =>
    scanMigrationSql("SELECT '😀; COMMIT'; SELECT 1;", '001_unicode.sql')
  );
  assert.throws(
    () => scanMigrationSql('SELECT 1; /* comentário externo /* interno */', '001_comment.sql'),
    (error) => error.code === 'MIGRATION_SQL_INVALID'
  );
});

for (const sql of [
  'ABORT;',
  'SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;',
  'SELECT foo$tag$; COMMIT; SELECT bar$tag$;',
  'SELECT café$tag$; COMMIT; SELECT baré$tag$;',
  'SELECT foo😀$tag$; COMMIT; SELECT bar😀$tag$;',
]) {
  test(`scanner não permite esconder controle transacional: ${sql}`, () => {
    assert.throws(
      () => scanMigrationSql(sql, '001_hidden.sql'),
      (error) => error.code === 'MIGRATION_TRANSACTION_CONTROL'
    );
  });
}

for (const [fixture, code] of [
  ['unsafe-transaction', 'MIGRATION_TRANSACTION_CONTROL'],
  ['unsafe-nontransactional', 'MIGRATION_NON_TRANSACTIONAL'],
]) {
  test(`scanner rejeita SQL inseguro: ${fixture}`, async () => {
    await assert.rejects(
      discoverMigrations(path.join(FIXTURES, fixture)),
      (error) => error.code === code
    );
  });
}

test('parser aceita somente ajuda isolada ou confirmação inline', () => {
  assert.deepEqual(parseArguments(['--help']), {
    baselineExisting: false,
    confirmDatabase: null,
    help: true,
  });
  assert.deepEqual(parseArguments(['--confirm-database=agendai_test']), {
    baselineExisting: false,
    confirmDatabase: 'agendai_test',
    help: false,
  });
  assert.deepEqual(
    parseArguments(['--baseline-existing', '--confirm-database=agendai_test']),
    {
      baselineExisting: true,
      confirmDatabase: 'agendai_test',
      help: false,
    }
  );
});

test('seleção de privilégio SET ROLE é portátil entre PostgreSQL 15 e 16+', () => {
  assert.equal(roleSetPrivilegeForVersion(150000), 'MEMBER');
  assert.equal(roleSetPrivilegeForVersion(159999), 'MEMBER');
  assert.equal(roleSetPrivilegeForVersion(160000), 'SET');
  assert.equal(roleSetPrivilegeForVersion(170000), 'SET');
  assert.throws(
    () => roleSetPrivilegeForVersion(140000),
    (error) => error.code === 'MIGRATION_POSTGRES_VERSION_UNSUPPORTED'
  );
});

test('conjunto oficial futuro exige atualização explícita do inspetor', () => {
  const active = [
    '001_create_schema.sql',
    '002_add_business_branding.sql',
    '003_add_public_appointment_token.sql',
    '004_harden_supabase_data_boundary.sql',
  ].map((name) => ({ name }));

  assert.equal(migrationSetKind(active), 'active');
  assert.equal(
    migrationSetKind([...active, { name: '005_future.sql' }]),
    'unsupported-active-prefix'
  );
  assert.equal(
    migrationSetKind([{ name: '001_fixture.sql' }]),
    'generic'
  );
});

for (const args of [
  [],
  ['--unknown'],
  ['positional'],
  ['--confirm-database', 'agendai_test'],
  ['--confirm-database='],
  ['--confirm-database=agendai_test', '--confirm-database=agendai_test'],
  ['--baseline-existing', '--baseline-existing', '--confirm-database=agendai_test'],
  ['--help', '--confirm-database=agendai_test'],
  ['--confirm-database=agendai\n_test'],
]) {
  test(`parser rejeita argumentos inválidos: ${JSON.stringify(args)}`, () => {
    assert.throws(() => parseArguments(args), (error) => error.code === 'MIGRATION_CLI_ARGUMENT');
  });
}

test('falha de stdout após commit não é reportada como falha de migration', async () => {
  let runCalls = 0;
  let stderrText = '';
  const exitCode = await main({
    argv: ['--confirm-database=agendai_test'],
    loadDependencies: async () => ({
      buildDatabaseConfig: () => ({ database: 'agendai_test' }),
      Client: class FakeClient {},
      loadDatabaseEnvironment: () => {},
      runMigrations: async () => {
        runCalls += 1;
        return { database: 'agendai_test', discovered: 4 };
      },
    }),
    stderr: {
      write(message) {
        stderrText += message;
      },
    },
    stdout: {
      write() {
        const error = new Error('broken pipe');
        error.code = 'EPIPE';
        throw error;
      },
    },
  });

  assert.equal(exitCode, 2);
  assert.equal(runCalls, 1);
  assert.match(stderrText, /migrations foram confirmadas/i);
  assert.doesNotMatch(stderrText, /execução de migrations falhou/i);
});

test('EPIPE assíncrono após commit também preserva outcome confirmado', async () => {
  class BrokenOutput extends EventEmitter {
    write(message, callback) {
      queueMicrotask(() => {
        const error = new Error('broken pipe');
        error.code = 'EPIPE';
        this.emit('error', error);
        callback(error);
      });
      return false;
    }
  }

  let stderrText = '';
  const exitCode = await main({
    argv: ['--confirm-database=agendai_test'],
    loadDependencies: async () => ({
      buildDatabaseConfig: () => ({ database: 'agendai_test' }),
      Client: class FakeClient {},
      loadDatabaseEnvironment: () => {},
      runMigrations: async () => ({
        database: 'agendai_test',
        discovered: 4,
      }),
    }),
    stderr: {
      write(message) {
        stderrText += message;
      },
    },
    stdout: new BrokenOutput(),
  });

  assert.equal(exitCode, 2);
  assert.match(stderrText, /migrations foram confirmadas/i);
});

function createFakeClient({
  database = 'agendai_test',
  failEnd = false,
  failOn,
  serverVersionNum = 170000,
} = {}) {
  const calls = [];
  let endCalls = 0;

  return {
    calls,
    get endCalls() {
      return endCalls;
    },
    async connect() {
      calls.push('CONNECT');
      if (failOn === 'CONNECT') throw new Error('detalhe sensível de conexão');
    },
    async end() {
      endCalls += 1;
      calls.push('END');
      if (failEnd) throw new Error('detalhe sensível de cleanup');
    },
    async query(query, values) {
      const text = typeof query === 'string' ? query : query.text;
      const normalized = text.trim();
      calls.push(normalized);
      if (failOn && normalized === failOn) throw new Error('detalhe sensível do banco');
      if (text.includes('current_database()')) {
        return {
          rows: [
            {
              database_name: database,
              database_user: 'migration_owner',
              current_schema_name: 'public',
              server_version_num: serverVersionNum,
            },
          ],
        };
      }
      return { rows: [], rowCount: 0, values };
    },
  };
}

function createStateInspector({
  historyExists = false,
  historyRows = [],
  prefix = 0,
} = {}) {
  let calls = 0;

  return async (client, { migrations }) => {
    calls += 1;
    if (calls === 1) return { historyExists, historyRows, prefix };

    return {
      historyExists: true,
      historyRows: migrations.map((migration) => ({
        checksum: migration.checksum,
        name: migration.name,
        version: migration.version,
      })),
      prefix: migrations.length,
    };
  };
}

test('runner usa um cliente, lock transacional, confirmação e commit na ordem', async () => {
  const client = createFakeClient();
  const result = await runMigrations({
    confirmDatabase: 'agendai_test',
    createClient: () => client,
    migrationsDirectory: path.join(FIXTURES, 'valid'),
    stateInspector: createStateInspector(),
  });

  const begin = client.calls.indexOf(
    'BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE'
  );
  const timeout = client.calls.findIndex((call) =>
    call.includes('migration-runner:session-timeouts')
  );
  const lock = client.calls.findIndex((call) => call.includes('pg_advisory_xact_lock'));
  const identity = client.calls.findIndex((call) => call.includes('current_database()'));
  const commit = client.calls.indexOf('COMMIT');
  assert.equal(client.calls[0], 'CONNECT');
  assert.ok(
    begin >= 0 &&
      begin < timeout &&
      timeout < lock &&
      lock < identity &&
      identity < commit
  );
  assert.match(client.calls[lock], /pg_catalog\.hashtextextended/);
  assert.match(client.calls[identity], /pg_catalog\.current_database/);
  assert.ok(
    client.calls.some((call) =>
      call.includes("set_config('search_path', 'public, pg_temp', true)")
    )
  );
  assert.equal(client.calls.at(-1), 'END');
  assert.equal(client.endCalls, 1);
  assert.equal(result.database, 'agendai_test');
  assert.equal(result.discovered, 2);
});

test('PoolClient já conectado não reconecta, usa config local e é liberado', async () => {
  const base = createFakeClient();
  let releaseCalls = 0;
  const poolClient = {
    ...base,
    async connect() {
      throw new Error('PoolClient não pode reconectar');
    },
    async end() {
      throw new Error('PoolClient não pode encerrar o pool');
    },
    async release() {
      releaseCalls += 1;
    },
  };

  await runMigrations({
    confirmDatabase: 'agendai_test',
    createClient: () => poolClient,
    migrationsDirectory: path.join(FIXTURES, 'valid'),
    stateInspector: createStateInspector(),
  });

  assert.equal(releaseCalls, 1);
  assert.equal(poolClient.calls.includes('CONNECT'), false);
  const timeoutQuery = poolClient.calls.find((call) =>
    call.includes('migration-runner:session-timeouts')
  );
  assert.match(timeoutQuery, /lock_timeout', \$1, true/);
  assert.match(timeoutQuery, /statement_timeout', \$2, true/);
});

test('PoolClient com COMMIT desconhecido é removido do pool', async () => {
  const base = createFakeClient({ failOn: 'COMMIT' });
  let releaseArgument;
  const poolClient = {
    ...base,
    async release(error) {
      releaseArgument = error;
    },
  };

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => poolClient,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) => error.code === 'MIGRATION_COMMIT_UNKNOWN'
  );
  assert.equal(releaseArgument, true);
  assert.equal(poolClient.calls.includes('ROLLBACK'), false);
});

test('runner faz rollback e encerra uma vez em falha após BEGIN', async () => {
  const client = createFakeClient({ failOn: '/* migration-runner:validate-state */ SELECT 1' });

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => client,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) => error.code === 'MIGRATION_EXECUTION_FAILED' && !error.message.includes('sensível')
  );
  assert.ok(client.calls.includes('ROLLBACK'));
  assert.equal(client.endCalls, 1);
});

test('falha de conexão é sanitizada e ainda encerra o cliente uma vez', async () => {
  const client = createFakeClient({ failOn: 'CONNECT' });

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => client,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) =>
      error.code === 'MIGRATION_CONNECTION_FAILED' &&
      !error.message.includes('sensível')
  );
  assert.equal(client.endCalls, 1);
});

test('falha de COMMIT tem resultado desconhecido, não faz rollback e encerra', async () => {
  const client = createFakeClient({ failOn: 'COMMIT' });

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => client,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) =>
      error.code === 'MIGRATION_COMMIT_UNKNOWN' &&
      error.retryable === false &&
      !error.message.includes('sensível')
  );
  assert.equal(client.calls.includes('ROLLBACK'), false);
  assert.equal(client.endCalls, 1);
});

test('falha de cleanup após COMMIT preserva resultado confirmado e proíbe retry', async () => {
  const client = createFakeClient({ failEnd: true });

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => client,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) =>
      error.code === 'MIGRATION_CLIENT_RELEASE_FAILED' &&
      error.retryable === false &&
      /confirmadas/.test(error.message) &&
      !error.message.includes('sensível')
  );
  assert.equal(client.calls.includes('COMMIT'), true);
  assert.equal(client.calls.includes('ROLLBACK'), false);
  assert.equal(client.endCalls, 1);
});

test('confirmação divergente aborta dentro da transação e encerra', async () => {
  const client = createFakeClient({ database: 'outro_banco' });

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => client,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) => error.code === 'MIGRATION_DATABASE_MISMATCH'
  );
  assert.ok(client.calls.includes('ROLLBACK'));
  assert.equal(client.endCalls, 1);
});

test('rejeita PostgreSQL anterior à versão mínima antes de inspecionar catálogo', async () => {
  const client = createFakeClient({ serverVersionNum: 140000 });

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => client,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) => error.code === 'MIGRATION_POSTGRES_VERSION_UNSUPPORTED'
  );
  assert.ok(client.calls.includes('ROLLBACK'));
});

test('baselineExisting exige boolean exato antes de criar cliente', async () => {
  let createCalls = 0;

  await assert.rejects(
    runMigrations({
      baselineExisting: 'false',
      confirmDatabase: 'agendai_test',
      createClient: () => {
        createCalls += 1;
        return createFakeClient();
      },
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector(),
    }),
    (error) => error.code === 'MIGRATION_OPTIONS_INVALID'
  );
  assert.equal(createCalls, 0);
});

test('baseline registra prefixo validado e aplica somente o sufixo', async () => {
  const client = createFakeClient();
  const result = await runMigrations({
    baselineExisting: true,
    confirmDatabase: 'agendai_test',
    createClient: () => client,
    migrationsDirectory: path.join(FIXTURES, 'valid'),
    stateInspector: createStateInspector({ prefix: 1 }),
  });

  assert.deepEqual(result.baselined, ['001_first.sql']);
  assert.deepEqual(result.applied, ['002_second.sql']);
  assert.equal(client.calls.includes("SELECT 'primeira';"), false);
  assert.equal(client.calls.includes("SELECT 'segunda';"), true);
});

test('schema existente sem histórico exige confirmação explícita de baseline', async () => {
  const client = createFakeClient();

  await assert.rejects(
    runMigrations({
      confirmDatabase: 'agendai_test',
      createClient: () => client,
      migrationsDirectory: path.join(FIXTURES, 'valid'),
      stateInspector: createStateInspector({ prefix: 1 }),
    }),
    (error) => error.code === 'MIGRATION_BASELINE_REQUIRED'
  );
  assert.ok(client.calls.includes('ROLLBACK'));
});

test('segunda execução válida não reaplica SQL nem recria histórico', async () => {
  const migrations = await discoverMigrations(path.join(FIXTURES, 'valid'));
  const historyRows = migrations.map((migration) => ({
    checksum: migration.checksum,
    name: migration.name,
    version: migration.version,
  }));
  const client = createFakeClient();
  const stateInspector = async () => ({
    historyExists: true,
    historyRows,
    prefix: migrations.length,
  });
  const result = await runMigrations({
    confirmDatabase: 'agendai_test',
    createClient: () => client,
    migrationsDirectory: path.join(FIXTURES, 'valid'),
    stateInspector,
  });

  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.baselined, []);
  assert.equal(client.calls.some((call) => call.includes('create-history')), false);
  assert.equal(client.calls.includes("SELECT 'primeira';"), false);
  assert.equal(client.calls.includes("SELECT 'segunda';"), false);
});

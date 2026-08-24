const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  PostgresTestGuardError,
  createPostgresTestHarness,
  isAllowedServerAddress,
  validatePostgresTestEnvironment,
} = require('./postgresTestHarness');

const FAKE_TEST_URL =
  'postgresql://fixture_user:not-a-secret@127.0.0.1:5432/agendai_test';

function fakeEnvironment(overrides = {}) {
  return {
    CONFIRM_POSTGRES_TEST_DB: 'agendai_test',
    DATABASE_TEST_URL: FAKE_TEST_URL,
    NODE_ENV: 'test',
    RUN_POSTGRES_INTEGRATION: '1',
    ...overrides,
  };
}

function fakeDatabaseConfig(overrides = {}) {
  return {
    database: 'agendai_test',
    host: '127.0.0.1',
    password: 'not-a-secret',
    port: 5432,
    ssl: false,
    user: 'fixture_user',
    ...overrides,
  };
}

function assertGuardError(code) {
  return (error) =>
    error instanceof PostgresTestGuardError && error.code === code;
}

test('flag ausente desabilita a integração sem carregar config ou criar cliente', async () => {
  let builderCalls = 0;
  let clientConstructions = 0;
  const environment = { NODE_ENV: 'test' };
  const buildDatabaseConfig = () => {
    builderCalls += 1;
    return fakeDatabaseConfig();
  };
  class SocketSentinelClient {
    constructor() {
      clientConstructions += 1;
      throw new Error('cliente não deveria ser construído');
    }
  }

  const guard = validatePostgresTestEnvironment(environment, {
    buildDatabaseConfig,
  });
  const harness = await createPostgresTestHarness({
    ClientClass: SocketSentinelClient,
    buildDatabaseConfig,
    environment,
  });

  assert.equal(guard.enabled, false);
  assert.equal(harness.enabled, false);
  assert.equal(builderCalls, 0);
  assert.equal(clientConstructions, 0);
});

for (const [name, environment, expectedCode] of [
  [
    'flag de execução inexata',
    fakeEnvironment({ RUN_POSTGRES_INTEGRATION: 'true' }),
    'POSTGRES_TEST_RUN_FLAG_INVALID',
  ],
  [
    'ambiente de produção',
    fakeEnvironment({ NODE_ENV: ' production ' }),
    'POSTGRES_TEST_PRODUCTION_FORBIDDEN',
  ],
  [
    'URL ausente',
    fakeEnvironment({ DATABASE_TEST_URL: '' }),
    'POSTGRES_TEST_URL_MISSING',
  ],
  [
    'host remoto',
    fakeEnvironment({
      DATABASE_TEST_URL:
        'postgresql://fixture_user:not-a-secret@db.example.invalid/agendai_test',
    }),
    'POSTGRES_TEST_REMOTE_FORBIDDEN',
  ],
  [
    'query string',
    fakeEnvironment({ DATABASE_TEST_URL: `${FAKE_TEST_URL}?sslmode=disable` }),
    'POSTGRES_TEST_URL_OPTIONS_FORBIDDEN',
  ],
  [
    'fragmento',
    fakeEnvironment({ DATABASE_TEST_URL: `${FAKE_TEST_URL}#local` }),
    'POSTGRES_TEST_URL_OPTIONS_FORBIDDEN',
  ],
]) {
  test(`guard rejeita ${name} antes de construir config`, () => {
    let builderCalls = 0;

    assert.throws(
      () =>
        validatePostgresTestEnvironment(environment, {
          buildDatabaseConfig: () => {
            builderCalls += 1;
            return fakeDatabaseConfig();
          },
        }),
      assertGuardError(expectedCode)
    );
    assert.equal(builderCalls, 0);
  });
}

for (const [name, environment, config, expectedCode] of [
  [
    'connectionString repassada ao driver',
    fakeEnvironment(),
    fakeDatabaseConfig({ connectionString: FAKE_TEST_URL }),
    'POSTGRES_TEST_CONFIG_UNSAFE',
  ],
  [
    'host discreto divergente',
    fakeEnvironment(),
    fakeDatabaseConfig({ host: 'db.example.invalid' }),
    'POSTGRES_TEST_CONFIG_UNSAFE',
  ],
  [
    'banco discreto divergente da URL',
    fakeEnvironment(),
    fakeDatabaseConfig({ database: 'outro_test' }),
    'POSTGRES_TEST_CONFIG_UNSAFE',
  ],
  [
    'nome sem token test isolado',
    fakeEnvironment({
      CONFIRM_POSTGRES_TEST_DB: 'contest',
      DATABASE_TEST_URL:
        'postgresql://fixture_user:not-a-secret@127.0.0.1:5432/contest',
    }),
    fakeDatabaseConfig({ database: 'contest' }),
    'POSTGRES_TEST_DATABASE_NAME_UNSAFE',
  ],
  [
    'confirmação divergente',
    fakeEnvironment({ CONFIRM_POSTGRES_TEST_DB: 'outro_test' }),
    fakeDatabaseConfig(),
    'POSTGRES_TEST_CONFIRMATION_MISMATCH',
  ],
  [
    'flag de roles inexata',
    fakeEnvironment({ RUN_POSTGRES_ROLE_FIXTURES: 'true' }),
    fakeDatabaseConfig(),
    'POSTGRES_ROLE_FIXTURE_FLAG_INVALID',
  ],
  [
    'roles fora do CI descartável',
    fakeEnvironment({ RUN_POSTGRES_ROLE_FIXTURES: '1' }),
    fakeDatabaseConfig(),
    'POSTGRES_ROLE_FIXTURE_CI_ONLY',
  ],
]) {
  test(`guard rejeita ${name}`, () => {
    assert.throws(
      () =>
        validatePostgresTestEnvironment(environment, {
          buildDatabaseConfig: () => config,
        }),
      assertGuardError(expectedCode)
    );
  });
}

test('guard constrói somente campos discretos a partir de ambiente isolado', () => {
  const ambientDatabaseUrl = process.env.DATABASE_URL;
  const environment = fakeEnvironment({
    CONFIRM_POSTGRES_TEST_DB: 'agendai_test',
    DATABASE_TEST_URL:
      'postgresql://fixture%5Fuser:not-a-secret@localhost:5432/agendai%5Ftest',
  });
  let receivedEnvironment;
  const guard = validatePostgresTestEnvironment(environment, {
    buildDatabaseConfig: (isolatedEnvironment) => {
      receivedEnvironment = isolatedEnvironment;
      return fakeDatabaseConfig({ host: 'localhost' });
    },
  });

  assert.equal(guard.enabled, true);
  assert.equal(guard.runRoleFixtures, false);
  assert.equal(Object.hasOwn(guard.clientConfig, 'connectionString'), false);
  assert.equal(guard.clientConfig.ssl, false);
  assert.deepEqual(receivedEnvironment, {
    DATABASE_SSL_MODE: 'disable',
    DATABASE_URL: environment.DATABASE_TEST_URL,
    NODE_ENV: 'test',
  });
  assert.equal(process.env.DATABASE_URL, ambientDatabaseUrl);
});

test('guard aceita endereço privado do serviço somente no GitHub Actions', () => {
  const githubActionsEnvironment = {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
  };

  assert.equal(
    isAllowedServerAddress('172.18.0.2', githubActionsEnvironment),
    true
  );
  assert.equal(
    isAllowedServerAddress(
      '::ffff:172.18.0.2',
      githubActionsEnvironment
    ),
    true
  );
  assert.equal(
    isAllowedServerAddress('172.18.0.2', { CI: 'true' }),
    false
  );
  assert.equal(
    isAllowedServerAddress('::ffff:172.18.0.2', { CI: 'true' }),
    false
  );
  assert.equal(isAllowedServerAddress('203.0.113.10', {}), false);
});

test('guard valida o IP completo e mantém endereço ausente fail-closed', () => {
  const githubActionsEnvironment = {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
  };

  for (const address of [
    null,
    undefined,
    ['127.0.0.1'],
    '',
    'null',
    '127.evil',
    '127.0.0.1.example',
    '::ffff:127.evil',
    '172.18.0.2/32',
    '::ffff:203.0.113.10',
  ]) {
    assert.equal(
      isAllowedServerAddress(address, githubActionsEnvironment),
      false,
      String(address)
    );
  }

  assert.equal(isAllowedServerAddress('127.0.0.1', {}), true);
  assert.equal(isAllowedServerAddress('127.7.8.9', {}), true);
  assert.equal(isAllowedServerAddress('::1', {}), true);
  assert.equal(isAllowedServerAddress('::ffff:127.0.0.1', {}), true);
});

test('harness confirma identidade antes de permitir limpeza', async () => {
  const calls = [];
  class FakeClient {
    constructor(config) {
      assert.equal(Object.hasOwn(config, 'connectionString'), false);
      calls.push('construct');
    }

    async connect() {
      calls.push('connect');
    }

    async query(sql) {
      if (sql.includes('current_database()')) {
        assert.match(
          sql,
          /pg_catalog\.host\(pg_catalog\.inet_server_addr\(\)\)/
        );
        assert.doesNotMatch(sql, /inet_server_addr\(\)::text/);
        calls.push('identity');
        return {
          rows: [
            {
              database_name: 'agendai_test',
              server_address: '127.0.0.1',
              session_user_name: 'fixture_user',
            },
          ],
        };
      }

      calls.push(sql.trim());
      return { rowCount: 0, rows: [] };
    }

    async end() {
      calls.push('end');
    }
  }

  const harness = await createPostgresTestHarness({
    ClientClass: FakeClient,
    buildDatabaseConfig: () => fakeDatabaseConfig(),
    environment: fakeEnvironment(),
  });

  await harness.resetPublicSchema();
  await harness.close();

  assert.deepEqual(calls, [
    'construct',
    'connect',
    'identity',
    'DROP SCHEMA IF EXISTS public CASCADE',
    'CREATE SCHEMA public',
    'end',
  ]);
});

test('harness fecha o cliente quando a identidade pós-conexão diverge', async () => {
  const calls = [];
  class MismatchedClient {
    async connect() {
      calls.push('connect');
    }

    async query() {
      calls.push('identity');
      return {
        rows: [
          {
            database_name: 'agendai_test',
            server_address: '203.0.113.10',
            session_user_name: 'fixture_user',
          },
        ],
      };
    }

    async end() {
      calls.push('end');
    }
  }

  await assert.rejects(
    createPostgresTestHarness({
      ClientClass: MismatchedClient,
      buildDatabaseConfig: () => fakeDatabaseConfig(),
      environment: fakeEnvironment(),
    }),
    assertGuardError('POSTGRES_TEST_CONNECTED_IDENTITY_MISMATCH')
  );
  assert.deepEqual(calls, ['connect', 'identity', 'end']);
});

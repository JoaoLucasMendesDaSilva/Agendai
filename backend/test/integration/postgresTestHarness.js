const net = require('node:net');

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const TEST_DATABASE_PATTERN = /(^|[_-])test([_-]|$)/i;

class PostgresTestGuardError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PostgresTestGuardError';
    this.code = code;
  }
}

function guardError(code, message) {
  return new PostgresTestGuardError(code, message);
}

function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
}

function isLoopbackHostname(hostname) {
  return LOOPBACK_HOSTS.has(normalizeHostname(hostname));
}

function hasStandaloneTestToken(databaseName) {
  return TEST_DATABASE_PATTERN.test(String(databaseName || ''));
}

function isGithubActionsPrivateAddress(address) {
  const normalized = String(address || '').toLowerCase();
  const ipVersion = net.isIP(normalized);

  if (ipVersion === 4) {
    const octets = normalized.split('.').map(Number);
    return (
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  }

  if (ipVersion === 6) {
    return normalized.startsWith('fc') || normalized.startsWith('fd');
  }

  return false;
}

function isAllowedServerAddress(address, environment) {
  const normalized = String(address || '').toLowerCase();

  if (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.startsWith('127.') ||
    normalized.startsWith('::ffff:127.')
  ) {
    return true;
  }

  return (
    environment.CI === 'true' &&
    environment.GITHUB_ACTIONS === 'true' &&
    isGithubActionsPrivateAddress(normalized)
  );
}

function parseRequestedUrl(rawUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    throw guardError(
      'POSTGRES_TEST_URL_INVALID',
      'DATABASE_TEST_URL deve ser uma URL PostgreSQL válida.'
    );
  }

  if (
    !['postgres:', 'postgresql:'].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    !parsedUrl.username ||
    parsedUrl.pathname === '/'
  ) {
    throw guardError(
      'POSTGRES_TEST_URL_INVALID',
      'DATABASE_TEST_URL deve ser uma URL PostgreSQL válida.'
    );
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw guardError(
      'POSTGRES_TEST_URL_OPTIONS_FORBIDDEN',
      'DATABASE_TEST_URL não aceita parâmetros ou fragmentos.'
    );
  }

  return parsedUrl;
}

function decodeUrlComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    throw guardError(
      'POSTGRES_TEST_URL_INVALID',
      'DATABASE_TEST_URL deve ser uma URL PostgreSQL válida.'
    );
  }
}

function loadDatabaseConfigBuilder() {
  return require('../../src/config/database').buildDatabaseConfig;
}

function validatePostgresTestEnvironment(environment = process.env, options = {}) {
  if (!Object.hasOwn(environment, 'RUN_POSTGRES_INTEGRATION')) {
    return {
      enabled: false,
      reason: 'RUN_POSTGRES_INTEGRATION ausente.',
    };
  }

  if (environment.RUN_POSTGRES_INTEGRATION !== '1') {
    throw guardError(
      'POSTGRES_TEST_RUN_FLAG_INVALID',
      'RUN_POSTGRES_INTEGRATION deve ser exatamente 1.'
    );
  }

  const nodeEnvironment = String(environment.NODE_ENV || '')
    .trim()
    .toLowerCase();

  if (nodeEnvironment === 'production') {
    throw guardError(
      'POSTGRES_TEST_PRODUCTION_FORBIDDEN',
      'Testes PostgreSQL destrutivos não podem executar em produção.'
    );
  }

  const rawTestUrl = String(environment.DATABASE_TEST_URL || '').trim();

  if (!rawTestUrl) {
    throw guardError(
      'POSTGRES_TEST_URL_MISSING',
      'DATABASE_TEST_URL é obrigatória para a integração PostgreSQL.'
    );
  }

  const parsedUrl = parseRequestedUrl(rawTestUrl);

  if (!isLoopbackHostname(parsedUrl.hostname)) {
    throw guardError(
      'POSTGRES_TEST_REMOTE_FORBIDDEN',
      'DATABASE_TEST_URL deve apontar para um host loopback.'
    );
  }

  const requestedDatabase = decodeUrlComponent(
    parsedUrl.pathname.replace(/^\//, '')
  );
  const requestedPort = parsedUrl.port ? Number(parsedUrl.port) : 5432;
  const requestedUser = decodeUrlComponent(parsedUrl.username);

  const buildDatabaseConfig =
    options.buildDatabaseConfig || loadDatabaseConfigBuilder();
  let clientConfig;

  try {
    clientConfig = buildDatabaseConfig({
      DATABASE_URL: rawTestUrl,
      DATABASE_SSL_MODE: 'disable',
      NODE_ENV: nodeEnvironment || 'test',
    });
  } catch (error) {
    throw guardError(
      'POSTGRES_TEST_CONFIG_INVALID',
      'A configuração da integração PostgreSQL é inválida.'
    );
  }

  if (
    !clientConfig ||
    Object.hasOwn(clientConfig, 'connectionString') ||
    !isLoopbackHostname(clientConfig.host) ||
    normalizeHostname(clientConfig.host) !==
      normalizeHostname(parsedUrl.hostname) ||
    clientConfig.database !== requestedDatabase ||
    clientConfig.port !== requestedPort ||
    clientConfig.ssl !== false ||
    clientConfig.user !== requestedUser
  ) {
    throw guardError(
      'POSTGRES_TEST_CONFIG_UNSAFE',
      'A configuração da integração PostgreSQL não é segura.'
    );
  }

  const databaseName = requestedDatabase;
  const confirmedDatabase = environment.CONFIRM_POSTGRES_TEST_DB;

  if (!hasStandaloneTestToken(databaseName)) {
    throw guardError(
      'POSTGRES_TEST_DATABASE_NAME_UNSAFE',
      'O banco de integração deve conter o token isolado test.'
    );
  }

  if (
    typeof confirmedDatabase !== 'string' ||
    confirmedDatabase !== databaseName
  ) {
    throw guardError(
      'POSTGRES_TEST_CONFIRMATION_MISMATCH',
      'A confirmação do banco de integração não corresponde ao alvo.'
    );
  }

  let runRoleFixtures = false;

  if (Object.hasOwn(environment, 'RUN_POSTGRES_ROLE_FIXTURES')) {
    if (environment.RUN_POSTGRES_ROLE_FIXTURES !== '1') {
      throw guardError(
        'POSTGRES_ROLE_FIXTURE_FLAG_INVALID',
        'RUN_POSTGRES_ROLE_FIXTURES deve ser exatamente 1 quando presente.'
      );
    }

    if (
      environment.CI !== 'true' ||
      environment.GITHUB_ACTIONS !== 'true'
    ) {
      throw guardError(
        'POSTGRES_ROLE_FIXTURE_CI_ONLY',
        'Fixtures de papéis PostgreSQL são permitidas somente no CI descartável.'
      );
    }

    runRoleFixtures = true;
  }

  return {
    clientConfig: {
      database: requestedDatabase,
      host: normalizeHostname(parsedUrl.hostname),
      password: clientConfig.password,
      port: requestedPort,
      ssl: false,
      user: requestedUser,
      connectionTimeoutMillis: 5_000,
      query_timeout: 30_000,
    },
    databaseName,
    enabled: true,
    expectedSessionUser: requestedUser,
    runRoleFixtures,
    serverAddressEnvironment: Object.freeze({
      CI: environment.CI,
      GITHUB_ACTIONS: environment.GITHUB_ACTIONS,
    }),
  };
}

async function verifyConnectedIdentity(client, guard) {
  const result = await client.query(`
    SELECT
      current_database() AS database_name,
      session_user AS session_user_name,
      inet_server_addr()::text AS server_address
  `);
  const identity = result.rows[0];

  if (
    !identity ||
    identity.database_name !== guard.databaseName ||
    identity.session_user_name !== guard.expectedSessionUser ||
    !isAllowedServerAddress(
      identity.server_address,
      guard.serverAddressEnvironment
    )
  ) {
    throw guardError(
      'POSTGRES_TEST_CONNECTED_IDENTITY_MISMATCH',
      'A identidade confirmada pelo servidor PostgreSQL não é segura.'
    );
  }

  return Object.freeze({
    databaseName: identity.database_name,
    serverAddress: identity.server_address,
    sessionUser: identity.session_user_name,
  });
}

async function createPostgresTestHarness({
  environment = process.env,
  buildDatabaseConfig,
  ClientClass,
} = {}) {
  const guardOptions = buildDatabaseConfig ? { buildDatabaseConfig } : {};
  const guard = validatePostgresTestEnvironment(environment, guardOptions);

  if (!guard.enabled) {
    return guard;
  }

  const PostgresClient = ClientClass || require('pg').Client;
  const client = new PostgresClient(guard.clientConfig);
  let connected = false;

  try {
    await client.connect();
    connected = true;
    const identity = await verifyConnectedIdentity(client, guard);

    return {
      client,
      close: async () => {
        if (connected) {
          connected = false;
          await client.end();
        }
      },
      databaseName: guard.databaseName,
      enabled: true,
      identity,
      resetPublicSchema: async () => {
        if (!connected) {
          throw guardError(
            'POSTGRES_TEST_CLIENT_CLOSED',
            'O cliente PostgreSQL de integração já foi encerrado.'
          );
        }

        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');
      },
      runRoleFixtures: guard.runRoleFixtures,
    };
  } catch (error) {
    try {
      await client.end();
    } catch (cleanupError) {
      // Preserve the primary guard or connection failure.
    }

    if (error instanceof PostgresTestGuardError) {
      throw error;
    }

    throw guardError(
      'POSTGRES_TEST_CONNECTION_FAILED',
      'Não foi possível confirmar o banco PostgreSQL de integração.'
    );
  }
}

module.exports = {
  PostgresTestGuardError,
  createPostgresTestHarness,
  hasStandaloneTestToken,
  isAllowedServerAddress,
  isLoopbackHostname,
  validatePostgresTestEnvironment,
  verifyConnectedIdentity,
};

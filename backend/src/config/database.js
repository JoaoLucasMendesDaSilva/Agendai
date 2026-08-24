const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SSL_MODES = new Set(['disable', 'verify-full']);
let pool;
let environmentLoaded = false;

function loadDatabaseEnvironment() {
  if (!environmentLoaded) {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
    environmentLoaded = true;
  }
}

function criarErroConfiguracao(mensagem) {
  const error = new Error(mensagem);
  error.code = 'DB_CONFIG_ERROR';
  return error;
}

function normalizarHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
}

function decodificarComponenteUrl(valor) {
  try {
    return decodeURIComponent(valor);
  } catch (error) {
    throw criarErroConfiguracao('DATABASE_URL deve ser uma URL PostgreSQL válida.');
  }
}

function buildDatabaseConfig(environment = process.env) {
  const databaseUrl = String(environment?.DATABASE_URL || '').trim();

  if (!databaseUrl) {
    throw criarErroConfiguracao('DATABASE_URL não configurada.');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw criarErroConfiguracao('DATABASE_URL deve ser uma URL PostgreSQL válida.');
  }

  if (!POSTGRES_PROTOCOLS.has(parsedUrl.protocol) || !parsedUrl.hostname) {
    throw criarErroConfiguracao('DATABASE_URL deve ser uma URL PostgreSQL válida.');
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw criarErroConfiguracao(
      'Parâmetros e fragmentos não são permitidos em DATABASE_URL; use variáveis de ambiente dedicadas.'
    );
  }

  const port = parsedUrl.port ? Number(parsedUrl.port) : 5432;

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw criarErroConfiguracao('DATABASE_URL deve informar uma porta válida.');
  }

  const database = decodificarComponenteUrl(
    parsedUrl.pathname.replace(/^\//, '')
  );
  const user = decodificarComponenteUrl(parsedUrl.username);

  if (!database || !user) {
    throw criarErroConfiguracao(
      'DATABASE_URL deve informar usuário e banco de dados.'
    );
  }

  const connectionConfig = {
    database,
    host: normalizarHostname(parsedUrl.hostname),
    password: decodificarComponenteUrl(parsedUrl.password),
    port,
    user,
  };

  const nodeEnvironment = String(environment?.NODE_ENV || '')
    .trim()
    .toLowerCase();
  const isProduction = nodeEnvironment === 'production';
  const isLoopback = LOOPBACK_HOSTS.has(
    normalizarHostname(parsedUrl.hostname)
  );
  const configuredMode = String(environment?.DATABASE_SSL_MODE || '')
    .trim()
    .toLowerCase();

  if (configuredMode && !SSL_MODES.has(configuredMode)) {
    throw criarErroConfiguracao('DATABASE_SSL_MODE inválido.');
  }

  const sslMode =
    configuredMode || (isProduction || !isLoopback ? 'verify-full' : 'disable');

  if (sslMode === 'disable') {
    if (isProduction || !isLoopback) {
      throw criarErroConfiguracao(
        'DATABASE_SSL_MODE=disable só é permitido fora de produção para banco local.'
      );
    }

    return {
      ...connectionConfig,
      ssl: false,
    };
  }

  const ssl = {
    rejectUnauthorized: true,
  };
  const certificateAuthority = environment?.DATABASE_SSL_CA;

  if (certificateAuthority) {
    ssl.ca = String(certificateAuthority);
  }

  return {
    ...connectionConfig,
    ssl,
  };
}

function getDatabasePool() {
  if (!pool) {
    loadDatabaseEnvironment();
    pool = new Pool(buildDatabaseConfig(process.env));
  }
  return pool;
}

async function testDatabaseConnection() {
  const result = await getDatabasePool().query('SELECT 1 AS ok');
  return result.rows[0].ok === 1;
}

module.exports = {
  buildDatabaseConfig,
  getDatabasePool,
  loadDatabaseEnvironment,
  testDatabaseConnection,
};

const path = require('node:path');

const HELP_TEXT = [
  'Uso:',
  '  npm run db:migrate -- --confirm-database=<nome-exato>',
  '  npm run db:migrate -- --baseline-existing --confirm-database=<nome-exato>',
  '  npm run db:migrate -- --help',
  '',
  'O comando nunca executa automaticamente no start da aplicação.',
].join('\n');

const SAFE_MIGRATION_ERROR_CODES = new Set([
  'MIGRATION_BASELINE_INVALID',
  'MIGRATION_BASELINE_REQUIRED',
  'MIGRATION_CLIENT_INVALID',
  'MIGRATION_CLIENT_RELEASE_FAILED',
  'MIGRATION_COMMIT_UNKNOWN',
  'MIGRATION_CONNECTION_FAILED',
  'MIGRATION_DATABASE_CONFIRMATION_REQUIRED',
  'MIGRATION_DATABASE_MISMATCH',
  'MIGRATION_EXECUTION_FAILED',
  'MIGRATION_FINAL_STATE_INVALID',
  'MIGRATION_HISTORY_DRIFT',
  'MIGRATION_HISTORY_ROWS_INVALID',
  'MIGRATION_OPTIONS_INVALID',
  'MIGRATION_POSTGRES_VERSION_UNSUPPORTED',
  'MIGRATION_ROLLBACK_UNKNOWN',
]);

function cliError(message) {
  const error = new Error(message);
  error.name = 'MigrationCliError';
  error.code = 'MIGRATION_CLI_ARGUMENT';
  return error;
}

function writeOutput(stream, message) {
  if (
    !stream ||
    typeof stream.write !== 'function' ||
    typeof stream.once !== 'function' ||
    typeof stream.removeListener !== 'function'
  ) {
    return Promise.resolve().then(() => stream.write(message));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      stream.removeListener('error', onError);
      if (error) reject(error);
      else resolve();
    };
    const onError = (error) => finish(error);

    stream.once('error', onError);
    try {
      stream.write(message, (error) => finish(error));
    } catch (error) {
      finish(error);
    }
  });
}

function parseArguments(argv) {
  if (!Array.isArray(argv)) {
    throw cliError('Argumentos inválidos.');
  }

  if (argv.length === 1 && argv[0] === '--help') {
    return {
      baselineExisting: false,
      confirmDatabase: null,
      help: true,
    };
  }

  if (argv.includes('--help')) {
    throw cliError('--help deve ser usado isoladamente.');
  }

  let baselineExisting = false;
  let confirmDatabase = null;

  for (const argument of argv) {
    if (argument === '--baseline-existing') {
      if (baselineExisting) {
        throw cliError('--baseline-existing foi informado mais de uma vez.');
      }
      baselineExisting = true;
      continue;
    }

    if (argument.startsWith('--confirm-database=')) {
      if (confirmDatabase !== null) {
        throw cliError('--confirm-database foi informado mais de uma vez.');
      }

      const value = argument.slice('--confirm-database='.length);

      if (!value || /[\u0000-\u001f\u007f]/.test(value)) {
        throw cliError('--confirm-database exige um nome válido.');
      }

      confirmDatabase = value;
      continue;
    }

    throw cliError('Argumento desconhecido.');
  }

  if (!confirmDatabase) {
    throw cliError('Todo apply exige --confirm-database=<nome-exato>.');
  }

  return {
    baselineExisting,
    confirmDatabase,
    help: false,
  };
}

function loadRuntimeDependencies() {
  const { Client } = require('pg');
  const {
    buildDatabaseConfig,
    loadDatabaseEnvironment,
  } = require('../src/config/database');
  const { runMigrations } = require('../src/database/migrationRunner');

  return {
    buildDatabaseConfig,
    Client,
    loadDatabaseEnvironment,
    runMigrations,
  };
}

async function main({
  argv = process.argv.slice(2),
  loadDependencies = loadRuntimeDependencies,
  stderr = process.stderr,
  stdout = process.stdout,
} = {}) {
  let command;

  try {
    command = parseArguments(argv);
  } catch (error) {
    await writeOutput(
      stderr,
      'Erro: argumentos de migration inválidos. Use --help.\n'
    ).catch(() => {});
    return 1;
  }

  if (command.help) {
    try {
      await writeOutput(stdout, `${HELP_TEXT}\n`);
      return 0;
    } catch (error) {
      return 2;
    }
  }

  let result;

  try {
    const {
      buildDatabaseConfig,
      Client,
      loadDatabaseEnvironment,
      runMigrations,
    } = await loadDependencies();

    loadDatabaseEnvironment();
    const clientConfig = {
      ...buildDatabaseConfig(process.env),
      connectionTimeoutMillis: 10_000,
    };
    result = await runMigrations({
      baselineExisting: command.baselineExisting,
      confirmDatabase: command.confirmDatabase,
      createClient: () => new Client(clientConfig),
      migrationsDirectory: path.resolve(
        __dirname,
        '../database/postgres-migrations'
      ),
    });
  } catch (error) {
    const isSafeMigrationError =
      typeof error?.code === 'string' &&
      SAFE_MIGRATION_ERROR_CODES.has(error.code);
    const message = isSafeMigrationError
      ? `${error.code}: ${error.message}`
      : 'A execução de migrations falhou com segurança.';
    await writeOutput(stderr, `Erro: ${message}\n`).catch(() => {});
    return 1;
  }

  try {
    await writeOutput(
      stdout,
      `Migrations verificadas no banco ${result.database}: ${result.discovered} arquivo(s).\n`
    );
  } catch (error) {
    await writeOutput(
      stderr,
      'Aviso: as migrations foram confirmadas, mas não foi possível escrever o resumo. Não repita o apply.\n'
    ).catch(() => {});
    return 2;
  }

  return 0;
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

module.exports = {
  HELP_TEXT,
  loadRuntimeDependencies,
  main,
  parseArguments,
  writeOutput,
};

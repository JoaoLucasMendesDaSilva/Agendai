const {
  ACTIVE_MIGRATION_NAMES,
  MIN_POSTGRES_VERSION_NUM,
  MigrationRunnerError,
  calculateChecksum,
  classifyBaselineSignatures,
  migrationError,
  roleSetPrivilegeForVersion,
  validateHistoryRows,
} = require('./migrationContracts');
const {
  discoverMigrations,
  maskSqlLiteralsAndComments,
  scanMigrationSql,
} = require('./migrationDiscovery');
const {
  classifyBaselineSnapshot,
  defaultMatches,
  matchesDomainConstraint,
  matchesIdentitySequence,
  matchesPersistentOwnedRelation,
  matchesUpdateFunction,
  matchesUpdateTrigger,
  validateHistorySnapshot,
} = require('./migrationSchema');
const {
  inspectDatabaseState,
  migrationSetKind,
} = require('./migrationDatabaseState');

async function createProtectedHistory(client) {
  await client.query(`/* migration-runner:create-history */
    CREATE TABLE public.schema_migrations (
      version integer NOT NULL,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL,
      CONSTRAINT schema_migrations_pkey PRIMARY KEY (version),
      CONSTRAINT schema_migrations_name_key UNIQUE (name),
      CONSTRAINT schema_migrations_version_check CHECK (version >= 1),
      CONSTRAINT schema_migrations_checksum_check
        CHECK (checksum ~ '^[0-9a-f]{64}$')
    )`);
  await client.query(
    '/* migration-runner:history-rls */ ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY'
  );
  await client.query(
    '/* migration-runner:history-public-revoke */ REVOKE ALL PRIVILEGES ON TABLE public.schema_migrations FROM PUBLIC'
  );
  await client.query(`/* migration-runner:history-role-revokes */
    DO $migration_runner$
    DECLARE
      protected_role text;
    BEGIN
      FOR protected_role IN
        SELECT rolname
        FROM pg_catalog.pg_roles
        WHERE rolname IN ('anon', 'authenticated', 'service_role')
      LOOP
        EXECUTE format(
          'REVOKE ALL PRIVILEGES ON TABLE public.schema_migrations FROM %I',
          protected_role
        );
      END LOOP;
    END;
    $migration_runner$`);
}

async function insertHistoryRow(client, migration) {
  await client.query(
    `/* migration-runner:insert-history */
    INSERT INTO public.schema_migrations (version, name, checksum, applied_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
    [migration.version, migration.name, migration.checksum]
  );
}

async function safeEnd(client, destroyPoolClient = false) {
  if (client && typeof client.release === 'function') {
    await client.release(destroyPoolClient);
  } else if (client && typeof client.end === 'function') {
    await client.end();
  }
}

async function runMigrations({
  baselineExisting = false,
  confirmDatabase,
  createClient,
  fsApi,
  migrationsDirectory,
  stateInspector = inspectDatabaseState,
  lockTimeoutMs = 10_000,
  statementTimeoutMs = 120_000,
  logger,
}) {
  if (typeof baselineExisting !== 'boolean') {
    throw migrationError(
      'MIGRATION_OPTIONS_INVALID',
      'As opções do executor de migrations são inválidas.'
    );
  }

  if (
    typeof confirmDatabase !== 'string' ||
    !confirmDatabase ||
    /[\u0000-\u001f\u007f]/.test(confirmDatabase)
  ) {
    throw migrationError(
      'MIGRATION_DATABASE_CONFIRMATION_REQUIRED',
      'Confirme exatamente o nome do banco antes de executar migrations.'
    );
  }

  if (typeof createClient !== 'function') {
    throw migrationError(
      'MIGRATION_CLIENT_INVALID',
      'Não foi possível criar um cliente PostgreSQL dedicado.'
    );
  }

  if (
    typeof stateInspector !== 'function' ||
    !Number.isInteger(lockTimeoutMs) ||
    lockTimeoutMs <= 0 ||
    !Number.isInteger(statementTimeoutMs) ||
    statementTimeoutMs <= 0
  ) {
    throw migrationError(
      'MIGRATION_OPTIONS_INVALID',
      'As opções do executor de migrations são inválidas.'
    );
  }

  const migrations = await discoverMigrations(migrationsDirectory, { fsApi });
  let client;
  let connected = false;
  let transactionStarted = false;
  let commitAttempted = false;
  let primaryError;
  let outcome;

  try {
    client = await createClient();

    if (
      !client ||
      typeof client.query !== 'function' ||
      (typeof client.release !== 'function' &&
        typeof client.connect !== 'function')
    ) {
      throw migrationError(
        'MIGRATION_CLIENT_INVALID',
        'Não foi possível criar um cliente PostgreSQL dedicado.'
      );
    }

    const isPoolClient = typeof client.release === 'function';
    if (!isPoolClient) {
      await client.connect();
    }
    connected = true;
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE');
    transactionStarted = true;
    await client.query(
      `/* migration-runner:session-timeouts */
      SELECT pg_catalog.set_config('lock_timeout', $1, true),
             pg_catalog.set_config('statement_timeout', $2, true)`,
      [`${lockTimeoutMs}ms`, `${statementTimeoutMs}ms`]
    );
    await client.query(`
      SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('agendai:public:schema-migrations', 0)
      )
    `);
    await client.query(
      "SELECT pg_catalog.set_config('search_path', 'public, pg_temp', true)"
    );
    const identityResult = await client.query(`
      SELECT pg_catalog.current_database() AS database_name,
             current_user AS database_user,
             pg_catalog.current_schema() AS current_schema_name,
             pg_catalog.current_setting('server_version_num')::integer
               AS server_version_num
    `);
    const databaseName = identityResult.rows[0]?.database_name;
    const currentUser = identityResult.rows[0]?.database_user;
    const currentSchema = identityResult.rows[0]?.current_schema_name;
    const serverVersionNum = Number(identityResult.rows[0]?.server_version_num);

    if (
      databaseName !== confirmDatabase ||
      !currentUser ||
      currentSchema !== 'public'
    ) {
      throw migrationError(
        'MIGRATION_DATABASE_MISMATCH',
        'O banco conectado não corresponde à confirmação informada.'
      );
    }

    roleSetPrivilegeForVersion(serverVersionNum);

    await client.query('/* migration-runner:validate-state */ SELECT 1');
    const initialState = await stateInspector(client, {
      currentUser,
      migrations,
      serverVersionNum,
    });

    if (
      !initialState ||
      !Number.isInteger(initialState.prefix) ||
      initialState.prefix < 0 ||
      initialState.prefix > migrations.length
    ) {
      throw migrationError(
        'MIGRATION_BASELINE_INVALID',
        'A assinatura estrutural do banco é inválida.'
      );
    }

    let appliedCount;
    const applied = [];
    const baselined = [];

    if (initialState.historyExists) {
      const history = validateHistoryRows(
        initialState.historyRows,
        migrations
      );
      appliedCount = history.appliedCount;

      if (initialState.prefix !== appliedCount) {
        throw migrationError(
          'MIGRATION_HISTORY_DRIFT',
          'O histórico não corresponde à estrutura atual do banco.'
        );
      }
    } else {
      appliedCount = initialState.prefix;

      if (appliedCount > 0 && !baselineExisting) {
        throw migrationError(
          'MIGRATION_BASELINE_REQUIRED',
          'O banco existente exige baseline estrutural explícito.'
        );
      }

      await createProtectedHistory(client);

      for (const migration of migrations.slice(0, appliedCount)) {
        await insertHistoryRow(client, migration);
        baselined.push(migration.name);
      }
    }

    for (const migration of migrations.slice(appliedCount)) {
      await client.query(migration.sql);
      await insertHistoryRow(client, migration);
      applied.push(migration.name);

      if (typeof logger === 'function') {
        logger({ event: 'migration-applied', migration: migration.name });
      }
    }

    await client.query('/* migration-runner:validate-final-state */ SELECT 1');
    const finalState = await stateInspector(client, {
      currentUser,
      migrations,
      serverVersionNum,
    });

    if (
      !finalState?.historyExists ||
      finalState.prefix !== migrations.length
    ) {
      throw migrationError(
        'MIGRATION_FINAL_STATE_INVALID',
        'A verificação final das migrations falhou.'
      );
    }

    const finalHistory = validateHistoryRows(finalState.historyRows, migrations);
    if (finalHistory.appliedCount !== migrations.length) {
      throw migrationError(
        'MIGRATION_FINAL_STATE_INVALID',
        'A verificação final do histórico falhou.'
      );
    }

    commitAttempted = true;
    await client.query('COMMIT');
    transactionStarted = false;

    outcome = {
      alreadyApplied: appliedCount,
      applied,
      baselined,
      database: databaseName,
      discovered: migrations.length,
    };
  } catch (error) {
    if (commitAttempted) {
      primaryError = migrationError(
        'MIGRATION_COMMIT_UNKNOWN',
        'O resultado do COMMIT é desconhecido. Não repita automaticamente; faça inspeção somente leitura.',
        { retryable: false }
      );
    } else if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
        transactionStarted = false;
      } catch (rollbackError) {
        primaryError = migrationError(
          'MIGRATION_ROLLBACK_UNKNOWN',
          'O rollback não pôde ser confirmado. Faça inspeção somente leitura.',
          { retryable: false }
        );
      }
    }

    if (!primaryError) {
      if (error instanceof MigrationRunnerError) {
        primaryError = error;
      } else if (!connected) {
        primaryError = migrationError(
          'MIGRATION_CONNECTION_FAILED',
          'Não foi possível estabelecer a conexão dedicada para migrations.'
        );
      } else {
        primaryError = migrationError(
          'MIGRATION_EXECUTION_FAILED',
          'A execução das migrations falhou e foi interrompida.'
        );
      }
    }
  } finally {
    if (client) {
      try {
        const destroyPoolClient = [
          'MIGRATION_COMMIT_UNKNOWN',
          'MIGRATION_ROLLBACK_UNKNOWN',
        ].includes(primaryError?.code);
        await safeEnd(client, destroyPoolClient);
      } catch (cleanupError) {
        if (!primaryError) {
          primaryError = migrationError(
            'MIGRATION_CLIENT_RELEASE_FAILED',
            'As migrations foram confirmadas, mas a liberação da conexão falhou. Não repita o apply.',
            { retryable: false }
          );
        }
      }
    }
  }

  if (primaryError) throw primaryError;
  return outcome;
}

module.exports = {
  ACTIVE_MIGRATION_NAMES,
  MIN_POSTGRES_VERSION_NUM,
  MigrationRunnerError,
  calculateChecksum,
  classifyBaselineSignatures,
  classifyBaselineSnapshot,
  defaultMatches,
  discoverMigrations,
  inspectDatabaseState,
  maskSqlLiteralsAndComments,
  matchesDomainConstraint,
  matchesIdentitySequence,
  matchesPersistentOwnedRelation,
  matchesUpdateFunction,
  matchesUpdateTrigger,
  migrationSetKind,
  roleSetPrivilegeForVersion,
  runMigrations,
  scanMigrationSql,
  validateHistoryRows,
  validateHistorySnapshot,
};

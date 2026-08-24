const crypto = require('node:crypto');

const ACTIVE_MIGRATION_NAMES = Object.freeze([
  '001_create_schema.sql',
  '002_add_business_branding.sql',
  '003_add_public_appointment_token.sql',
  '004_harden_supabase_data_boundary.sql',
]);
const HISTORY_TABLE = 'schema_migrations';
const APPLICATION_TABLES = Object.freeze([
  'usuarios',
  'negocios',
  'servicos',
  'profissionais',
  'agendamentos',
]);
const APPLICATION_SEQUENCES = Object.freeze(
  APPLICATION_TABLES.map((tableName) => `${tableName}_id_seq`)
);
const DATA_API_ROLES = Object.freeze([
  'anon',
  'authenticated',
  'service_role',
]);
const MIN_POSTGRES_VERSION_NUM = 150000;

function roleSetPrivilegeForVersion(serverVersionNum) {
  if (
    !Number.isInteger(serverVersionNum) ||
    serverVersionNum < MIN_POSTGRES_VERSION_NUM
  ) {
    throw migrationError(
      'MIGRATION_POSTGRES_VERSION_UNSUPPORTED',
      'O migration runner exige PostgreSQL 15 ou superior.'
    );
  }

  // PostgreSQL 16 split the SET ROLE path from MEMBER. On PostgreSQL 15,
  // MEMBER is the portable check for a membership usable through SET ROLE.
  return serverVersionNum >= 160000 ? 'SET' : 'MEMBER';
}

class MigrationRunnerError extends Error {
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.name = 'MigrationRunnerError';
    this.code = code;
    this.retryable = retryable;
  }
}

function migrationError(code, message, options) {
  return new MigrationRunnerError(code, message, options);
}

function calculateChecksum(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function validateHistoryRows(rows, migrations) {
  if (!Array.isArray(rows) || rows.length > migrations.length) {
    throw migrationError(
      'MIGRATION_HISTORY_ROWS_INVALID',
      'O histórico de migrations contém versões desconhecidas.'
    );
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const migration = migrations[index];
    const version = Number(row?.version);

    if (version !== index + 1) {
      throw migrationError(
        'MIGRATION_HISTORY_ROWS_INVALID',
        'O histórico de migrations não forma um prefixo contínuo.'
      );
    }

    if (row?.name !== migration.name || row?.checksum !== migration.checksum) {
      throw migrationError(
        'MIGRATION_HISTORY_DRIFT',
        'O histórico de migrations diverge dos arquivos versionados.'
      );
    }
  }

  return {
    appliedCount: rows.length,
    pendingMigrations: migrations.slice(rows.length),
  };
}

function classifyBaselineSignatures(signatures) {
  if (!Array.isArray(signatures) || signatures.length !== 4) {
    throw migrationError(
      'MIGRATION_BASELINE_INVALID',
      'A assinatura estrutural do banco é inválida.'
    );
  }

  let prefix = 0;
  let foundAbsent = false;

  for (const status of signatures) {
    if (status === 'partial' || !['absent', 'complete'].includes(status)) {
      throw migrationError(
        'MIGRATION_BASELINE_INVALID',
        'O banco contém uma migration parcial ou incompatível.'
      );
    }

    if (status === 'absent') {
      foundAbsent = true;
      continue;
    }

    if (foundAbsent) {
      throw migrationError(
        'MIGRATION_BASELINE_INVALID',
        'O banco contém migrations fora de ordem.'
      );
    }

    prefix += 1;
  }

  return {
    prefix,
    state: prefix === 0 ? 'fresh' : 'complete-prefix',
  };
}

module.exports = {
  ACTIVE_MIGRATION_NAMES,
  APPLICATION_SEQUENCES,
  APPLICATION_TABLES,
  DATA_API_ROLES,
  HISTORY_TABLE,
  MIN_POSTGRES_VERSION_NUM,
  MigrationRunnerError,
  calculateChecksum,
  classifyBaselineSignatures,
  migrationError,
  roleSetPrivilegeForVersion,
  validateHistoryRows,
};

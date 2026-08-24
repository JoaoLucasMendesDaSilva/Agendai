const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const {
  calculateChecksum,
  migrationError,
} = require('./migrationContracts');

const MIGRATION_FILENAME =
  /^(\d{3})_([a-z][a-z0-9]*(?:_[a-z0-9]+)*)\.sql$/;
const TRANSACTION_CONTROL = [
  /^(?:BEGIN|START\s+TRANSACTION)\b/i,
  /^(?:COMMIT|END)(?:\s+TRANSACTION)?\b/i,
  /^ROLLBACK\b/i,
  /^ABORT\b/i,
  /^SAVEPOINT\b/i,
  /^RELEASE(?:\s+SAVEPOINT)?\b/i,
  /^PREPARE\s+TRANSACTION\b/i,
  /^(?:COMMIT|ROLLBACK)\s+PREPARED\b/i,
  /^SET\s+TRANSACTION\b/i,
  /^SET\s+SESSION\s+CHARACTERISTICS\s+AS\s+TRANSACTION\b/i,
];
const NON_TRANSACTIONAL = [
  /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i,
  /^DROP\s+INDEX\s+CONCURRENTLY\b/i,
  /^REINDEX\b[\s\S]*\bCONCURRENTLY\b/i,
  /^REFRESH\s+MATERIALIZED\s+VIEW\s+CONCURRENTLY\b/i,
  /^VACUUM\b/i,
  /^(?:CREATE|DROP)\s+DATABASE\b/i,
  /^(?:CREATE|DROP)\s+TABLESPACE\b/i,
  /^ALTER\s+SYSTEM\b/i,
  /^(?:CREATE|ALTER|DROP)\s+SUBSCRIPTION\b/i,
];

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith('..' + path.sep) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function maskSqlLiteralsAndComments(sql) {
  const characters = sql.split('');
  let index = 0;
  let blockDepth = 0;

  const mask = (start, end) => {
    for (let cursor = start; cursor < end; cursor += 1) {
      if (characters[cursor] !== '\n' && characters[cursor] !== '\r') {
        characters[cursor] = ' ';
      }
    }
  };

  while (index < sql.length) {
    if (blockDepth > 0) {
      if (sql.startsWith('/*', index)) {
        mask(index, index + 2);
        blockDepth += 1;
        index += 2;
      } else if (sql.startsWith('*/', index)) {
        mask(index, index + 2);
        blockDepth -= 1;
        index += 2;
      } else {
        mask(index, index + 1);
        index += 1;
      }
      continue;
    }

    if (sql.startsWith('--', index)) {
      const end = sql.indexOf('\n', index + 2);
      const boundary = end === -1 ? sql.length : end;
      mask(index, boundary);
      index = boundary;
      continue;
    }

    if (sql.startsWith('/*', index)) {
      mask(index, index + 2);
      blockDepth = 1;
      index += 2;
      continue;
    }

    const quote = sql[index];

    if (quote === "'" || quote === '"') {
      const start = index;
      const usesBackslashEscapes =
        quote === "'" &&
        index > 0 &&
        /[eE]/.test(sql[index - 1]) &&
        (index < 2 || !/[A-Za-z0-9_$\u0080-\uFFFF]/.test(sql[index - 2]));
      let closed = false;
      index += 1;

      while (index < sql.length) {
        if (usesBackslashEscapes && sql[index] === '\\') {
          index += 2;
          continue;
        }
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            index += 2;
            continue;
          }
          index += 1;
          closed = true;
          break;
        }
        index += 1;
      }

      if (!closed) {
        throw migrationError(
          'MIGRATION_SQL_INVALID',
          'A migration contém uma string ou identificador não terminado.'
        );
      }

      mask(start, index);
      continue;
    }

    if (
      quote === '$' &&
      (index === 0 || !/[A-Za-z0-9_$\u0080-\uFFFF]/.test(sql[index - 1]))
    ) {
      const tagMatch = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);

      if (tagMatch) {
        const tag = tagMatch[0];
        const end = sql.indexOf(tag, index + tag.length);

        if (end === -1) {
          throw migrationError(
            'MIGRATION_SQL_INVALID',
            'A migration contém um bloco dollar-quoted não terminado.'
          );
        }

        const boundary = end + tag.length;
        mask(index, boundary);
        index = boundary;
        continue;
      }
    }

    index += 1;
  }

  if (blockDepth !== 0) {
    throw migrationError(
      'MIGRATION_SQL_INVALID',
      'A migration contém um comentário de bloco não terminado.'
    );
  }

  return characters.join('');
}

function scanMigrationSql(sql, migrationName = 'migration') {
  const masked = maskSqlLiteralsAndComments(sql);
  const statements = masked
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    if (TRANSACTION_CONTROL.some((pattern) => pattern.test(statement))) {
      throw migrationError(
        'MIGRATION_TRANSACTION_CONTROL',
        `A migration ${migrationName} contém controle transacional proibido.`
      );
    }

    if (NON_TRANSACTIONAL.some((pattern) => pattern.test(statement))) {
      throw migrationError(
        'MIGRATION_NON_TRANSACTIONAL',
        `A migration ${migrationName} contém uma operação não transacional.`
      );
    }
  }
}

async function discoverMigrations(
  migrationsDirectory,
  { fsApi = fs.promises } = {}
) {
  if (!migrationsDirectory) {
    throw migrationError(
      'MIGRATION_PATH_INVALID',
      'O diretório de migrations não foi informado.'
    );
  }

  let root;
  let rootStat;

  try {
    rootStat = await fsApi.lstat(migrationsDirectory);
    root = await fsApi.realpath(migrationsDirectory);
  } catch (error) {
    throw migrationError(
      'MIGRATION_PATH_INVALID',
      'O diretório de migrations não é acessível.'
    );
  }

  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw migrationError(
      'MIGRATION_PATH_INVALID',
      'O diretório de migrations deve ser um diretório real.'
    );
  }

  const entries = await fsApi.readdir(root, { withFileTypes: true });
  const migrations = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw migrationError(
        'MIGRATION_PATH_INVALID',
        'Links simbólicos não são permitidos no diretório de migrations.'
      );
    }

    if (!entry.name.toLowerCase().endsWith('.sql')) {
      continue;
    }

    const match = entry.name.match(MIGRATION_FILENAME);

    if (!match || !entry.isFile()) {
      throw migrationError(
        'MIGRATION_FILENAME_INVALID',
        `Nome de migration inválido: ${entry.name}.`
      );
    }

    const candidate = path.resolve(root, entry.name);
    let resolved;
    let bytes;

    try {
      resolved = await fsApi.realpath(candidate);
      const fileStat = await fsApi.lstat(candidate);

      if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
        throw new Error('invalid migration entry');
      }

      if (!isPathInside(root, resolved)) {
        throw new Error('migration escaped root');
      }

      bytes = await fsApi.readFile(resolved);
    } catch (error) {
      throw migrationError(
        'MIGRATION_PATH_INVALID',
        `A migration ${entry.name} não é um arquivo seguro.`
      );
    }

    const checksum = calculateChecksum(bytes);
    let sql;

    try {
      sql = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      throw migrationError(
        'MIGRATION_UTF8_INVALID',
        `A migration ${entry.name} não contém UTF-8 válido.`
      );
    }

    scanMigrationSql(sql, entry.name);
    migrations.push({
      bytes,
      checksum,
      filePath: resolved,
      name: entry.name,
      sql,
      version: Number(match[1]),
    });
  }

  migrations.sort((left, right) => {
    if (left.version !== right.version) return left.version - right.version;
    return left.name.localeCompare(right.name);
  });

  for (let index = 0; index < migrations.length; index += 1) {
    const expectedVersion = index + 1;
    const migration = migrations[index];

    if (migration.version !== expectedVersion) {
      throw migrationError(
        'MIGRATION_SEQUENCE_INVALID',
        'As migrations devem formar uma sequência única e contínua desde 001.'
      );
    }
  }

  if (migrations.length === 0) {
    throw migrationError(
      'MIGRATION_SEQUENCE_INVALID',
      'Nenhuma migration válida foi encontrada.'
    );
  }

  return migrations;
}

module.exports = {
  discoverMigrations,
  maskSqlLiteralsAndComments,
  scanMigrationSql,
};

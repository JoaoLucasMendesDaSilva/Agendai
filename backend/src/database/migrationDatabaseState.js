const {
  ACTIVE_MIGRATION_NAMES,
  APPLICATION_SEQUENCES,
  APPLICATION_TABLES,
  HISTORY_TABLE,
  migrationError,
  roleSetPrivilegeForVersion,
} = require('./migrationContracts');
const { readCatalogSnapshot } = require('./postgresCatalog');
const {
  classifyBaselineSnapshot,
  validateHistorySnapshot,
} = require('./migrationSchema');

async function inspectHistoryState(client, currentUser, setRolePrivilege) {
  const conflict = await client.query(
    `/* migration-runner:history-existence */
    SELECT pg_catalog.to_regclass('public.schema_migrations') IS NOT NULL AS relation_exists,
           EXISTS (
             SELECT 1
             FROM pg_catalog.pg_type type_info
             JOIN pg_catalog.pg_namespace n ON n.oid = type_info.typnamespace
             WHERE n.nspname = 'public'
               AND type_info.typname = 'schema_migrations'
               AND type_info.typrelid = 0
           ) AS standalone_type_exists`
  );
  const state = conflict.rows[0] || {};

  if (state.standalone_type_exists) {
    throw migrationError(
      'MIGRATION_HISTORY_DEFINITION_INVALID',
      'Existe um objeto incompatível com a tabela de histórico.'
    );
  }

  if (!state.relation_exists) {
    return { exists: false, rows: [] };
  }

  const snapshot = await readCatalogSnapshot(client, {
    setRolePrivilege,
    tableNames: [HISTORY_TABLE],
  });
  validateHistorySnapshot(snapshot, currentUser);
  const rowsResult = await client.query(
    `/* migration-runner:history-rows */
    SELECT version, name, checksum, applied_at
    FROM public.schema_migrations
    ORDER BY version`
  );

  return { exists: true, rows: rowsResult.rows };
}

function migrationSetKind(migrations) {
  const activePrefixLength = Math.min(
    migrations.length,
    ACTIVE_MIGRATION_NAMES.length
  );
  const hasActivePrefix =
    activePrefixLength > 0 &&
    migrations
      .slice(0, activePrefixLength)
      .every(
        (migration, index) => migration.name === ACTIVE_MIGRATION_NAMES[index]
      );
  const isActiveSet =
    migrations.length === ACTIVE_MIGRATION_NAMES.length &&
    migrations.every(
      (migration, index) => migration.name === ACTIVE_MIGRATION_NAMES[index]
    );

  if (isActiveSet) return 'active';
  if (hasActivePrefix) return 'unsupported-active-prefix';
  return 'generic';
}

async function inspectDatabaseState(
  client,
  { currentUser, migrations, serverVersionNum }
) {
  const setRolePrivilege = roleSetPrivilegeForVersion(serverVersionNum);
  const history = await inspectHistoryState(
    client,
    currentUser,
    setRolePrivilege
  );
  const setKind = migrationSetKind(migrations);

  if (setKind === 'unsupported-active-prefix') {
    throw migrationError(
      'MIGRATION_SET_UNSUPPORTED',
      'O conjunto oficial de migrations mudou e exige atualização do validador estrutural.'
    );
  }

  if (setKind === 'generic') {
    if (history.exists) {
      return {
        historyExists: true,
        historyRows: history.rows,
        prefix: history.rows.length,
        signatures: null,
      };
    }

    const objects = await client.query(
      `/* migration-runner:generic-fresh-check */
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class object_class
        JOIN pg_catalog.pg_namespace n ON n.oid = object_class.relnamespace
        WHERE n.nspname = 'public'
          AND object_class.relname <> 'schema_migrations'
          AND object_class.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
        UNION ALL
        SELECT 1
        FROM pg_catalog.pg_proc procedure
        JOIN pg_catalog.pg_namespace n ON n.oid = procedure.pronamespace
        WHERE n.nspname = 'public'
          AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_depend dependency
            WHERE dependency.classid = 'pg_catalog.pg_proc'::regclass
              AND dependency.objid = procedure.oid
              AND dependency.deptype = 'e'
          )
      ) AS has_objects`
    );

    if (objects.rows[0]?.has_objects) {
      throw migrationError(
        'MIGRATION_BASELINE_INVALID',
        'Baselines exigem o conjunto estrutural oficial de migrations.'
      );
    }

    return {
      historyExists: false,
      historyRows: [],
      prefix: 0,
      signatures: null,
    };
  }

  const domainSnapshot = await readCatalogSnapshot(client, {
    functionNames: ['atualizar_updated_at'],
    includeExtension: true,
    sequenceNames: APPLICATION_SEQUENCES,
    setRolePrivilege,
    tableNames: APPLICATION_TABLES,
  });
  domainSnapshot.currentUser = currentUser;
  const domain = classifyBaselineSnapshot(domainSnapshot);

  return {
    historyExists: history.exists,
    historyRows: history.rows,
    prefix: domain.prefix,
    signatures: domain.signatures,
  };
}

module.exports = {
  inspectDatabaseState,
  migrationSetKind,
};

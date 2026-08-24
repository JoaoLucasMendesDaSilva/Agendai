const { DATA_API_ROLES } = require('./migrationContracts');

async function readForbiddenPrivileges(
  client,
  tableNames,
  sequenceNames,
  functionNames,
  setRolePrivilege
) {
  const result = await client.query(
    `/* migration-runner:catalog-privileges */
    WITH protected_roles AS (
      SELECT oid, rolname
      FROM pg_catalog.pg_roles
      WHERE rolname = ANY($4::text[])
    ),
    table_objects AS (
      SELECT c.oid, c.relname, c.relacl, c.relowner
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
    ),
    sequence_objects AS (
      SELECT c.oid, c.relname, c.relacl, c.relowner
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($2::text[])
    ),
    function_objects AS (
      SELECT p.oid, p.proname, p.proacl, p.proowner
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = ANY($3::text[])
        AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
    ),
    table_acl AS (
      SELECT object_acl.oid, object_acl.relname AS object_name,
             object_acl.relowner AS owner_oid,
             acl.grantee, acl.privilege_type
      FROM table_objects object_acl
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(object_acl.relacl, pg_catalog.acldefault('r', object_acl.relowner))
      ) acl
    ),
    column_acl AS (
      SELECT object_acl.oid, object_acl.relname AS object_name,
             object_acl.relowner AS owner_oid, attribute.attname AS column_name,
             acl.grantee, acl.privilege_type
      FROM table_objects object_acl
      JOIN pg_catalog.pg_attribute attribute
        ON attribute.attrelid = object_acl.oid
       AND attribute.attnum > 0
       AND NOT attribute.attisdropped
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(attribute.attacl, '{}'::aclitem[])
      ) acl
    ),
    sequence_acl AS (
      SELECT object_acl.oid, object_acl.relname AS object_name,
             object_acl.relowner AS owner_oid,
             acl.grantee, acl.privilege_type
      FROM sequence_objects object_acl
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(object_acl.relacl, pg_catalog.acldefault('s', object_acl.relowner))
      ) acl
    ),
    function_acl AS (
      SELECT object_acl.oid, object_acl.proname AS object_name,
             object_acl.proowner AS owner_oid,
             acl.grantee, acl.privilege_type
      FROM function_objects object_acl
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(object_acl.proacl, pg_catalog.acldefault('f', object_acl.proowner))
      ) acl
    )
    SELECT 'PUBLIC'::text AS role_name, 'table'::text AS object_type,
           object_acl.object_name, object_acl.privilege_type
    FROM table_acl object_acl
    WHERE object_acl.grantee = 0
    UNION ALL
    SELECT role_acl.rolname, 'table', object_acl.object_name,
           object_acl.privilege_type
    FROM protected_roles role_acl
    CROSS JOIN table_acl object_acl
    WHERE object_acl.grantee <> 0
      AND (
        pg_catalog.pg_has_role(role_acl.oid, object_acl.grantee, 'USAGE')
        OR pg_catalog.pg_has_role(
          role_acl.oid,
          object_acl.grantee,
          $5::text
        )
      )
    UNION ALL
    SELECT role_acl.rolname, 'table', object_acl.relname, 'OWNER'
    FROM protected_roles role_acl
    CROSS JOIN table_objects object_acl
    WHERE pg_catalog.pg_has_role(role_acl.oid, object_acl.relowner, 'USAGE')
       OR pg_catalog.pg_has_role(role_acl.oid, object_acl.relowner, $5::text)
    UNION ALL
    SELECT 'PUBLIC', 'column',
           object_acl.object_name || '.' || object_acl.column_name,
           object_acl.privilege_type
    FROM column_acl object_acl
    WHERE object_acl.grantee = 0
    UNION ALL
    SELECT role_acl.rolname, 'column',
           object_acl.object_name || '.' || object_acl.column_name,
           object_acl.privilege_type
    FROM protected_roles role_acl
    CROSS JOIN column_acl object_acl
    WHERE object_acl.grantee <> 0
      AND (
        pg_catalog.pg_has_role(role_acl.oid, object_acl.grantee, 'USAGE')
        OR pg_catalog.pg_has_role(
          role_acl.oid,
          object_acl.grantee,
          $5::text
        )
      )
    UNION ALL
    SELECT 'PUBLIC', 'sequence', object_acl.object_name,
           object_acl.privilege_type
    FROM sequence_acl object_acl
    WHERE object_acl.grantee = 0
    UNION ALL
    SELECT role_acl.rolname, 'sequence', object_acl.object_name,
           object_acl.privilege_type
    FROM protected_roles role_acl
    CROSS JOIN sequence_acl object_acl
    WHERE object_acl.grantee <> 0
      AND (
        pg_catalog.pg_has_role(role_acl.oid, object_acl.grantee, 'USAGE')
        OR pg_catalog.pg_has_role(
          role_acl.oid,
          object_acl.grantee,
          $5::text
        )
      )
    UNION ALL
    SELECT role_acl.rolname, 'sequence', object_acl.relname, 'OWNER'
    FROM protected_roles role_acl
    CROSS JOIN sequence_objects object_acl
    WHERE pg_catalog.pg_has_role(role_acl.oid, object_acl.relowner, 'USAGE')
       OR pg_catalog.pg_has_role(role_acl.oid, object_acl.relowner, $5::text)
    UNION ALL
    SELECT 'PUBLIC', 'function', object_acl.object_name,
           object_acl.privilege_type
    FROM function_acl object_acl
    WHERE object_acl.grantee = 0
    UNION ALL
    SELECT role_acl.rolname, 'function', object_acl.object_name,
           object_acl.privilege_type
    FROM protected_roles role_acl
    CROSS JOIN function_acl object_acl
    WHERE object_acl.grantee <> 0
      AND (
        pg_catalog.pg_has_role(role_acl.oid, object_acl.grantee, 'USAGE')
        OR pg_catalog.pg_has_role(
          role_acl.oid,
          object_acl.grantee,
          $5::text
        )
      )
    UNION ALL
    SELECT role_acl.rolname, 'function', object_acl.proname, 'OWNER'
    FROM protected_roles role_acl
    CROSS JOIN function_objects object_acl
    WHERE pg_catalog.pg_has_role(role_acl.oid, object_acl.proowner, 'USAGE')
       OR pg_catalog.pg_has_role(role_acl.oid, object_acl.proowner, $5::text)
    UNION ALL
    SELECT role_acl.rolname, 'role', elevated_role.rolname, 'SUPERUSER'
    FROM protected_roles role_acl
    CROSS JOIN pg_catalog.pg_roles elevated_role
    WHERE elevated_role.rolsuper
      AND (
        pg_catalog.pg_has_role(role_acl.oid, elevated_role.oid, 'USAGE')
        OR pg_catalog.pg_has_role(role_acl.oid, elevated_role.oid, $5::text)
      )
    ORDER BY 1, 2, 3, 4`,
    [
      tableNames,
      sequenceNames,
      functionNames,
      DATA_API_ROLES,
      setRolePrivilege,
    ]
  );

  return result.rows;
}

async function readCatalogSnapshot(
  client,
  {
    tableNames,
    sequenceNames = [],
    functionNames = [],
    includeExtension = false,
    setRolePrivilege = 'MEMBER',
  }
) {
  const relations = await client.query(
    `/* migration-runner:catalog-relations */
    SELECT c.relname AS table_name, c.relkind,
           c.relpersistence AS persistence,
           pg_catalog.pg_get_userbyid(c.relowner) AS owner_name,
           c.relispartition AS is_partition,
           EXISTS (
             SELECT 1
             FROM pg_catalog.pg_inherits inheritance
             WHERE inheritance.inhrelid = c.oid
                OR inheritance.inhparent = c.oid
           ) AS has_inheritance,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
    ORDER BY c.relname`,
    [tableNames]
  );
  const columns = await client.query(
    `/* migration-runner:catalog-columns */
    SELECT c.relname AS table_name, a.attnum AS ordinal_position,
           a.attname AS column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
           a.attnotnull AS not_null, a.attidentity AS identity_kind,
           a.attgenerated AS generated_kind,
           a.attislocal AS is_local,
           a.attinhcount AS inheritance_count,
           a.atthasmissing AS has_missing_value,
           a.attcollation = type_info.typcollation AS uses_default_collation,
           a.attisdropped AS is_dropped,
           pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expression
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    JOIN pg_catalog.pg_type type_info ON type_info.oid = a.atttypid
    LEFT JOIN pg_catalog.pg_attrdef d
      ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
      AND a.attnum > 0
    ORDER BY c.relname, a.attnum`,
    [tableNames]
  );
  const constraints = await client.query(
    `/* migration-runner:catalog-constraints */
    SELECT c.relname AS table_name, con.conname AS constraint_name,
           con.contype AS constraint_type, con.convalidated AS validated,
           con.condeferrable AS deferrable, con.condeferred AS deferred,
           con.conislocal AS is_local,
           con.coninhcount AS inheritance_count,
           con.conparentid = 0 AS has_no_parent,
           con.connoinherit AS no_inherit,
           con.confmatchtype AS match_type,
           con.confupdtype AS update_action, con.confdeltype AS delete_action,
           referenced.relname AS foreign_table,
           referenced_namespace.nspname AS foreign_schema,
           ARRAY(
             SELECT attribute.attname::text
             FROM unnest(con.conkey) WITH ORDINALITY key(attnum, position)
             LEFT JOIN pg_catalog.pg_attribute attribute
               ON attribute.attrelid = con.conrelid AND attribute.attnum = key.attnum
             ORDER BY key.position
           ) AS columns,
           ARRAY(
             SELECT attribute.attname::text
             FROM unnest(con.confkey) WITH ORDINALITY key(attnum, position)
             LEFT JOIN pg_catalog.pg_attribute attribute
               ON attribute.attrelid = con.confrelid AND attribute.attnum = key.attnum
             ORDER BY key.position
           ) AS foreign_columns,
           pg_catalog.pg_get_constraintdef(con.oid, false) AS definition,
           NOT EXISTS (
             SELECT 1
             FROM pg_catalog.pg_depend dependency
             JOIN pg_catalog.pg_proc dependency_function
               ON dependency.refclassid = 'pg_catalog.pg_proc'::regclass
              AND dependency.refobjid = dependency_function.oid
             JOIN pg_catalog.pg_namespace dependency_namespace
               ON dependency_namespace.oid = dependency_function.pronamespace
             WHERE (
               (
                 dependency.classid = 'pg_catalog.pg_constraint'::regclass
                 AND dependency.objid = con.oid
               ) OR (
                 dependency.classid = 'pg_catalog.pg_class'::regclass
                 AND dependency.objid = con.conindid
               )
             )
             AND dependency_namespace.nspname <> 'pg_catalog'
           ) AS functions_catalog_only,
           NOT EXISTS (
             SELECT 1
             FROM pg_catalog.pg_depend dependency
             JOIN pg_catalog.pg_operator dependency_operator
               ON dependency.refclassid = 'pg_catalog.pg_operator'::regclass
              AND dependency.refobjid = dependency_operator.oid
             JOIN pg_catalog.pg_namespace dependency_namespace
               ON dependency_namespace.oid = dependency_operator.oprnamespace
             WHERE (
               (
                 dependency.classid = 'pg_catalog.pg_constraint'::regclass
                 AND dependency.objid = con.oid
               ) OR (
                 dependency.classid = 'pg_catalog.pg_class'::regclass
                 AND dependency.objid = con.conindid
               )
             )
             AND dependency_namespace.nspname <> 'pg_catalog'
           ) AS operators_catalog_only
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_catalog.pg_class referenced ON referenced.oid = con.confrelid
    LEFT JOIN pg_catalog.pg_namespace referenced_namespace
      ON referenced_namespace.oid = referenced.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
    ORDER BY c.relname, con.conname`,
    [tableNames]
  );
  const indexes = await client.query(
    `/* migration-runner:catalog-indexes */
    SELECT table_class.relname AS table_name,
           index_class.relname AS index_name,
           access_method.amname AS access_method,
           index_info.indisunique AS is_unique,
           index_info.indisprimary AS is_primary,
           index_info.indisexclusion AS is_exclusion,
           index_info.indnullsnotdistinct AS nulls_not_distinct,
           index_info.indisvalid AS is_valid,
           linked_constraint.conname AS constraint_name,
           ARRAY(
             SELECT attribute.attname::text
             FROM unnest(index_info.indkey) WITH ORDINALITY key(attnum, position)
             LEFT JOIN pg_catalog.pg_attribute attribute
               ON attribute.attrelid = index_info.indrelid
              AND attribute.attnum = key.attnum
             ORDER BY key.position
           ) AS columns,
           pg_catalog.pg_get_expr(index_info.indpred, index_info.indrelid) AS predicate,
           pg_catalog.pg_get_indexdef(index_info.indexrelid) AS definition
    FROM pg_catalog.pg_index index_info
    JOIN pg_catalog.pg_class table_class ON table_class.oid = index_info.indrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = table_class.relnamespace
    JOIN pg_catalog.pg_class index_class ON index_class.oid = index_info.indexrelid
    JOIN pg_catalog.pg_am access_method ON access_method.oid = index_class.relam
    LEFT JOIN pg_catalog.pg_constraint linked_constraint
      ON linked_constraint.conindid = index_info.indexrelid
    WHERE n.nspname = 'public' AND table_class.relname = ANY($1::text[])
    ORDER BY table_class.relname, index_class.relname`,
    [tableNames]
  );
  const sequences = await client.query(
    `/* migration-runner:catalog-sequences */
    SELECT sequence_class.relname AS sequence_name,
           sequence_class.relpersistence AS persistence,
           pg_catalog.pg_get_userbyid(sequence_class.relowner) AS owner_name,
           table_class.relname AS table_name,
           attribute.attname AS column_name,
           pg_catalog.format_type(sequence_info.seqtypid, NULL) AS data_type,
           sequence_info.seqstart AS start_value,
           sequence_info.seqincrement AS increment_by,
           sequence_info.seqmin AS min_value,
           sequence_info.seqmax AS max_value,
           sequence_info.seqcache AS cache_size,
           sequence_info.seqcycle AS cycles
    FROM pg_catalog.pg_class sequence_class
    JOIN pg_catalog.pg_namespace n ON n.oid = sequence_class.relnamespace
    JOIN pg_catalog.pg_sequence sequence_info
      ON sequence_info.seqrelid = sequence_class.oid
    LEFT JOIN pg_catalog.pg_depend dependency
      ON dependency.classid = 'pg_catalog.pg_class'::regclass
     AND dependency.objid = sequence_class.oid
     AND dependency.deptype = 'i'
    LEFT JOIN pg_catalog.pg_class table_class
      ON table_class.oid = dependency.refobjid
    LEFT JOIN pg_catalog.pg_attribute attribute
      ON attribute.attrelid = dependency.refobjid
     AND attribute.attnum = dependency.refobjsubid
    WHERE n.nspname = 'public'
      AND (
        sequence_class.relname = ANY($1::text[])
        OR table_class.relname = ANY($2::text[])
      )
    ORDER BY sequence_class.relname`,
    [sequenceNames, tableNames]
  );
  const functions = await client.query(
    `/* migration-runner:catalog-functions */
    SELECT procedure.proname AS function_name,
           pg_catalog.pg_get_userbyid(procedure.proowner) AS owner_name,
           pg_catalog.pg_get_function_identity_arguments(procedure.oid) AS arguments,
           pg_catalog.pg_get_function_result(procedure.oid) AS result_type,
           language.lanname AS language_name,
           procedure.prokind AS function_kind,
           procedure.prosecdef AS security_definer,
           procedure.proleakproof AS leakproof,
           procedure.proisstrict AS strict,
           procedure.proparallel AS parallel_safety,
           procedure.proconfig IS NULL AS no_runtime_config,
           procedure.provolatile AS volatility,
           procedure.prosrc AS body
    FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace n ON n.oid = procedure.pronamespace
    JOIN pg_catalog.pg_language language ON language.oid = procedure.prolang
    WHERE n.nspname = 'public'
      AND procedure.proname = ANY($1::text[])
    ORDER BY procedure.proname, arguments`,
    [functionNames]
  );
  const triggers = await client.query(
    `/* migration-runner:catalog-triggers */
    SELECT trigger.tgname AS trigger_name, table_class.relname AS table_name,
           trigger.tgenabled AS enabled, trigger.tgtype AS trigger_type,
           trigger.tgnargs AS argument_count,
           trigger.tgqual IS NULL AS no_when_clause,
           trigger.tgattr::text AS trigger_columns,
           trigger.tgparentid = 0 AS no_parent_trigger,
           trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL
             AS no_transition_tables,
           procedure.proname AS function_name,
           procedure_namespace.nspname AS function_schema,
           pg_catalog.pg_get_function_identity_arguments(procedure.oid)
             AS function_arguments,
           pg_catalog.pg_get_triggerdef(trigger.oid, false) AS definition
    FROM pg_catalog.pg_trigger trigger
    JOIN pg_catalog.pg_class table_class ON table_class.oid = trigger.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = table_class.relnamespace
    JOIN pg_catalog.pg_proc procedure ON procedure.oid = trigger.tgfoid
    JOIN pg_catalog.pg_namespace procedure_namespace
      ON procedure_namespace.oid = procedure.pronamespace
    WHERE n.nspname = 'public' AND table_class.relname = ANY($1::text[])
      AND NOT trigger.tgisinternal
    ORDER BY table_class.relname, trigger.tgname`,
    [tableNames]
  );
  const rules = await client.query(
    `/* migration-runner:catalog-rules */
    SELECT rule.rulename AS rule_name, table_class.relname AS table_name
    FROM pg_catalog.pg_rewrite rule
    JOIN pg_catalog.pg_class table_class ON table_class.oid = rule.ev_class
    JOIN pg_catalog.pg_namespace n ON n.oid = table_class.relnamespace
    WHERE n.nspname = 'public' AND table_class.relname = ANY($1::text[])
      AND rule.rulename <> '_RETURN'
    ORDER BY table_class.relname, rule.rulename`,
    [tableNames]
  );
  const policies = await client.query(
    `/* migration-runner:catalog-policies */
    SELECT policy.polname AS policy_name, table_class.relname AS table_name
    FROM pg_catalog.pg_policy policy
    JOIN pg_catalog.pg_class table_class ON table_class.oid = policy.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = table_class.relnamespace
    WHERE n.nspname = 'public' AND table_class.relname = ANY($1::text[])
    ORDER BY table_class.relname, policy.polname`,
    [tableNames]
  );
  const extensions = includeExtension
    ? await client.query(
        `/* migration-runner:catalog-extensions */
        SELECT extname FROM pg_catalog.pg_extension WHERE extname = 'btree_gist'`
      )
    : { rows: [] };
  const privileges = await readForbiddenPrivileges(
    client,
    tableNames,
    sequenceNames,
    functionNames,
    setRolePrivilege
  );

  return {
    columns: columns.rows,
    constraints: constraints.rows,
    extensions: extensions.rows,
    functions: functions.rows,
    indexes: indexes.rows,
    policies: policies.rows,
    privileges,
    relations: relations.rows,
    rules: rules.rows,
    sequences: sequences.rows,
    triggers: triggers.rows,
  };
}

module.exports = {
  readCatalogSnapshot,
};

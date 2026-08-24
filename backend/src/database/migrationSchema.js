const {
  APPLICATION_SEQUENCES,
  APPLICATION_TABLES,
  HISTORY_TABLE,
  classifyBaselineSignatures,
  migrationError,
} = require('./migrationContracts');

const COLUMN_SPECS = Object.freeze({
  usuarios: [
    ['id', 'integer', true, 'd', null, 1],
    ['nome', 'character varying(120)', true, '', null, 1],
    ['email', 'character varying(180)', true, '', null, 1],
    ['senha_hash', 'character varying(255)', true, '', null, 1],
    ['telefone', 'character varying(30)', false, '', null, 1],
    ['ativo', 'boolean', true, '', 'true', 1],
    ['created_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
    ['updated_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
  ],
  negocios: [
    ['id', 'integer', true, 'd', null, 1],
    ['usuario_id', 'integer', true, '', null, 1],
    ['nome', 'character varying(150)', true, '', null, 1],
    ['slug_publico', 'character varying(160)', true, '', null, 1],
    ['descricao', 'text', false, '', null, 1],
    ['telefone', 'character varying(30)', false, '', null, 1],
    ['endereco', 'character varying(255)', false, '', null, 1],
    ['cidade', 'character varying(100)', false, '', 'Cubatao', 1],
    ['horario_abertura', 'time without time zone', true, '', '08:00:00', 1],
    ['horario_fechamento', 'time without time zone', true, '', '18:00:00', 1],
    ['intervalo_agendamento_minutos', 'integer', true, '', '30', 1],
    ['dias_funcionamento', 'jsonb', false, '', null, 1],
    ['ativo', 'boolean', true, '', 'true', 1],
    ['created_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
    ['updated_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
    ['logo_url', 'character varying(500)', false, '', null, 2],
    ['banner_url', 'character varying(500)', false, '', null, 2],
  ],
  servicos: [
    ['id', 'integer', true, 'd', null, 1],
    ['negocio_id', 'integer', true, '', null, 1],
    ['nome', 'character varying(120)', true, '', null, 1],
    ['descricao', 'text', false, '', null, 1],
    ['duracao_minutos', 'integer', true, '', null, 1],
    ['preco', 'numeric(10,2)', true, '', '0', 1],
    ['ativo', 'boolean', true, '', 'true', 1],
    ['created_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
    ['updated_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
  ],
  profissionais: [
    ['id', 'integer', true, 'd', null, 1],
    ['negocio_id', 'integer', true, '', null, 1],
    ['nome', 'character varying(120)', true, '', null, 1],
    ['telefone', 'character varying(30)', false, '', null, 1],
    ['email', 'character varying(180)', false, '', null, 1],
    ['especialidade', 'character varying(120)', false, '', null, 1],
    ['ativo', 'boolean', true, '', 'true', 1],
    ['created_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
    ['updated_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
  ],
  agendamentos: [
    ['id', 'integer', true, 'd', null, 1],
    ['negocio_id', 'integer', true, '', null, 1],
    ['servico_id', 'integer', true, '', null, 1],
    ['profissional_id', 'integer', true, '', null, 1],
    ['cliente_nome', 'character varying(120)', true, '', null, 1],
    ['cliente_telefone', 'character varying(30)', true, '', null, 1],
    ['cliente_email', 'character varying(180)', false, '', null, 1],
    ['data_hora_inicio', 'timestamp without time zone', true, '', null, 1],
    ['data_hora_fim', 'timestamp without time zone', true, '', null, 1],
    ['status', 'character varying(20)', true, '', 'confirmado', 1],
    ['observacoes', 'text', false, '', null, 1],
    ['created_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
    ['updated_at', 'timestamp with time zone', true, '', 'current_timestamp', 1],
    ['token_publico_hash', 'character(64)', false, '', null, 3],
  ],
});

const CONSTRAINT_SPECS = Object.freeze({
  usuarios_pkey: ['usuarios', 'p', ['id'], null, null, 1, []],
  uk_usuarios_email: ['usuarios', 'u', ['email'], null, null, 1, []],
  negocios_pkey: ['negocios', 'p', ['id'], null, null, 1, []],
  uk_negocios_slug_publico: ['negocios', 'u', ['slug_publico'], null, null, 1, []],
  fk_negocios_usuario: ['negocios', 'f', ['usuario_id'], 'usuarios', ['id'], 1, []],
  chk_negocios_intervalo_agendamento: ['negocios', 'c', ['intervalo_agendamento_minutos'], null, null, 1, ['intervalo_agendamento_minutos', '> 0']],
  chk_negocios_horario_funcionamento: ['negocios', 'c', ['horario_fechamento', 'horario_abertura'], null, null, 1, ['horario_fechamento', 'horario_abertura', '>']],
  chk_negocios_dias_funcionamento_array: ['negocios', 'c', ['dias_funcionamento'], null, null, 1, ['jsonb_typeof', 'dias_funcionamento', 'array']],
  servicos_pkey: ['servicos', 'p', ['id'], null, null, 1, []],
  fk_servicos_negocio: ['servicos', 'f', ['negocio_id'], 'negocios', ['id'], 1, []],
  chk_servicos_duracao: ['servicos', 'c', ['duracao_minutos'], null, null, 1, ['duracao_minutos', '> 0']],
  chk_servicos_preco: ['servicos', 'c', ['preco'], null, null, 1, ['preco', '>= 0']],
  profissionais_pkey: ['profissionais', 'p', ['id'], null, null, 1, []],
  fk_profissionais_negocio: ['profissionais', 'f', ['negocio_id'], 'negocios', ['id'], 1, []],
  agendamentos_pkey: ['agendamentos', 'p', ['id'], null, null, 1, []],
  fk_agendamentos_negocio: ['agendamentos', 'f', ['negocio_id'], 'negocios', ['id'], 1, []],
  fk_agendamentos_servico: ['agendamentos', 'f', ['servico_id'], 'servicos', ['id'], 1, []],
  fk_agendamentos_profissional: ['agendamentos', 'f', ['profissional_id'], 'profissionais', ['id'], 1, []],
  chk_agendamentos_periodo: ['agendamentos', 'c', ['data_hora_fim', 'data_hora_inicio'], null, null, 1, ['data_hora_fim', 'data_hora_inicio', '>']],
  chk_agendamentos_status: ['agendamentos', 'c', ['status'], null, null, 1, ['status', 'pendente', 'confirmado', 'cancelado', 'concluido']],
  ex_agendamentos_profissional_periodo_ativo: ['agendamentos', 'x', ['profissional_id', null], null, null, 1, ['exclude using gist', 'profissional_id with =', 'tsrange', "'[)'", 'with &&', 'pendente', 'confirmado']],
  uk_agendamentos_token_publico_hash: ['agendamentos', 'u', ['token_publico_hash'], null, null, 3, []],
});

const INDEX_SPECS = Object.freeze({
  idx_usuarios_ativo: ['usuarios', ['ativo']],
  idx_negocios_usuario_id: ['negocios', ['usuario_id']],
  idx_negocios_ativo: ['negocios', ['ativo']],
  idx_servicos_negocio_id: ['servicos', ['negocio_id']],
  idx_servicos_negocio_ativo: ['servicos', ['negocio_id', 'ativo']],
  idx_profissionais_negocio_id: ['profissionais', ['negocio_id']],
  idx_profissionais_negocio_ativo: ['profissionais', ['negocio_id', 'ativo']],
  idx_agendamentos_negocio_id: ['agendamentos', ['negocio_id']],
  idx_agendamentos_servico_id: ['agendamentos', ['servico_id']],
  idx_agendamentos_profissional_id: ['agendamentos', ['profissional_id']],
  idx_agendamentos_negocio_inicio: ['agendamentos', ['negocio_id', 'data_hora_inicio']],
  idx_agendamentos_profissional_periodo: ['agendamentos', ['profissional_id', 'data_hora_inicio', 'data_hora_fim']],
  idx_agendamentos_profissional_status_periodo: ['agendamentos', ['profissional_id', 'status', 'data_hora_inicio', 'data_hora_fim']],
});

const TRIGGER_SPECS = Object.freeze({
  trg_usuarios_updated_at: 'usuarios',
  trg_negocios_updated_at: 'negocios',
  trg_servicos_updated_at: 'servicos',
  trg_profissionais_updated_at: 'profissionais',
  trg_agendamentos_updated_at: 'agendamentos',
});

const CONSTRAINT_NO_INHERIT = Object.freeze({
  c: false,
  f: true,
  p: true,
  u: true,
  x: true,
});

function sameArray(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameSet(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}

function constraintInheritanceMatches(row, constraintType) {
  // PostgreSQL makes index-backed and foreign-key constraints non-inheritable;
  // ordinary CHECK constraints remain inheritable unless declared NO INHERIT.
  return (
    Object.hasOwn(CONSTRAINT_NO_INHERIT, constraintType) &&
    row?.is_local === true &&
    Number(row?.inheritance_count) === 0 &&
    row?.has_no_parent === true &&
    row?.no_inherit === CONSTRAINT_NO_INHERIT[constraintType]
  );
}

function canonicalSqlDefinition(value) {
  const sql = String(value || '');
  let canonical = '';
  let state = 'normal';

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];

    if (state === 'single-quoted') {
      canonical += character;
      if (character === "'" && sql[index + 1] === "'") {
        canonical += sql[index + 1];
        index += 1;
      } else if (character === "'") {
        state = 'normal';
      }
      continue;
    }

    if (state === 'double-quoted') {
      canonical += character;
      if (character === '"' && sql[index + 1] === '"') {
        canonical += sql[index + 1];
        index += 1;
      } else if (character === '"') {
        state = 'normal';
      }
      continue;
    }

    if (character === "'") {
      canonical += character;
      state = 'single-quoted';
      continue;
    }
    if (character === '"') {
      canonical += character;
      state = 'double-quoted';
      continue;
    }
    if (/\s|[()]/u.test(character)) continue;

    const remaining = sql.slice(index);
    const previous = index === 0 ? '' : sql[index - 1];
    const atIdentifierBoundary =
      index === 0 || !/[A-Za-z0-9_$.\u0080-\uFFFF]/u.test(previous);
    const publicSchema = atIdentifierBoundary
      ? remaining.match(/^public\s*\.\s*/iu)
      : null;
    if (publicSchema) {
      index += publicSchema[0].length - 1;
      continue;
    }

    const cast = remaining.match(
      /^::\s*(?:pg_catalog\s*\.\s*)?(?:character\s+varying|text|numeric|time\s+without\s+time\s+zone|boolean)(?:\s*\[\s*\])?/iu
    );
    if (cast) {
      index += cast[0].length - 1;
      continue;
    }

    canonical += character.toLowerCase();
  }

  return canonical;
}

function expectedConstraintDefinition(name, spec) {
  const [tableName, type, columns, foreignTable, foreignColumns] = spec;

  if (type === 'p') return canonicalSqlDefinition(`PRIMARY KEY (${columns.join(', ')})`);
  if (type === 'u') return canonicalSqlDefinition(`UNIQUE (${columns.join(', ')})`);
  if (type === 'f') {
    return canonicalSqlDefinition(
      `FOREIGN KEY (${columns.join(', ')}) REFERENCES ${foreignTable} (${foreignColumns.join(', ')}) ON UPDATE CASCADE ON DELETE RESTRICT`
    );
  }

  const definitions = {
    chk_negocios_intervalo_agendamento:
      'CHECK (intervalo_agendamento_minutos > 0)',
    chk_negocios_horario_funcionamento:
      'CHECK (horario_fechamento > horario_abertura)',
    chk_negocios_dias_funcionamento_array:
      "CHECK (dias_funcionamento IS NULL OR jsonb_typeof(dias_funcionamento) = 'array')",
    chk_servicos_duracao: 'CHECK (duracao_minutos > 0)',
    chk_servicos_preco: 'CHECK (preco >= 0)',
    chk_agendamentos_periodo:
      'CHECK (data_hora_fim > data_hora_inicio)',
    chk_agendamentos_status:
      "CHECK (status = ANY (ARRAY['pendente', 'confirmado', 'cancelado', 'concluido']))",
    ex_agendamentos_profissional_periodo_ativo:
      "EXCLUDE USING gist (profissional_id WITH =, tsrange(data_hora_inicio, data_hora_fim, '[)') WITH &&) WHERE (status = ANY (ARRAY['pendente', 'confirmado']))",
  };

  if (!definitions[name]) return null;
  return canonicalSqlDefinition(definitions[name]);
}

function defaultMatches(actual, expected) {
  if (expected === null) return actual === null || actual === undefined;

  const normalized = canonicalSqlDefinition(actual);

  if (expected === 'current_timestamp') {
    return normalized === 'current_timestamp' || normalized === 'now';
  }
  if (expected === 'true') return normalized === 'true' || normalized === "'t'";
  if (expected === '0' || expected === '30') {
    return (
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) &&
      Number(normalized) === Number(expected)
    );
  }

  return normalized === canonicalSqlDefinition(`'${expected}'`);
}

function columnMatches(row, spec, expectedOrdinal) {
  const [name, dataType, notNull, identityKind, expectedDefault] = spec;
  return (
    row?.column_name === name &&
    row?.data_type === dataType &&
    row?.is_dropped === false &&
    String(row?.generated_kind || '') === '' &&
    row?.is_local === true &&
    Number(row?.inheritance_count) === 0 &&
    row?.has_missing_value === false &&
    row?.uses_default_collation === true &&
    row?.not_null === notNull &&
    String(row?.identity_kind || '') === identityKind &&
    Number(row?.ordinal_position) === expectedOrdinal &&
    defaultMatches(row?.default_expression, expectedDefault)
  );
}

function constraintMatches(row, spec, constraintName) {
  const [tableName, constraintType, columns, foreignTable, foreignColumns] =
    spec;

  if (
    row?.table_name !== tableName ||
    row?.constraint_type !== constraintType ||
    row?.validated !== true ||
    row?.deferrable !== false ||
    row?.deferred !== false ||
    !constraintInheritanceMatches(row, constraintType) ||
    row?.functions_catalog_only !== true ||
    row?.operators_catalog_only !== true ||
    !(constraintType === 'c'
      ? sameSet(row?.columns || [], columns)
      : sameArray(row?.columns || [], columns))
  ) {
    return false;
  }

  if (constraintType === 'f') {
    if (
      row?.foreign_table !== foreignTable ||
      row?.foreign_schema !== 'public' ||
      !sameArray(row?.foreign_columns || [], foreignColumns) ||
      row?.match_type !== 's' ||
      row?.update_action !== 'c' ||
      row?.delete_action !== 'r'
    ) {
      return false;
    }
  }

  const expectedDefinition = expectedConstraintDefinition(constraintName, spec);
  return (
    expectedDefinition !== null &&
    canonicalSqlDefinition(row?.definition) === expectedDefinition
  );
}

function matchesDomainConstraint(row, constraintName) {
  const spec = CONSTRAINT_SPECS[constraintName];
  return Boolean(spec && constraintMatches(row, spec, constraintName));
}

function matchesUpdateFunction(row, currentUser) {
  const canonicalBody = canonicalSqlDefinition(row?.body);
  return (
    row?.function_name === 'atualizar_updated_at' &&
    row?.owner_name === currentUser &&
    row?.arguments === '' &&
    row?.result_type === 'trigger' &&
    row?.language_name === 'plpgsql' &&
    row?.function_kind === 'f' &&
    row?.security_definer === false &&
    row?.leakproof === false &&
    row?.strict === false &&
    row?.parallel_safety === 'u' &&
    row?.no_runtime_config === true &&
    row?.volatility === 'v' &&
    canonicalBody === 'beginnew.updated_at=current_timestamp;returnnew;end;'
  );
}

function matchesUpdateTrigger(row, triggerName, tableName) {
  return (
    row?.trigger_name === triggerName &&
    row?.table_name === tableName &&
    row?.enabled === 'O' &&
    Number(row?.trigger_type) === 19 &&
    Number(row?.argument_count) === 0 &&
    row?.no_when_clause === true &&
    row?.trigger_columns === '' &&
    row?.no_parent_trigger === true &&
    row?.no_transition_tables === true &&
    row?.function_schema === 'public' &&
    row?.function_name === 'atualizar_updated_at' &&
    row?.function_arguments === '' &&
    canonicalSqlDefinition(row?.definition) ===
      canonicalSqlDefinition(
        `CREATE TRIGGER ${triggerName} BEFORE UPDATE ON ${tableName} FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at()`
      )
  );
}

function matchesPersistentOwnedRelation(row, tableName, currentUser) {
  return (
    row?.table_name === tableName &&
    row?.relkind === 'r' &&
    row?.persistence === 'p' &&
    row?.is_partition === false &&
    row?.has_inheritance === false &&
    row?.owner_name === currentUser
  );
}

function matchesIdentitySequence(row, tableName, currentUser) {
  return (
    row?.sequence_name === `${tableName}_id_seq` &&
    row?.persistence === 'p' &&
    row?.table_name === tableName &&
    row?.owner_name === currentUser &&
    row?.column_name === 'id' &&
    row?.data_type === 'integer' &&
    Number(row?.start_value) === 1 &&
    Number(row?.increment_by) === 1 &&
    Number(row?.min_value) === 1 &&
    Number(row?.max_value) === 2147483647 &&
    Number(row?.cache_size) === 1 &&
    row?.cycles === false
  );
}

function expectedColumnEntries(version) {
  const entries = [];

  for (const [tableName, specs] of Object.entries(COLUMN_SPECS)) {
    specs.forEach((spec, index) => {
      if (spec[5] === version) {
        entries.push({ ordinal: index + 1, spec, tableName });
      }
    });
  }

  return entries;
}

function columnsStatus(snapshot, version) {
  const expected = expectedColumnEntries(version);
  const actual = snapshot.columns.filter((row) =>
    expected.some(
      (entry) =>
        entry.tableName === row.table_name && entry.spec[0] === row.column_name
    )
  );

  if (actual.length === 0) return 'absent';
  if (actual.length !== expected.length) return 'partial';

  return expected.every((entry) => {
    const row = actual.find(
      (candidate) =>
        candidate.table_name === entry.tableName &&
        candidate.column_name === entry.spec[0]
    );
    return columnMatches(row, entry.spec, entry.ordinal);
  })
    ? 'complete'
    : 'partial';
}

function hasOnlyKnownDomainObjects(snapshot) {
  const knownColumns = new Set(
    Object.entries(COLUMN_SPECS).flatMap(([tableName, specs]) =>
      specs.map((spec) => `${tableName}.${spec[0]}`)
    )
  );
  const knownConstraints = new Set(Object.keys(CONSTRAINT_SPECS));
  const knownIndexes = new Set(Object.keys(INDEX_SPECS));
  const knownTriggers = new Set(Object.keys(TRIGGER_SPECS));

  return (
    snapshot.columns.every((row) =>
      knownColumns.has(`${row.table_name}.${row.column_name}`)
    ) &&
    snapshot.constraints.every((row) =>
      knownConstraints.has(row.constraint_name)
    ) &&
    snapshot.indexes.every(
      (row) => row.constraint_name || knownIndexes.has(row.index_name)
    ) &&
    snapshot.triggers.every((row) => knownTriggers.has(row.trigger_name)) &&
    snapshot.rules.length === 0
  );
}

function migrationOneStatus(snapshot) {
  const hasBaseObject =
    snapshot.relations.length > 0 ||
    snapshot.sequences.length > 0 ||
    snapshot.functions.length > 0 ||
    snapshot.constraints.some((row) => CONSTRAINT_SPECS[row.constraint_name]?.[5] === 1) ||
    snapshot.indexes.some((row) => INDEX_SPECS[row.index_name]) ||
    snapshot.triggers.length > 0;

  if (!hasBaseObject) return 'absent';
  if (!hasOnlyKnownDomainObjects(snapshot)) return 'partial';

  const relationsComplete =
    snapshot.relations.length === APPLICATION_TABLES.length &&
    APPLICATION_TABLES.every((tableName) => {
      const relation = snapshot.relations.find(
        (candidate) => candidate.table_name === tableName
      );
      return matchesPersistentOwnedRelation(
        relation,
        tableName,
        snapshot.currentUser
      );
    });
  const baseColumnsComplete = columnsStatus(snapshot, 1) === 'complete';
  const baseConstraintEntries = Object.entries(CONSTRAINT_SPECS).filter(
    ([, spec]) => spec[5] === 1
  );
  const constraintNames = snapshot.constraints.map((row) => row.constraint_name);
  const baseConstraintsComplete =
    baseConstraintEntries.every(([name, spec]) => {
      const row = snapshot.constraints.find(
        (candidate) => candidate.constraint_name === name
      );
      return constraintMatches(row, spec, name);
    }) &&
    snapshot.constraints.every((row) => CONSTRAINT_SPECS[row.constraint_name]) &&
    new Set(constraintNames).size === constraintNames.length;
  const explicitIndexes = snapshot.indexes.filter((row) => !row.constraint_name);
  const indexesComplete =
    explicitIndexes.length === Object.keys(INDEX_SPECS).length &&
    Object.entries(INDEX_SPECS).every(([name, [tableName, columns]]) => {
      const row = explicitIndexes.find((candidate) => candidate.index_name === name);
      return (
        row?.table_name === tableName &&
        row?.access_method === 'btree' &&
        row?.is_unique === false &&
        row?.is_primary === false &&
        row?.is_exclusion === false &&
        row?.nulls_not_distinct === false &&
        row?.is_valid === true &&
        row?.predicate === null &&
        sameArray(row?.columns || [], columns) &&
        canonicalSqlDefinition(row?.definition) ===
          canonicalSqlDefinition(
            `CREATE INDEX ${name} ON ${tableName} USING btree (${columns.join(', ')})`
          )
      );
    });
  const expectedConstraintIndexes = baseConstraintEntries.filter(([, spec]) =>
    ['p', 'u', 'x'].includes(spec[1])
  );
  const constraintIndexesComplete = expectedConstraintIndexes.every(
    ([constraintName, spec]) => {
      const row = snapshot.indexes.find(
        (candidate) => candidate.constraint_name === constraintName
      );
      return (
        row?.index_name === constraintName &&
        row?.is_valid === true &&
        row?.access_method === (spec[1] === 'x' ? 'gist' : 'btree') &&
        row?.is_unique === ['p', 'u'].includes(spec[1]) &&
        row?.is_primary === (spec[1] === 'p') &&
        row?.is_exclusion === (spec[1] === 'x') &&
        row?.nulls_not_distinct === false
      );
    }
  );
  const sequencesComplete =
    snapshot.sequences.length === APPLICATION_SEQUENCES.length &&
    APPLICATION_TABLES.every((tableName) => {
      const row = snapshot.sequences.find(
        (candidate) => candidate.sequence_name === `${tableName}_id_seq`
      );
      return matchesIdentitySequence(row, tableName, snapshot.currentUser);
    });
  const extensionComplete = snapshot.extensions.some(
    (row) => row.extname === 'btree_gist'
  );
  const functionRow = snapshot.functions[0];
  const functionComplete =
    snapshot.functions.length === 1 &&
    matchesUpdateFunction(functionRow, snapshot.currentUser);
  const triggersComplete =
    snapshot.triggers.length === Object.keys(TRIGGER_SPECS).length &&
    Object.entries(TRIGGER_SPECS).every(([name, tableName]) => {
      const row = snapshot.triggers.find(
        (candidate) => candidate.trigger_name === name
      );
      return matchesUpdateTrigger(row, name, tableName);
    });

  return relationsComplete &&
    baseColumnsComplete &&
    baseConstraintsComplete &&
    indexesComplete &&
    constraintIndexesComplete &&
    sequencesComplete &&
    extensionComplete &&
    functionComplete &&
    triggersComplete
    ? 'complete'
    : 'partial';
}

function migrationThreeStatus(snapshot) {
  const columnStatus = columnsStatus(snapshot, 3);
  const constraint = snapshot.constraints.find(
    (row) => row.constraint_name === 'uk_agendamentos_token_publico_hash'
  );

  if (columnStatus === 'absent' && !constraint) return 'absent';
  if (columnStatus !== 'complete') return 'partial';
  if (
    !constraintMatches(
      constraint,
      CONSTRAINT_SPECS.uk_agendamentos_token_publico_hash,
      'uk_agendamentos_token_publico_hash'
    )
  ) {
    return 'partial';
  }

  const index = snapshot.indexes.find(
    (row) => row.constraint_name === 'uk_agendamentos_token_publico_hash'
  );
  return index?.index_name === 'uk_agendamentos_token_publico_hash' &&
    index?.access_method === 'btree' &&
    index?.is_unique === true &&
    index?.nulls_not_distinct === false &&
    index?.is_valid === true &&
    sameArray(index?.columns || [], ['token_publico_hash'])
    ? 'complete'
    : 'partial';
}

function migrationFourStatus(snapshot) {
  const enabledCount = snapshot.relations.filter((row) => row.rls_enabled).length;

  if (enabledCount === 0 && snapshot.policies.length === 0) {
    if (snapshot.functions.length === 0 && snapshot.relations.length === 0) {
      return 'absent';
    }

    const publicFunctionExecute = snapshot.privileges.some(
      (row) =>
        row.role_name === 'PUBLIC' &&
        row.object_type === 'function' &&
        row.object_name === 'atualizar_updated_at' &&
        row.privilege_type === 'EXECUTE'
    );
    // Before migration 004, seeded Supabase roles may legitimately hold
    // privileges that 004 is expected to revoke. PUBLIC EXECUTE on the
    // trigger function is the stable pre-004 sentinel; RLS is the ordered
    // migration marker and is checked above for partial application.
    return publicFunctionExecute ? 'absent' : 'partial';
  }
  if (
    enabledCount !== APPLICATION_TABLES.length ||
    snapshot.relations.some((row) => row.rls_forced) ||
    snapshot.policies.length > 0 ||
    snapshot.privileges.length > 0
  ) {
    return 'partial';
  }

  return 'complete';
}

function classifyBaselineSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.relations)) {
    throw migrationError(
      'MIGRATION_BASELINE_INVALID',
      'A assinatura estrutural do banco é inválida.'
    );
  }

  const signatures = [
    migrationOneStatus(snapshot),
    columnsStatus(snapshot, 2),
    migrationThreeStatus(snapshot),
    migrationFourStatus(snapshot),
  ];
  const classification = classifyBaselineSignatures(signatures);

  return { ...classification, signatures };
}

function validateHistorySnapshot(snapshot, currentUser) {
  const relation = snapshot?.relations?.[0];

  if (
    snapshot?.relations?.length !== 1 ||
    !matchesPersistentOwnedRelation(relation, HISTORY_TABLE, currentUser) ||
    relation.rls_enabled !== true ||
    relation.rls_forced !== false
  ) {
    throw migrationError(
      'MIGRATION_HISTORY_DEFINITION_INVALID',
      'A tabela de histórico possui definição ou proprietário incompatível.'
    );
  }

  const expectedColumns = [
    ['version', 'integer', true, '', null],
    ['name', 'text', true, '', null],
    ['checksum', 'text', true, '', null],
    ['applied_at', 'timestamp with time zone', true, '', null],
  ];
  const columnsValid =
    snapshot.columns.length === expectedColumns.length &&
    expectedColumns.every((spec, index) => {
      const row = snapshot.columns.find(
        (candidate) => candidate.column_name === spec[0]
      );
      return columnMatches(row, spec, index + 1);
    });

  const expectedConstraints = {
    schema_migrations_pkey: ['p', ['version'], 'PRIMARY KEY (version)'],
    schema_migrations_name_key: ['u', ['name'], 'UNIQUE (name)'],
    schema_migrations_version_check: [
      'c',
      ['version'],
      'CHECK (version >= 1)',
    ],
    schema_migrations_checksum_check: [
      'c',
      ['checksum'],
      "CHECK (checksum ~ '^[0-9a-f]{64}$')",
    ],
  };
  const constraintsValid =
    snapshot.constraints.length === Object.keys(expectedConstraints).length &&
    Object.entries(expectedConstraints).every(([name, [type, columns, expectedDefinition]]) => {
      const row = snapshot.constraints.find(
        (candidate) => candidate.constraint_name === name
      );
      return (
        row?.table_name === HISTORY_TABLE &&
        row?.constraint_type === type &&
        row?.validated === true &&
        row?.deferrable === false &&
        row?.deferred === false &&
        constraintInheritanceMatches(row, type) &&
        row?.functions_catalog_only === true &&
        row?.operators_catalog_only === true &&
        sameArray(row?.columns || [], columns) &&
        canonicalSqlDefinition(row?.definition) ===
          canonicalSqlDefinition(expectedDefinition)
      );
    });
  const expectedIndexes = {
    schema_migrations_pkey: { columns: ['version'], primary: true },
    schema_migrations_name_key: { columns: ['name'], primary: false },
  };
  const indexesValid =
    snapshot.indexes.length === Object.keys(expectedIndexes).length &&
    Object.entries(expectedIndexes).every(([name, expected]) => {
      const row = snapshot.indexes.find((candidate) => candidate.index_name === name);
      return (
        row?.constraint_name === name &&
        row?.access_method === 'btree' &&
        row?.is_unique === true &&
        row?.is_primary === expected.primary &&
        row?.is_exclusion === false &&
        row?.nulls_not_distinct === false &&
        row?.is_valid === true &&
        row?.predicate === null &&
        sameArray(row?.columns || [], expected.columns)
      );
    });

  if (
    !columnsValid ||
    !constraintsValid ||
    !indexesValid ||
    snapshot.policies.length > 0 ||
    snapshot.triggers.length > 0 ||
    snapshot.rules.length > 0 ||
    snapshot.privileges.length > 0
  ) {
    throw migrationError(
      'MIGRATION_HISTORY_DEFINITION_INVALID',
      'A tabela de histórico possui objetos, políticas ou privilégios incompatíveis.'
    );
  }
}

module.exports = {
  classifyBaselineSnapshot,
  defaultMatches,
  matchesDomainConstraint,
  matchesIdentitySequence,
  matchesPersistentOwnedRelation,
  matchesUpdateFunction,
  matchesUpdateTrigger,
  validateHistorySnapshot,
};

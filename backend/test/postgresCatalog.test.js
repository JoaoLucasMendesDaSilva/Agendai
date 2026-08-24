const assert = require('node:assert/strict');
const test = require('node:test');

const { readCatalogSnapshot } = require('../src/database/postgresCatalog');

test('usa ACL padrão válida quando a coluna não possui grants explícitos', async () => {
  const queries = [];
  const client = {
    async query(sql, parameters) {
      queries.push({ parameters, sql });
      return { rows: [] };
    },
  };

  await readCatalogSnapshot(client, { tableNames: ['agendamentos'] });

  const privilegeQuery = queries.find(({ sql }) =>
    sql.includes('migration-runner:catalog-privileges')
  );

  assert.ok(privilegeQuery);
  assert.match(
    privilegeQuery.sql,
    /COALESCE\(\s*attribute\.attacl,\s*pg_catalog\.acldefault\('c', object_acl\.relowner\)\s*\)/
  );
  assert.doesNotMatch(privilegeQuery.sql, /'\{\}'::aclitem\[\]/);
});

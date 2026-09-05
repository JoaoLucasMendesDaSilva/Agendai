const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, test } = require('node:test');

const {
  createPostgresTestHarness,
  validatePostgresTestEnvironment,
} = require('./postgresTestHarness');

const ACTIVE_MIGRATIONS = path.resolve(
  __dirname,
  '../../database/postgres-migrations'
);
const APPLICATION_TABLES = [
  'agendamentos',
  'negocios',
  'profissionais',
  'servicos',
  'solicitacoes_lgpd',
  'usuarios',
];
const DATA_API_ROLES = ['anon', 'authenticated', 'service_role'];

const liveGuard = validatePostgresTestEnvironment(process.env);
const liveSkip = liveGuard.enabled ? false : liveGuard.reason;

describe(
  'migration runner contra PostgreSQL descartável',
  { concurrency: false, skip: liveSkip },
  () => {
    let Client;
    let harness;
    let migrationRunner;
    let temporaryRoot;

    before(async () => {
      ({ Client } = require('pg'));
      migrationRunner = require('../../src/database/migrationRunner');
      harness = await createPostgresTestHarness({ environment: process.env });
      temporaryRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), 'agendai-postgres-integration-')
      );
    });

    after(async () => {
      if (harness?.enabled) {
        await harness.close();
      }
      if (temporaryRoot) {
        await fs.rm(temporaryRoot, { force: true, recursive: true });
      }
    });

    function createRunnerClient() {
      return new Client({ ...liveGuard.clientConfig });
    }

    function runMigrations({
      baselineExisting = false,
      confirmDatabase = harness.databaseName,
      migrationsDirectory = ACTIVE_MIGRATIONS,
    } = {}) {
      return migrationRunner.runMigrations({
        baselineExisting,
        confirmDatabase,
        createClient: createRunnerClient,
        migrationsDirectory,
      });
    }

    async function scenarioDirectory(label) {
      return fs.mkdtemp(path.join(temporaryRoot, `${label}-`));
    }

    async function copyActiveMigrations(label) {
      const target = await scenarioDirectory(label);
      const entries = await fs.readdir(ACTIVE_MIGRATIONS, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.sql')) {
          await fs.copyFile(
            path.join(ACTIVE_MIGRATIONS, entry.name),
            path.join(target, entry.name)
          );
        }
      }

      return target;
    }

    async function writeMigration(directory, name, sql) {
      await fs.writeFile(path.join(directory, name), sql, 'utf8');
    }

    async function readHistory() {
      const result = await harness.client.query(`
        SELECT
          version,
          name,
          checksum,
          applied_at::text AS applied_at,
          xmin::text AS xmin
        FROM public.schema_migrations
        ORDER BY version
      `);
      return result.rows.map((row) => ({
        ...row,
        checksum: Buffer.isBuffer(row.checksum)
          ? row.checksum.toString('hex')
          : String(row.checksum).replace(/^\\x/, ''),
        version: Number(row.version),
      }));
    }

    async function readRelationOids() {
      const result = await harness.client.query(`
        SELECT c.relname, c.oid::text AS oid
        FROM pg_class AS c
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'S')
        ORDER BY c.relkind, c.relname
      `);
      return result.rows;
    }

    async function schemaSnapshot() {
      const relations = await harness.client.query(`
        SELECT c.relkind, c.relname, c.relrowsecurity
        FROM pg_class AS c
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'S', 'v', 'm')
        ORDER BY c.relkind, c.relname
      `);
      const columns = await harness.client.query(`
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);
      const constraints = await harness.client.query(`
        SELECT
          c.conname,
          c.contype,
          c.conrelid::regclass::text AS relation_name,
          pg_get_constraintdef(c.oid, true) AS definition
        FROM pg_constraint AS c
        JOIN pg_namespace AS n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
        ORDER BY relation_name, c.conname
      `);
      const indexes = await harness.client.query(`
        SELECT indexname, indexdef, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      const triggers = await harness.client.query(`
        SELECT
          c.relname AS relation_name,
          t.tgname,
          pg_get_triggerdef(t.oid, true) AS definition
        FROM pg_trigger AS t
        JOIN pg_class AS c ON c.oid = t.tgrelid
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND NOT t.tgisinternal
        ORDER BY c.relname, t.tgname
      `);
      const functions = await harness.client.query(`
        SELECT p.proname, pg_get_functiondef(p.oid) AS definition
        FROM pg_proc AS p
        JOIN pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        ORDER BY p.proname, p.oid
      `);
      const extensions = await harness.client.query(`
        SELECT e.extname, n.nspname
        FROM pg_extension AS e
        JOIN pg_namespace AS n ON n.oid = e.extnamespace
        WHERE n.nspname = 'public'
        ORDER BY e.extname
      `);
      const historyExists = await harness.client.query(
        "SELECT to_regclass('public.schema_migrations')::text AS relation_name"
      );
      const history = historyExists.rows[0].relation_name
        ? await readHistory()
        : [];

      return {
        columns: columns.rows,
        constraints: constraints.rows,
        extensions: extensions.rows,
        functions: functions.rows,
        history,
        indexes: indexes.rows,
        relations: relations.rows,
        triggers: triggers.rows,
      };
    }

    async function assertMigrationFailure(operation) {
      await assert.rejects(operation, (error) => {
        assert.equal(error instanceof migrationRunner.MigrationRunnerError, true);
        assert.match(error.code, /^MIGRATION_/);
        return true;
      });
    }

    async function assertHistoryMissing() {
      const result = await harness.client.query(
        "SELECT to_regclass('public.schema_migrations')::text AS relation_name"
      );
      assert.equal(result.rows[0].relation_name, null);
    }

    async function applyActivePrefix(lastVersion) {
      const migrations = await migrationRunner.discoverMigrations(
        ACTIVE_MIGRATIONS
      );

      for (const migration of migrations.slice(0, lastVersion)) {
        await harness.client.query(migration.sql);
      }
    }

    async function findForbiddenPrivileges() {
      const relationPrivileges = await harness.client.query(
        `
          WITH protected_relations AS (
            SELECT c.oid, c.relacl, c.relkind, c.relname, c.relowner
            FROM pg_class AS c
            JOIN pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND (
                c.relname = ANY($1::text[])
                OR c.relname = 'schema_migrations'
                OR c.relname = ANY($2::text[])
              )
          )
          SELECT
            protected_relations.relname AS object_name,
            COALESCE(role.rolname, 'PUBLIC') AS grantee,
            acl.privilege_type
          FROM protected_relations
          CROSS JOIN LATERAL aclexplode(
            COALESCE(
              protected_relations.relacl,
              acldefault(
                CASE
                  WHEN protected_relations.relkind = 'S' THEN 's'::\"char\"
                  ELSE 'r'::\"char\"
                END,
                protected_relations.relowner
              )
            )
          ) AS acl
          LEFT JOIN pg_roles AS role ON role.oid = acl.grantee
          WHERE acl.grantee = 0
             OR role.rolname = ANY($3::text[])
          ORDER BY object_name, grantee, acl.privilege_type
        `,
        [
          APPLICATION_TABLES,
          APPLICATION_TABLES.map((table) => `${table}_id_seq`),
          DATA_API_ROLES,
        ]
      );
      const functionPrivileges = await harness.client.query(
        `
          SELECT
            p.proname AS object_name,
            COALESCE(role.rolname, 'PUBLIC') AS grantee,
            acl.privilege_type
          FROM pg_proc AS p
          JOIN pg_namespace AS n ON n.oid = p.pronamespace
          CROSS JOIN LATERAL aclexplode(
            COALESCE(p.proacl, acldefault('f'::\"char\", p.proowner))
          ) AS acl
          LEFT JOIN pg_roles AS role ON role.oid = acl.grantee
          WHERE n.nspname = 'public'
            AND p.proname = 'atualizar_updated_at'
            AND (acl.grantee = 0 OR role.rolname = ANY($1::text[]))
          ORDER BY grantee, acl.privilege_type
        `,
        [DATA_API_ROLES]
      );

      return [...relationPrivileges.rows, ...functionPrivileges.rows];
    }

    async function assertSecurityCatalog() {
      const rls = await harness.client.query(
        `
          SELECT c.relname, c.relrowsecurity
          FROM pg_class AS c
          JOIN pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = ANY($1::text[])
          ORDER BY c.relname
        `,
        [[...APPLICATION_TABLES, 'schema_migrations']]
      );
      assert.deepEqual(
        rls.rows,
        [...APPLICATION_TABLES, 'schema_migrations']
          .sort()
          .map((relname) => ({ relname, relrowsecurity: true }))
      );

      const policies = await harness.client.query(
        `
          SELECT COUNT(*)::integer AS policy_count
          FROM pg_policy AS p
          JOIN pg_class AS c ON c.oid = p.polrelid
          JOIN pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = ANY($1::text[])
        `,
        [[...APPLICATION_TABLES, 'schema_migrations']]
      );
      assert.equal(policies.rows[0].policy_count, 0);
      assert.deepEqual(await findForbiddenPrivileges(), []);

      const exclusion = await harness.client.query(`
        SELECT c.contype, pg_get_constraintdef(c.oid, true) AS definition
        FROM pg_constraint AS c
        WHERE c.conrelid = 'public.agendamentos'::regclass
          AND c.conname = 'ex_agendamentos_profissional_periodo_ativo'
      `);
      assert.equal(exclusion.rowCount, 1);
      assert.equal(exclusion.rows[0].contype, 'x');
      assert.match(exclusion.rows[0].definition, /EXCLUDE USING gist/i);
      assert.match(exclusion.rows[0].definition, /pendente|confirmado/i);
    }

    async function assertOwnerTriggerStillWorks() {
      const inserted = await harness.client.query(`
        INSERT INTO public.usuarios (
          nome,
          email,
          senha_hash,
          updated_at
        ) VALUES (
          'Owner fixture',
          'owner-trigger@example.invalid',
          'fixture-hash',
          TIMESTAMPTZ '2000-01-01 00:00:00+00'
        )
        RETURNING id, updated_at
      `);
      const updated = await harness.client.query(
        `
          UPDATE public.usuarios
          SET nome = 'Owner fixture updated'
          WHERE id = $1
          RETURNING updated_at
        `,
        [inserted.rows[0].id]
      );

      assert.ok(
        new Date(updated.rows[0].updated_at) >
          new Date(inserted.rows[0].updated_at)
      );
      await harness.client.query('DELETE FROM public.usuarios WHERE id = $1', [
        inserted.rows[0].id,
      ]);
    }

    test('fresh aplica 001-007; noop preserva history, xmins e OIDs', async () => {
      await harness.resetPublicSchema();

      const roles = await harness.client.query(
        'SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname',
        [DATA_API_ROLES]
      );
      assert.deepEqual(roles.rows, []);

      await runMigrations();

      const discovered = await migrationRunner.discoverMigrations(
        ACTIVE_MIGRATIONS
      );
      const firstHistory = await readHistory();
      assert.deepEqual(
        firstHistory.map(({ checksum, name, version }) => ({
          checksum,
          name,
          version,
        })),
        discovered.map(({ checksum, name, version }) => ({
          checksum,
          name,
          version,
        }))
      );
      assert.equal(
        firstHistory.length,
        migrationRunner.ACTIVE_MIGRATION_NAMES.length
      );
      await assertSecurityCatalog();
      await assertOwnerTriggerStillWorks();

      const historyBeforeNoop = await readHistory();
      const oidsBeforeNoop = await readRelationOids();
      await runMigrations();
      assert.deepEqual(await readHistory(), historyBeforeNoop);
      assert.deepEqual(await readRelationOids(), oidsBeforeNoop);
    });

    test('checksum drift é recusado sem alterar catálogo ou histórico', async () => {
      await harness.resetPublicSchema();
      const directory = await copyActiveMigrations('drift');
      await runMigrations({ migrationsDirectory: directory });
      const before = await schemaSnapshot();

      await fs.appendFile(
        path.join(directory, '002_add_business_branding.sql'),
        '\n-- integration drift\n',
        'utf8'
      );

      await assertMigrationFailure(() =>
        runMigrations({ migrationsDirectory: directory })
      );
      assert.deepEqual(await schemaSnapshot(), before);
    });

    test('histórico preexistente incompatível é recusado sem alteração', async () => {
      await harness.resetPublicSchema();
      await harness.client.query(`
        CREATE TABLE public.schema_migrations (
          version integer PRIMARY KEY,
          name text NOT NULL,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL
        )
      `);
      const before = await schemaSnapshot();

      await assertMigrationFailure(() => runMigrations());

      assert.deepEqual(await schemaSnapshot(), before);
    });

    test('falha em banco fresh reverte DDL e todo o histórico', async () => {
      await harness.resetPublicSchema();
      const directory = await scenarioDirectory('rollback-fresh');
      await writeMigration(
        directory,
        '001_create_rollback_marker.sql',
        'CREATE TABLE rollback_fresh_marker (id integer PRIMARY KEY);\n'
      );
      await writeMigration(
        directory,
        '002_fail_after_ddl.sql',
        [
          'CREATE TABLE rollback_fresh_pending (id integer PRIMARY KEY);',
          'SELECT integration_function_that_does_not_exist();',
          '',
        ].join('\n')
      );

      await assertMigrationFailure(() =>
        runMigrations({ migrationsDirectory: directory })
      );
      const markers = await harness.client.query(`
        SELECT
          to_regclass('public.rollback_fresh_marker')::text AS first_marker,
          to_regclass('public.rollback_fresh_pending')::text AS pending_marker
      `);
      assert.deepEqual(markers.rows[0], {
        first_marker: null,
        pending_marker: null,
      });
      await assertHistoryMissing();
    });

    test('falha após prefixo preserva objetos e histórico já confirmados', async () => {
      await harness.resetPublicSchema();
      const directory = await scenarioDirectory('rollback-prefix');
      await writeMigration(
        directory,
        '001_create_prefix_marker.sql',
        'CREATE TABLE rollback_prefix_marker (id integer PRIMARY KEY);\n'
      );
      await runMigrations({ migrationsDirectory: directory });
      const before = await schemaSnapshot();

      await writeMigration(
        directory,
        '002_fail_pending.sql',
        [
          'CREATE TABLE rollback_prefix_pending (id integer PRIMARY KEY);',
          'SELECT integration_function_that_does_not_exist();',
          '',
        ].join('\n')
      );

      await assertMigrationFailure(() =>
        runMigrations({ migrationsDirectory: directory })
      );
      assert.deepEqual(await schemaSnapshot(), before);
      const pending = await harness.client.query(
        "SELECT to_regclass('public.rollback_prefix_pending')::text AS relation_name"
      );
      assert.equal(pending.rows[0].relation_name, null);
    });

    test('dois runners serializam e registram a migration uma única vez', async () => {
      await harness.resetPublicSchema();
      const directory = await scenarioDirectory('concurrency');
      await writeMigration(
        directory,
        '001_concurrent_marker.sql',
        [
          'CREATE TABLE concurrency_marker (id integer PRIMARY KEY);',
          'SELECT pg_sleep(0.25);',
          'INSERT INTO concurrency_marker (id) VALUES (1);',
          '',
        ].join('\n')
      );

      await Promise.all([
        runMigrations({ migrationsDirectory: directory }),
        runMigrations({ migrationsDirectory: directory }),
      ]);

      const history = await readHistory();
      const marker = await harness.client.query(
        'SELECT COUNT(*)::integer AS marker_count FROM public.concurrency_marker'
      );
      assert.equal(history.length, 1);
      assert.equal(history[0].version, 1);
      assert.equal(marker.rows[0].marker_count, 1);
    });

    test('baseline aceita prefixo estrutural válido e aplica o sufixo', async () => {
      await harness.resetPublicSchema();
      await applyActivePrefix(3);
      await assertHistoryMissing();

      await runMigrations({ baselineExisting: true });

      assert.equal(
        (await readHistory()).length,
        migrationRunner.ACTIVE_MIGRATION_NAMES.length
      );
      const branding = await harness.client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'negocios'
          AND column_name IN ('banner_url', 'logo_url')
        ORDER BY column_name
      `);
      assert.deepEqual(
        branding.rows.map(({ column_name }) => column_name),
        ['banner_url', 'logo_url']
      );
      await assertSecurityCatalog();
    });

    test('refusals de baseline deixam estado partial/out-of-order/incompatível intacto', async (t) => {
      const cases = [
        {
          name: 'schema conhecido sem baseline explícito',
          setup: () => applyActivePrefix(1),
          options: {},
        },
        {
          name: 'migration parcial',
          setup: () =>
            harness.client.query(
              'CREATE TABLE public.usuarios (id integer PRIMARY KEY)'
            ),
          options: { baselineExisting: true },
        },
        {
          name: 'assinatura fora de ordem',
          setup: () =>
            harness.client.query(`
              CREATE TABLE public.negocios (
                logo_url varchar(500),
                banner_url varchar(500)
              )
            `),
          options: { baselineExisting: true },
        },
        {
          name: 'definição incompatível',
          setup: async () => {
            await applyActivePrefix(1);
            await harness.client.query(
              'ALTER TABLE public.usuarios ALTER COLUMN email TYPE text'
            );
          },
          options: { baselineExisting: true },
        },
        {
          name: 'confirmação errada',
          setup: () => applyActivePrefix(1),
          options: {
            baselineExisting: true,
            confirmDatabase: `${liveGuard.databaseName}_wrong`,
          },
        },
      ];

      for (const baselineCase of cases) {
        await t.test(baselineCase.name, async () => {
          await harness.resetPublicSchema();
          await baselineCase.setup();
          const before = await schemaSnapshot();

          await assertMigrationFailure(() => runMigrations(baselineCase.options));
          assert.deepEqual(await schemaSnapshot(), before);
        });
      }
    });

    test(
      'roles de Data API recebem fixtures e migration 004 revoga tudo sem bloquear owner',
      { skip: !liveGuard.runRoleFixtures },
      async () => {
        await harness.resetPublicSchema();
        await harness.client.query(`
          DO $roles$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
              CREATE ROLE anon NOLOGIN;
            END IF;
            IF NOT EXISTS (
              SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'
            ) THEN
              CREATE ROLE authenticated NOLOGIN;
            END IF;
            IF NOT EXISTS (
              SELECT 1 FROM pg_roles WHERE rolname = 'service_role'
            ) THEN
              CREATE ROLE service_role NOLOGIN;
            END IF;
          END
          $roles$;
        `);
        await applyActivePrefix(3);
        await harness.client.query(`
          GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
            TO PUBLIC, anon, authenticated, service_role;
          GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
            TO PUBLIC, anon, authenticated, service_role;
          GRANT ALL PRIVILEGES ON FUNCTION public.atualizar_updated_at()
            TO PUBLIC, anon, authenticated, service_role;
        `);
        assert.ok((await findForbiddenPrivileges()).length > 0);

        await runMigrations({ baselineExisting: true });

        assert.equal(
          (await readHistory()).length,
          migrationRunner.ACTIVE_MIGRATION_NAMES.length
        );
        await assertSecurityCatalog();
        await assertOwnerTriggerStillWorks();
      }
    );

    test(
      'PostgreSQL 17 recusa privilégio alcançável por SET ROLE em parent NOINHERIT',
      { skip: !liveGuard.runRoleFixtures },
      async () => {
        const parentRole = 'agendai_noinherit_privilege_parent';

        await harness.resetPublicSchema();
        await runMigrations();

        try {
          await harness.client.query(`
            DO $roles$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                CREATE ROLE anon NOLOGIN;
              END IF;
              IF EXISTS (
                SELECT 1
                FROM pg_roles
                WHERE rolname = 'agendai_noinherit_privilege_parent'
              ) THEN
                DROP ROLE agendai_noinherit_privilege_parent;
              END IF;
              CREATE ROLE agendai_noinherit_privilege_parent
                NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
                NOREPLICATION NOBYPASSRLS;
            END
            $roles$;
          `);
          await harness.client.query(`
            GRANT agendai_noinherit_privilege_parent TO anon
              WITH INHERIT FALSE, SET TRUE;
            GRANT SELECT ON TABLE public.usuarios
              TO agendai_noinherit_privilege_parent;
          `);

          const reachability = await harness.client.query(`
            SELECT
              current_setting('server_version_num')::integer
                AS server_version_num,
              parent.rolinherit AS parent_inherits,
              pg_has_role('anon', parent.oid, 'USAGE') AS inherited_directly,
              pg_has_role('anon', parent.oid, 'SET') AS can_set_role,
              has_table_privilege(
                'anon',
                'public.usuarios',
                'SELECT'
              ) AS anon_has_direct_select,
              has_table_privilege(
                parent.oid,
                'public.usuarios',
                'SELECT'
              ) AS parent_has_select
            FROM pg_roles AS parent
            WHERE parent.rolname = 'agendai_noinherit_privilege_parent'
          `);
          assert.equal(reachability.rowCount, 1);
          assert.ok(reachability.rows[0].server_version_num >= 170000);
          assert.deepEqual(
            {
              anon_has_direct_select:
                reachability.rows[0].anon_has_direct_select,
              can_set_role: reachability.rows[0].can_set_role,
              inherited_directly: reachability.rows[0].inherited_directly,
              parent_has_select: reachability.rows[0].parent_has_select,
              parent_inherits: reachability.rows[0].parent_inherits,
            },
            {
              anon_has_direct_select: false,
              can_set_role: true,
              inherited_directly: false,
              parent_has_select: true,
              parent_inherits: false,
            }
          );

          const historyBefore = await readHistory();
          await assert.rejects(runMigrations(), (error) => {
            assert.equal(
              error instanceof migrationRunner.MigrationRunnerError,
              true
            );
            assert.equal(error.code, 'MIGRATION_BASELINE_INVALID');
            return true;
          });
          assert.deepEqual(await readHistory(), historyBefore);

          const privilegeAfterRefusal = await harness.client.query(`
            SELECT has_table_privilege(
              'agendai_noinherit_privilege_parent',
              'public.usuarios',
              'SELECT'
            ) AS parent_has_select
          `);
          assert.equal(
            privilegeAfterRefusal.rows[0].parent_has_select,
            true
          );
        } finally {
          const parentExists = await harness.client.query(
            "SELECT 1 FROM pg_roles WHERE rolname = 'agendai_noinherit_privilege_parent'"
          );
          if (parentExists.rowCount === 1) {
            await harness.client.query(
              'REVOKE agendai_noinherit_privilege_parent FROM anon'
            );
            await harness.client.query(
              'DROP OWNED BY agendai_noinherit_privilege_parent'
            );
            await harness.client.query(
              'DROP ROLE agendai_noinherit_privilege_parent'
            );
          }
        }
      }
    );
  }
);

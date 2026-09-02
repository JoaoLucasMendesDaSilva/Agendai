const assert = require('node:assert/strict');
const path = require('node:path');
const {
  after,
  before,
  beforeEach,
  describe,
  test,
} = require('node:test');

const {
  createPostgresTestHarness,
  createRealQueryBarrier,
  validatePostgresTestEnvironment,
  verifyConnectedIdentity,
} = require('./postgresTestHarness');

const ACTIVE_MIGRATIONS = path.resolve(
  __dirname,
  '../../database/postgres-migrations'
);
const OWNER_CONSTRAINT = 'uk_negocios_usuario_id';
const databasePath = require.resolve('../../src/config/database');
const negocioServicePath = require.resolve('../../src/services/negocioService');
const publicoServicePath = require.resolve('../../src/services/publicoService');
const { criarRegistroErroSeguro } = require('../../src/utils/errorLogging');

const liveGuard = validatePostgresTestEnvironment(process.env);
const liveSkip = liveGuard.enabled ? false : liveGuard.reason;

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function matchesOwnerPreflight(sql) {
  const query = normalizeSql(sql);
  return (
    query.includes('SELECT id FROM negocios') &&
    query.includes('WHERE usuario_id = $1') &&
    query.includes('LIMIT 1')
  );
}

function businessPayload(name, suffix) {
  return {
    contato_privacidade: `${suffix}@example.invalid`,
    nome: name,
  };
}

function loadServices(pool) {
  const database = require(databasePath);
  const originalGetDatabasePool = database.getDatabasePool;

  delete require.cache[negocioServicePath];
  delete require.cache[publicoServicePath];
  database.getDatabasePool = () => pool;

  try {
    return {
      negocio: require(negocioServicePath),
      publico: require(publicoServicePath),
      restore: () => {
        delete require.cache[negocioServicePath];
        delete require.cache[publicoServicePath];
      },
    };
  } finally {
    database.getDatabasePool = originalGetDatabasePool;
  }
}

describe(
  'identidade durável de negócio contra PostgreSQL descartável',
  { concurrency: false, skip: liveSkip },
  () => {
    let Client;
    let Pool;
    let appPool;
    let harness;
    let migrationRunner;

    before(async () => {
      ({ Client, Pool } = require('pg'));
      migrationRunner = require('../../src/database/migrationRunner');
      harness = await createPostgresTestHarness({ environment: process.env });
    });

    after(async () => {
      delete require.cache[negocioServicePath];
      delete require.cache[publicoServicePath];
      if (appPool) await appPool.end();
      if (harness?.enabled) await harness.close();
    });

    function runMigrations({ baselineExisting = false } = {}) {
      return migrationRunner.runMigrations({
        baselineExisting,
        confirmDatabase: harness.databaseName,
        createClient: () => new Client({ ...liveGuard.clientConfig }),
        migrationsDirectory: ACTIVE_MIGRATIONS,
      });
    }

    async function applyActivePrefix(lastVersion) {
      const migrations = await migrationRunner.discoverMigrations(
        ACTIVE_MIGRATIONS
      );

      for (const migration of migrations.slice(0, lastVersion)) {
        await harness.client.query(migration.sql);
      }
    }

    async function historyRelation() {
      const result = await harness.client.query(
        "SELECT to_regclass('public.schema_migrations')::text AS relation_name"
      );
      return result.rows[0].relation_name;
    }

    async function identityState() {
      const [businesses, constraints, indexes] = await Promise.all([
        harness.client.query(`
          SELECT id, usuario_id, nome, slug_publico
          FROM public.negocios
          ORDER BY id
        `),
        harness.client.query(`
          SELECT conname, pg_get_constraintdef(oid, true) AS definition
          FROM pg_constraint
          WHERE conrelid = 'public.negocios'::regclass
          ORDER BY conname
        `),
        harness.client.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = 'negocios'
          ORDER BY indexname
        `),
      ]);

      return {
        businesses: businesses.rows,
        constraints: constraints.rows,
        history: await historyRelation(),
        indexes: indexes.rows,
      };
    }

    async function insertUser(name, email) {
      const result = await harness.client.query(
        `INSERT INTO public.usuarios (nome, email, senha_hash)
         VALUES ($1, $2, 'fixture-hash')
         RETURNING id`,
        [name, email]
      );
      return result.rows[0].id;
    }

    async function assertMigrationFailure(operation) {
      await assert.rejects(operation, (error) => {
        assert.equal(error instanceof migrationRunner.MigrationRunnerError, true);
        assert.match(error.code, /^MIGRATION_/);
        return true;
      });
    }

    async function assertExactOwnerConstraint(executor = harness.client) {
      const result = await executor.query(
        `
          SELECT
            constraint_row.contype,
            constraint_row.convalidated,
            constraint_row.condeferrable,
            constraint_row.condeferred,
            index_row.indisunique,
            index_row.indisprimary,
            index_row.indisexclusion,
            index_row.indisvalid,
            index_row.indisready,
            index_row.indimmediate,
            index_row.indnullsnotdistinct,
            access_method.amname AS access_method,
            index_relation.relname AS index_name,
            pg_get_constraintdef(constraint_row.oid, true) AS definition,
            ARRAY(
              SELECT attribute.attname
              FROM unnest(index_row.indkey) WITH ORDINALITY AS key(attnum, position)
              JOIN pg_attribute AS attribute
                ON attribute.attrelid = index_row.indrelid
               AND attribute.attnum = key.attnum
              ORDER BY key.position
            ) AS columns,
            to_regclass('public.idx_negocios_usuario_id')::text
              AS legacy_index
          FROM pg_constraint AS constraint_row
          JOIN pg_index AS index_row
            ON index_row.indexrelid = constraint_row.conindid
          JOIN pg_class AS index_relation
            ON index_relation.oid = index_row.indexrelid
          JOIN pg_am AS access_method
            ON access_method.oid = index_relation.relam
          WHERE constraint_row.conrelid = 'public.negocios'::regclass
            AND constraint_row.conname = $1
        `,
        [OWNER_CONSTRAINT]
      );

      assert.equal(result.rowCount, 1);
      assert.deepEqual(result.rows[0], {
        access_method: 'btree',
        columns: ['usuario_id'],
        condeferred: false,
        condeferrable: false,
        contype: 'u',
        convalidated: true,
        definition: 'UNIQUE (usuario_id)',
        index_name: OWNER_CONSTRAINT,
        indisexclusion: false,
        indimmediate: true,
        indnullsnotdistinct: false,
        indisprimary: false,
        indisready: true,
        indisunique: true,
        indisvalid: true,
        legacy_index: null,
      });
    }

    describe('migration 006 e baseline', { concurrency: false }, () => {
      test('duplicidade bloqueia sem mutação; correção permite retry e constraint exata', async () => {
        await harness.resetPublicSchema();
        await applyActivePrefix(5);
        const ownerId = await insertUser(
          'Owner duplicado',
          'owner-duplicado@example.invalid'
        );
        await harness.client.query(
          `INSERT INTO public.negocios (usuario_id, nome, slug_publico)
           VALUES ($1, 'Primeiro', 'primeiro'), ($1, 'Segundo', 'segundo')`,
          [ownerId]
        );
        const before = await identityState();

        await assert.rejects(
          runMigrations({ baselineExisting: true }),
          (error) => {
            assert.equal(
              error instanceof migrationRunner.MigrationRunnerError,
              true
            );
            assert.equal(error.code, 'MIGRATION_EXECUTION_FAILED');
            assert.doesNotMatch(
              String(error),
              /Owner duplicado|owner-duplicado|primeiro|segundo/i
            );
            return true;
          }
        );
        assert.deepEqual(await identityState(), before);

        await harness.client.query(
          "DELETE FROM public.negocios WHERE slug_publico = 'segundo'"
        );
        const outcome = await runMigrations({ baselineExisting: true });

        assert.equal(outcome.baselined.length, 5);
        assert.deepEqual(outcome.applied, ['006_enforce_business_identity.sql']);
        await assertExactOwnerConstraint();

        await harness.client.query('BEGIN');
        try {
          await harness.client.query('SET LOCAL enable_seqscan = off');
          const plan = await harness.client.query(
            `EXPLAIN (FORMAT JSON, COSTS OFF)
             SELECT id FROM public.negocios
             WHERE usuario_id = $1
             LIMIT 1`,
            [ownerId]
          );
          assert.match(JSON.stringify(plan.rows), /uk_negocios_usuario_id/);
        } finally {
          await harness.client.query('ROLLBACK');
        }

        await assert.rejects(
          harness.client.query(
            `INSERT INTO public.negocios (usuario_id, nome, slug_publico)
             VALUES ($1, 'Terceiro', 'terceiro')`,
            [ownerId]
          ),
          (error) => {
            assert.equal(error.code, '23505');
            assert.equal(error.constraint, OWNER_CONSTRAINT);
            return true;
          }
        );
        const history = await harness.client.query(
          'SELECT version FROM public.schema_migrations ORDER BY version'
        );
        assert.deepEqual(
          history.rows.map(({ version }) => version),
          [1, 2, 3, 4, 5, 6]
        );
      });

      test('baseline reconhece 006 exata e recusa versões parcial ou errada', async (t) => {
        await t.test('exata', async () => {
          await harness.resetPublicSchema();
          await applyActivePrefix(6);

          const outcome = await runMigrations({ baselineExisting: true });

          assert.equal(outcome.baselined.length, 6);
          assert.deepEqual(outcome.applied, []);
          await assertExactOwnerConstraint();
        });

        for (const baselineCase of [
          {
            name: 'parcial mantém índice legado',
            sql: `ALTER TABLE public.negocios
              ADD CONSTRAINT uk_negocios_usuario_id UNIQUE (usuario_id)`,
          },
          {
            name: 'errada usa colunas extras',
            sql: `ALTER TABLE public.negocios
              ADD CONSTRAINT uk_negocios_usuario_id
              UNIQUE (usuario_id, slug_publico)`,
          },
        ]) {
          await t.test(baselineCase.name, async () => {
            await harness.resetPublicSchema();
            await applyActivePrefix(5);
            await harness.client.query(baselineCase.sql);
            const before = await identityState();

            await assertMigrationFailure(() =>
              runMigrations({ baselineExisting: true })
            );
            assert.deepEqual(await identityState(), before);
          });
        }
      });
    });

    describe('serviço de negócios com constraint ativa', { concurrency: false }, () => {
      before(async () => {
        await harness.resetPublicSchema();
        await runMigrations();
        appPool = new Pool({ ...liveGuard.clientConfig });
        const identityClient = await appPool.connect();
        try {
          await verifyConnectedIdentity(identityClient, liveGuard);
        } finally {
          identityClient.release();
        }
      });

      beforeEach(async () => {
        await appPool.query(`
          TRUNCATE TABLE
            public.solicitacoes_lgpd,
            public.agendamentos,
            public.profissionais,
            public.servicos,
            public.negocios,
            public.usuarios
          RESTART IDENTITY CASCADE
        `);
      });

      async function createAppUser(name, email) {
        const result = await appPool.query(
          `INSERT INTO public.usuarios (nome, email, senha_hash)
           VALUES ($1, $2, 'fixture-hash')
           RETURNING id`,
          [name, email]
        );
        return result.rows[0].id;
      }

      async function runOwnerPreflightRace(operations) {
        const barrier = createRealQueryBarrier(
          appPool,
          matchesOwnerPreflight
        );
        const services = loadServices(barrier.pool);
        let outcomesPromise;

        try {
          outcomesPromise = Promise.allSettled(operations(services.negocio));
          await barrier.waitUntilReady();
          assert.equal(barrier.snapshot().arrivals, 2);
          assert.equal(barrier.snapshot().backendPids.length, 2);
          assert.equal(barrier.snapshot().continuations, 0);

          barrier.release();
          const outcomes = await outcomesPromise;
          assert.equal(barrier.snapshot().continuations, 2);
          assert.equal(barrier.snapshot().releases, 2);
          return outcomes;
        } finally {
          barrier.release();
          if (outcomesPromise) await outcomesPromise;
          services.restore();
        }
      }

      test('duas criações do mesmo owner deixam um negócio e conflito público estável', async () => {
        const ownerId = await createAppUser(
          'Owner concorrente',
          'owner-race@example.invalid'
        );
        const outcomes = await runOwnerPreflightRace((negocio) => [
          negocio.criarNegocio(
            ownerId,
            businessPayload('Studio concorrente A', 'race-a')
          ),
          negocio.criarNegocio(
            ownerId,
            businessPayload('Studio concorrente B', 'race-b')
          ),
        ]);
        const fulfilled = outcomes.filter(({ status }) => status === 'fulfilled');
        const rejected = outcomes.filter(({ status }) => status === 'rejected');

        assert.equal(fulfilled.length, 1);
        assert.equal(rejected.length, 1);
        assert.equal(rejected[0].reason.status, 409);
        assert.equal(
          rejected[0].reason.publicMessage,
          'Usuario ja possui negocio cadastrado.'
        );
        assert.equal(rejected[0].reason.code, undefined);
        assert.equal(Object.hasOwn(rejected[0].reason, 'constraint'), false);
        assert.doesNotMatch(String(rejected[0].reason), /23505|uk_negocios/i);

        const rows = await appPool.query(
          'SELECT id FROM public.negocios WHERE usuario_id = $1',
          [ownerId]
        );
        assert.equal(rows.rowCount, 1);
      });

      test('nomes iguais entre owners recebem slugs distintos e avançam sufixo ocupado', async () => {
        const firstOwner = await createAppUser(
          'Owner um',
          'owner-one@example.invalid'
        );
        const secondOwner = await createAppUser(
          'Owner dois',
          'owner-two@example.invalid'
        );
        const outcomes = await runOwnerPreflightRace((negocio) => [
          negocio.criarNegocio(
            firstOwner,
            businessPayload('Studio Central', 'central-one')
          ),
          negocio.criarNegocio(
            secondOwner,
            businessPayload('Studio Central', 'central-two')
          ),
        ]);

        assert.equal(
          outcomes.filter(({ status }) => status === 'fulfilled').length,
          2
        );
        assert.deepEqual(
          outcomes.map(({ value }) => value.slug_publico).sort(),
          ['studio-central', 'studio-central-2']
        );

        const thirdOwner = await createAppUser(
          'Owner três',
          'owner-three@example.invalid'
        );
        const services = loadServices(appPool);
        try {
          const third = await services.negocio.criarNegocio(
            thirdOwner,
            businessPayload('Studio Central', 'central-three')
          );
          assert.equal(third.slug_publico, 'studio-central-3');

          const rows = await appPool.query(
            `SELECT usuario_id, slug_publico
             FROM public.negocios
             WHERE usuario_id = ANY($1::integer[])
             ORDER BY slug_publico`,
            [[firstOwner, secondOwner, thirdOwner]]
          );
          assert.equal(rows.rowCount, 3);
          assert.deepEqual(
            rows.rows.map(({ slug_publico: slug }) => slug),
            ['studio-central', 'studio-central-2', 'studio-central-3']
          );
          assert.deepEqual(
            new Set(rows.rows.map(({ usuario_id: ownerId }) => ownerId)),
            new Set([firstOwner, secondOwner, thirdOwner])
          );
        } finally {
          services.restore();
        }
      });

      test('constraint 23505 desconhecida não vira conflito público nem aparece no log seguro', async () => {
        const ownerId = await createAppUser(
          'Owner erro interno',
          'owner-internal@example.invalid'
        );
        const databaseError = Object.assign(
          new Error('detalhe interno sensível'),
          {
            code: '23505',
            constraint: 'uk_future_internal_constraint',
          }
        );
        const poolWithUnknownConstraint = {
          query: (sql, params) => {
            if (normalizeSql(sql).startsWith('INSERT INTO negocios')) {
              return Promise.reject(databaseError);
            }
            return appPool.query(sql, params);
          },
        };
        const services = loadServices(poolWithUnknownConstraint);

        try {
          await assert.rejects(
            services.negocio.criarNegocio(
              ownerId,
              businessPayload('Studio interno', 'internal')
            ),
            (error) => {
              assert.equal(error, databaseError);
              assert.equal(error.status, undefined);
              assert.equal(error.publicMessage, undefined);
              return true;
            }
          );
          const safeLog = criarRegistroErroSeguro(
            databaseError,
            { method: 'POST' },
            500
          );
          assert.deepEqual(safeLog, {
            codigo: '23505',
            metodo: 'POST',
            status: 500,
          });
          assert.doesNotMatch(
            JSON.stringify(safeLog),
            /future_internal|constraint|sens.vel/i
          );
          const rows = await appPool.query(
            'SELECT id FROM public.negocios WHERE usuario_id = $1',
            [ownerId]
          );
          assert.equal(rows.rowCount, 0);
        } finally {
          services.restore();
        }
      });

      test('renomear preserva slug e a página pública continua no endereço original', async () => {
        const ownerId = await createAppUser(
          'Owner rename',
          'owner-rename@example.invalid'
        );
        const services = loadServices(appPool);

        try {
          const created = await services.negocio.criarNegocio(
            ownerId,
            businessPayload('Nome original', 'rename')
          );
          const renamed = await services.negocio.atualizarNegocio(
            ownerId,
            created.id,
            { nome: 'Nome atualizado' }
          );
          const publicBusiness = await services.publico.obterNegocio(
            created.slug_publico
          );

          assert.equal(renamed.slug_publico, created.slug_publico);
          assert.equal(publicBusiness.id, created.id);
          assert.equal(publicBusiness.nome, 'Nome atualizado');
          assert.equal(publicBusiness.slug_publico, created.slug_publico);
        } finally {
          services.restore();
        }
      });
    });
  }
);

const assert = require('node:assert/strict');
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
const SERVICE_FOREIGN_KEY = 'fk_agendamentos_servico_negocio';
const PROFESSIONAL_FOREIGN_KEY =
  'fk_agendamentos_profissional_negocio';
const EXCLUSION_CONSTRAINT =
  'ex_agendamentos_profissional_periodo_ativo';

const ADD_PARENT_KEYS_SQL = `
  ALTER TABLE public.servicos
    ADD CONSTRAINT uk_servicos_id_negocio_id UNIQUE (id, negocio_id);
  ALTER TABLE public.profissionais
    ADD CONSTRAINT uk_profissionais_id_negocio_id UNIQUE (id, negocio_id);
`;

const ADD_UNVALIDATED_FOREIGN_KEYS_SQL = `
  ALTER TABLE public.agendamentos
    ADD CONSTRAINT fk_agendamentos_servico_negocio
    FOREIGN KEY (servico_id, negocio_id)
    REFERENCES public.servicos (id, negocio_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
    NOT VALID;
  ALTER TABLE public.agendamentos
    ADD CONSTRAINT fk_agendamentos_profissional_negocio
    FOREIGN KEY (profissional_id, negocio_id)
    REFERENCES public.profissionais (id, negocio_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
    NOT VALID;
`;

const DROP_OLD_FOREIGN_KEYS_SQL = `
  ALTER TABLE public.agendamentos
    DROP CONSTRAINT fk_agendamentos_servico;
  ALTER TABLE public.agendamentos
    DROP CONSTRAINT fk_agendamentos_profissional;
`;

const liveGuard = validatePostgresTestEnvironment(process.env);
const liveSkip = liveGuard.enabled ? false : liveGuard.reason;

describe(
  'relações de tenant dos agendamentos contra PostgreSQL descartável',
  { concurrency: false, skip: liveSkip },
  () => {
    let Client;
    let harness;
    let migrationRunner;

    before(async () => {
      ({ Client } = require('pg'));
      migrationRunner = require('../../src/database/migrationRunner');
      harness = await createPostgresTestHarness({ environment: process.env });
    });

    after(async () => {
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

      assert.ok(
        migrations.length >= lastVersion,
        `Prefixo ${lastVersion} não está disponível.`
      );

      for (const migration of migrations.slice(0, lastVersion)) {
        await harness.client.query(migration.sql);
      }
    }

    async function seedTenants() {
      const users = await harness.client.query(`
        INSERT INTO public.usuarios (nome, email, senha_hash)
        VALUES
          ('Owner fixture A', 'owner-a@example.invalid', 'fixture-hash'),
          ('Owner fixture B', 'owner-b@example.invalid', 'fixture-hash')
        RETURNING id
      `);
      const businesses = await harness.client.query(
        `
          INSERT INTO public.negocios (usuario_id, nome, slug_publico)
          VALUES
            ($1, 'Negócio fixture A', 'negocio-fixture-a'),
            ($2, 'Negócio fixture B', 'negocio-fixture-b')
          RETURNING id
        `,
        [users.rows[0].id, users.rows[1].id]
      );
      const businessA = businesses.rows[0].id;
      const businessB = businesses.rows[1].id;
      const services = await harness.client.query(
        `
          INSERT INTO public.servicos (negocio_id, nome, duracao_minutos)
          VALUES
            ($1, 'Serviço fixture A', 60),
            ($1, 'Serviço fixture A alternativo', 60),
            ($2, 'Serviço fixture B', 60)
          RETURNING id
        `,
        [businessA, businessB]
      );
      const professionals = await harness.client.query(
        `
          INSERT INTO public.profissionais (negocio_id, nome)
          VALUES
            ($1, 'Profissional fixture A'),
            ($1, 'Profissional fixture A alternativo'),
            ($2, 'Profissional fixture B')
          RETURNING id
        `,
        [businessA, businessB]
      );

      return {
        a: {
          businessId: businessA,
          professionalId: professionals.rows[0].id,
          secondProfessionalId: professionals.rows[1].id,
          secondServiceId: services.rows[1].id,
          serviceId: services.rows[0].id,
        },
        b: {
          businessId: businessB,
          professionalId: professionals.rows[2].id,
          serviceId: services.rows[2].id,
        },
      };
    }

    function insertAppointment({
      businessId,
      end,
      name,
      professionalId,
      serviceId,
      start,
      status = 'confirmado',
    }) {
      return harness.client.query(
        `
          INSERT INTO public.agendamentos (
            negocio_id,
            servico_id,
            profissional_id,
            cliente_nome,
            cliente_telefone,
            data_hora_inicio,
            data_hora_fim,
            status
          ) VALUES ($1, $2, $3, $4, '00000000000', $5, $6, $7)
          RETURNING id
        `,
        [
          businessId,
          serviceId,
          professionalId,
          name,
          start,
          end,
          status,
        ]
      );
    }

    async function readMismatchCounts() {
      const result = await harness.client.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE service.id IS NULL
               OR service.negocio_id IS DISTINCT FROM appointment.negocio_id
          )::integer AS service_mismatches,
          COUNT(*) FILTER (
            WHERE professional.id IS NULL
               OR professional.negocio_id IS DISTINCT FROM appointment.negocio_id
          )::integer AS professional_mismatches
        FROM public.agendamentos AS appointment
        LEFT JOIN public.servicos AS service
          ON service.id = appointment.servico_id
        LEFT JOIN public.profissionais AS professional
          ON professional.id = appointment.profissional_id
      `);
      return result.rows[0];
    }

    async function readIndexNames() {
      const result = await harness.client.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('agendamentos', 'profissionais', 'servicos')
        ORDER BY tablename, indexname
      `);
      return result.rows;
    }

    async function readRelationshipState() {
      const appointments = await harness.client.query(`
        SELECT
          id,
          negocio_id,
          servico_id,
          profissional_id,
          cliente_nome,
          data_hora_inicio::text AS data_hora_inicio,
          data_hora_fim::text AS data_hora_fim,
          status
        FROM public.agendamentos
        ORDER BY id
      `);
      const constraints = await harness.client.query(`
        SELECT
          constraint_row.conname,
          constraint_row.contype,
          constraint_row.convalidated,
          pg_get_constraintdef(constraint_row.oid, true) AS definition
        FROM pg_constraint AS constraint_row
        WHERE constraint_row.conrelid IN (
          'public.agendamentos'::regclass,
          'public.profissionais'::regclass,
          'public.servicos'::regclass
        )
        ORDER BY constraint_row.conrelid::regclass::text,
          constraint_row.conname
      `);
      const historyRelation = await harness.client.query(
        "SELECT to_regclass('public.schema_migrations')::text AS relation_name"
      );
      const history = historyRelation.rows[0].relation_name
        ? await harness.client.query(`
            SELECT
              version,
              name,
              checksum,
              applied_at::text AS applied_at,
              xmin::text AS xmin
            FROM public.schema_migrations
            ORDER BY version
          `)
        : { rows: [] };

      return {
        appointments: appointments.rows,
        constraints: constraints.rows,
        history: history.rows,
        historyRelation: historyRelation.rows[0].relation_name,
        indexes: await readIndexNames(),
      };
    }

    async function readConstraintCatalog() {
      const result = await harness.client.query(
        `
          SELECT
            constraint_row.conname AS constraint_name,
            constraint_row.contype AS constraint_type,
            constraint_row.convalidated AS validated,
            constraint_row.condeferrable AS deferrable,
            constraint_row.condeferred AS deferred,
            constraint_row.confupdtype AS update_action,
            constraint_row.confdeltype AS delete_action,
            referenced_table.relname AS referenced_table,
            ARRAY(
              SELECT attribute.attname::text
              FROM unnest(constraint_row.conkey)
                WITH ORDINALITY AS key(attnum, position)
              JOIN pg_attribute AS attribute
                ON attribute.attrelid = constraint_row.conrelid
               AND attribute.attnum = key.attnum
              ORDER BY key.position
            ) AS columns,
            ARRAY(
              SELECT attribute.attname::text
              FROM unnest(constraint_row.confkey)
                WITH ORDINALITY AS key(attnum, position)
              JOIN pg_attribute AS attribute
                ON attribute.attrelid = constraint_row.confrelid
               AND attribute.attnum = key.attnum
              ORDER BY key.position
            ) AS referenced_columns
          FROM pg_constraint AS constraint_row
          LEFT JOIN pg_class AS referenced_table
            ON referenced_table.oid = constraint_row.confrelid
          WHERE constraint_row.conname = ANY($1::text[])
          ORDER BY constraint_row.conname
        `,
        [[
          EXCLUSION_CONSTRAINT,
          'fk_agendamentos_negocio',
          'fk_agendamentos_profissional',
          PROFESSIONAL_FOREIGN_KEY,
          'fk_agendamentos_servico',
          SERVICE_FOREIGN_KEY,
          'uk_profissionais_id_negocio_id',
          'uk_servicos_id_negocio_id',
        ]]
      );
      return result.rows;
    }

    async function assertExactRelationshipCatalog() {
      const rows = await readConstraintCatalog();
      const foreignKeys = rows
        .filter(({ constraint_type: type }) => type === 'f')
        .map((row) => ({
          columns: row.columns,
          constraint_name: row.constraint_name,
          deferred: row.deferred,
          deferrable: row.deferrable,
          delete_action: row.delete_action,
          referenced_columns: row.referenced_columns,
          referenced_table: row.referenced_table,
          update_action: row.update_action,
          validated: row.validated,
        }));

      assert.deepEqual(foreignKeys, [
        {
          columns: ['negocio_id'],
          constraint_name: 'fk_agendamentos_negocio',
          deferred: false,
          deferrable: false,
          delete_action: 'r',
          referenced_columns: ['id'],
          referenced_table: 'negocios',
          update_action: 'c',
          validated: true,
        },
        {
          columns: ['profissional_id', 'negocio_id'],
          constraint_name: PROFESSIONAL_FOREIGN_KEY,
          deferred: false,
          deferrable: false,
          delete_action: 'r',
          referenced_columns: ['id', 'negocio_id'],
          referenced_table: 'profissionais',
          update_action: 'c',
          validated: true,
        },
        {
          columns: ['servico_id', 'negocio_id'],
          constraint_name: SERVICE_FOREIGN_KEY,
          deferred: false,
          deferrable: false,
          delete_action: 'r',
          referenced_columns: ['id', 'negocio_id'],
          referenced_table: 'servicos',
          update_action: 'c',
          validated: true,
        },
      ]);

      const uniqueKeys = rows
        .filter(({ constraint_type: type }) => type === 'u')
        .map(({ columns, constraint_name: constraintName, validated }) => ({
          columns,
          constraintName,
          validated,
        }));
      assert.deepEqual(uniqueKeys, [
        {
          columns: ['id', 'negocio_id'],
          constraintName: 'uk_profissionais_id_negocio_id',
          validated: true,
        },
        {
          columns: ['id', 'negocio_id'],
          constraintName: 'uk_servicos_id_negocio_id',
          validated: true,
        },
      ]);

      const exclusion = rows.find(
        ({ constraint_name: name }) => name === EXCLUSION_CONSTRAINT
      );
      assert.equal(exclusion?.constraint_type, 'x');
      assert.equal(exclusion?.validated, true);

      const appointmentForeignKeys = await harness.client.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.agendamentos'::regclass
          AND contype = 'f'
        ORDER BY conname
      `);
      assert.deepEqual(
        appointmentForeignKeys.rows.map(({ conname }) => conname),
        [
          'fk_agendamentos_negocio',
          PROFESSIONAL_FOREIGN_KEY,
          SERVICE_FOREIGN_KEY,
        ]
      );
    }

    async function assertMigrationFailure(operation, expectedCode) {
      await assert.rejects(operation, (error) => {
        assert.equal(error instanceof migrationRunner.MigrationRunnerError, true);
        assert.equal(error.code, expectedCode);
        return true;
      });
    }

    async function assertDatabaseFailure(operation, code, constraints) {
      await assert.rejects(operation, (error) => {
        assert.equal(error.code, code);
        assert.ok(constraints.includes(error.constraint));
        return true;
      });
    }

    test('antes da 007 o banco aceita três relações cruzadas e uma válida', async () => {
      await harness.resetPublicSchema();
      await applyActivePrefix(6);
      await harness.client.query('BEGIN');

      try {
        const fixture = await seedTenants();
        const rows = [
          {
            name: 'Válido',
            professionalId: fixture.a.professionalId,
            serviceId: fixture.a.serviceId,
            start: '2099-09-01T09:00:00',
            end: '2099-09-01T10:00:00',
          },
          {
            name: 'Serviço cruzado',
            professionalId: fixture.a.professionalId,
            serviceId: fixture.b.serviceId,
            start: '2099-09-01T10:00:00',
            end: '2099-09-01T11:00:00',
          },
          {
            name: 'Profissional cruzado',
            professionalId: fixture.b.professionalId,
            serviceId: fixture.a.serviceId,
            start: '2099-09-01T11:00:00',
            end: '2099-09-01T12:00:00',
          },
          {
            name: 'Ambos cruzados',
            professionalId: fixture.b.professionalId,
            serviceId: fixture.b.serviceId,
            start: '2099-09-01T12:00:00',
            end: '2099-09-01T13:00:00',
          },
        ];

        for (const row of rows) {
          await insertAppointment({
            businessId: fixture.a.businessId,
            ...row,
          });
        }

        const joined = await harness.client.query(`
          SELECT
            appointment.cliente_nome,
            appointment.negocio_id AS appointment_business_id,
            service.negocio_id AS service_business_id,
            professional.negocio_id AS professional_business_id
          FROM public.agendamentos AS appointment
          JOIN public.servicos AS service ON service.id = appointment.servico_id
          JOIN public.profissionais AS professional
            ON professional.id = appointment.profissional_id
          ORDER BY appointment.id
        `);
        assert.deepEqual(joined.rows, [
          {
            appointment_business_id: fixture.a.businessId,
            cliente_nome: 'Válido',
            professional_business_id: fixture.a.businessId,
            service_business_id: fixture.a.businessId,
          },
          {
            appointment_business_id: fixture.a.businessId,
            cliente_nome: 'Serviço cruzado',
            professional_business_id: fixture.a.businessId,
            service_business_id: fixture.b.businessId,
          },
          {
            appointment_business_id: fixture.a.businessId,
            cliente_nome: 'Profissional cruzado',
            professional_business_id: fixture.b.businessId,
            service_business_id: fixture.a.businessId,
          },
          {
            appointment_business_id: fixture.a.businessId,
            cliente_nome: 'Ambos cruzados',
            professional_business_id: fixture.b.businessId,
            service_business_id: fixture.b.businessId,
          },
        ]);
      } finally {
        await harness.client.query('ROLLBACK');
      }

      const cleaned = await harness.client.query(
        'SELECT COUNT(*)::integer AS count FROM public.agendamentos'
      );
      assert.equal(cleaned.rows[0].count, 0);
    });

    test('guard da 007 recusa inconsistências sem alterar linhas, catálogo ou histórico', async () => {
      await harness.resetPublicSchema();
      await applyActivePrefix(6);
      const fixture = await seedTenants();

      await insertAppointment({
        businessId: fixture.a.businessId,
        end: '2099-09-02T10:00:00',
        name: 'Guard serviço',
        professionalId: fixture.a.professionalId,
        serviceId: fixture.b.serviceId,
        start: '2099-09-02T09:00:00',
      });
      await insertAppointment({
        businessId: fixture.a.businessId,
        end: '2099-09-02T11:00:00',
        name: 'Guard profissional',
        professionalId: fixture.b.professionalId,
        serviceId: fixture.a.serviceId,
        start: '2099-09-02T10:00:00',
      });
      await insertAppointment({
        businessId: fixture.a.businessId,
        end: '2099-09-02T12:00:00',
        name: 'Guard ambos',
        professionalId: fixture.b.professionalId,
        serviceId: fixture.b.serviceId,
        start: '2099-09-02T11:00:00',
      });

      assert.deepEqual(await readMismatchCounts(), {
        professional_mismatches: 2,
        service_mismatches: 2,
      });
      const before = await readRelationshipState();

      const migrations = await migrationRunner.discoverMigrations(
        ACTIVE_MIGRATIONS
      );
      const migrationSeven = migrations.find(({ version }) => version === 7);
      assert.ok(migrationSeven);
      await harness.client.query('BEGIN');
      try {
        await assert.rejects(
          harness.client.query(migrationSeven.sql),
          (error) => {
            assert.equal(error.code, '23503');
            assert.match(
              error.message,
              /2 agendamentos com servico inconsistente; 2 com profissional inconsistente/
            );
            assert.doesNotMatch(
              String(error),
              /Guard|Owner fixture|Negócio fixture|example\.invalid|00000000000/i
            );
            return true;
          }
        );
      } finally {
        await harness.client.query('ROLLBACK');
      }
      assert.deepEqual(await readRelationshipState(), before);

      await assertMigrationFailure(
        () => runMigrations({ baselineExisting: true }),
        'MIGRATION_EXECUTION_FAILED'
      );

      assert.deepEqual(await readRelationshipState(), before);
      assert.deepEqual(await readMismatchCounts(), {
        professional_mismatches: 2,
        service_mismatches: 2,
      });
    });

    test('apply limpo cria só os índices necessários e o segundo run é no-op', async () => {
      await harness.resetPublicSchema();
      await applyActivePrefix(6);
      const indexesBefore = await readIndexNames();
      const appointmentIndexesBefore = indexesBefore.filter(
        ({ tablename }) => tablename === 'agendamentos'
      );

      const applied = await runMigrations({ baselineExisting: true });

      assert.equal(applied.baselined.length, 6);
      assert.deepEqual(applied.applied, [
        '007_enforce_appointment_tenant_relationships.sql',
      ]);
      await assertExactRelationshipCatalog();

      const indexesAfter = await readIndexNames();
      assert.deepEqual(
        indexesAfter.filter(({ tablename }) => tablename === 'agendamentos'),
        appointmentIndexesBefore
      );
      assert.deepEqual(
        indexesAfter.filter(
          (index) =>
            !indexesBefore.some(
              (before) =>
                before.tablename === index.tablename &&
                before.indexname === index.indexname
            )
        ),
        [
          {
            indexname: 'uk_profissionais_id_negocio_id',
            tablename: 'profissionais',
          },
          {
            indexname: 'uk_servicos_id_negocio_id',
            tablename: 'servicos',
          },
        ]
      );

      await harness.client.query('BEGIN');
      try {
        await harness.client.query('SET LOCAL enable_seqscan = off');
        const servicePlan = await harness.client.query(`
          EXPLAIN (FORMAT JSON, COSTS OFF)
          SELECT 1 FROM public.agendamentos
          WHERE servico_id = 1 AND negocio_id = 1
        `);
        const professionalPlan = await harness.client.query(`
          EXPLAIN (FORMAT JSON, COSTS OFF)
          SELECT 1 FROM public.agendamentos
          WHERE profissional_id = 1 AND negocio_id = 1
        `);
        assert.match(
          JSON.stringify(servicePlan.rows),
          /idx_agendamentos_servico_id/
        );
        assert.match(
          JSON.stringify(professionalPlan.rows),
          /idx_agendamentos_profissional_id/
        );
      } finally {
        await harness.client.query('ROLLBACK');
      }

      const beforeNoop = await readRelationshipState();
      const noop = await runMigrations();
      assert.equal(noop.alreadyApplied, 7);
      assert.deepEqual(noop.applied, []);
      assert.deepEqual(noop.baselined, []);
      assert.deepEqual(await readRelationshipState(), beforeNoop);
    });

    test('baseline aceita apenas a assinatura 007 completa e exata', async (t) => {
      await t.test('exata', async () => {
        await harness.resetPublicSchema();
        await applyActivePrefix(7);

        const outcome = await runMigrations({ baselineExisting: true });

        assert.equal(outcome.baselined.length, 7);
        assert.deepEqual(outcome.applied, []);
        await assertExactRelationshipCatalog();
      });

      const incompatibleCases = [
        {
          name: 'parcial tem apenas as chaves pai',
          sql: ADD_PARENT_KEYS_SQL,
        },
        {
          name: 'ordem de colunas invertida',
          sql: `
            ALTER TABLE public.servicos
              ADD CONSTRAINT uk_servicos_id_negocio_id
              UNIQUE (negocio_id, id);
            ALTER TABLE public.profissionais
              ADD CONSTRAINT uk_profissionais_id_negocio_id
              UNIQUE (negocio_id, id);
            ALTER TABLE public.agendamentos
              ADD CONSTRAINT fk_agendamentos_servico_negocio
              FOREIGN KEY (negocio_id, servico_id)
              REFERENCES public.servicos (negocio_id, id)
              ON UPDATE CASCADE ON DELETE RESTRICT;
            ALTER TABLE public.agendamentos
              ADD CONSTRAINT fk_agendamentos_profissional_negocio
              FOREIGN KEY (negocio_id, profissional_id)
              REFERENCES public.profissionais (negocio_id, id)
              ON UPDATE CASCADE ON DELETE RESTRICT;
            ${DROP_OLD_FOREIGN_KEYS_SQL}
          `,
        },
        {
          name: 'foreign keys ainda não validadas',
          sql: `
            ${ADD_PARENT_KEYS_SQL}
            ${ADD_UNVALIDATED_FOREIGN_KEYS_SQL}
            ${DROP_OLD_FOREIGN_KEYS_SQL}
          `,
        },
        {
          name: 'ações referenciais incompatíveis',
          sql: `
            ${ADD_PARENT_KEYS_SQL}
            ALTER TABLE public.agendamentos
              ADD CONSTRAINT fk_agendamentos_servico_negocio
              FOREIGN KEY (servico_id, negocio_id)
              REFERENCES public.servicos (id, negocio_id)
              ON UPDATE RESTRICT ON DELETE CASCADE;
            ALTER TABLE public.agendamentos
              ADD CONSTRAINT fk_agendamentos_profissional_negocio
              FOREIGN KEY (profissional_id, negocio_id)
              REFERENCES public.profissionais (id, negocio_id)
              ON UPDATE RESTRICT ON DELETE CASCADE;
            ${DROP_OLD_FOREIGN_KEYS_SQL}
          `,
        },
        {
          name: 'apenas a relação de serviço foi substituída',
          sql: `
            ${ADD_PARENT_KEYS_SQL}
            ALTER TABLE public.agendamentos
              ADD CONSTRAINT fk_agendamentos_servico_negocio
              FOREIGN KEY (servico_id, negocio_id)
              REFERENCES public.servicos (id, negocio_id)
              ON UPDATE CASCADE ON DELETE RESTRICT;
            ALTER TABLE public.agendamentos
              DROP CONSTRAINT fk_agendamentos_servico;
          `,
        },
      ];

      for (const baselineCase of incompatibleCases) {
        await t.test(baselineCase.name, async () => {
          await harness.resetPublicSchema();
          await applyActivePrefix(6);
          await harness.client.query(baselineCase.sql);
          const before = await readRelationshipState();

          await assertMigrationFailure(
            () => runMigrations({ baselineExisting: true }),
            'MIGRATION_BASELINE_INVALID'
          );

          assert.deepEqual(await readRelationshipState(), before);
        });
      }
    });

    test('007 bloqueia tenant cruzado e preserva agenda, deletes e cascades válidos', async () => {
      await harness.resetPublicSchema();
      await runMigrations();
      await assertExactRelationshipCatalog();
      const fixture = await seedTenants();

      await assertDatabaseFailure(
        insertAppointment({
          businessId: fixture.a.businessId,
          end: '2099-09-03T10:00:00',
          name: 'Cross service',
          professionalId: fixture.a.professionalId,
          serviceId: fixture.b.serviceId,
          start: '2099-09-03T09:00:00',
        }),
        '23503',
        [SERVICE_FOREIGN_KEY]
      );
      await assertDatabaseFailure(
        insertAppointment({
          businessId: fixture.a.businessId,
          end: '2099-09-03T11:00:00',
          name: 'Cross professional',
          professionalId: fixture.b.professionalId,
          serviceId: fixture.a.serviceId,
          start: '2099-09-03T10:00:00',
        }),
        '23503',
        [PROFESSIONAL_FOREIGN_KEY]
      );
      await assertDatabaseFailure(
        insertAppointment({
          businessId: fixture.a.businessId,
          end: '2099-09-03T12:00:00',
          name: 'Cross both',
          professionalId: fixture.b.professionalId,
          serviceId: fixture.b.serviceId,
          start: '2099-09-03T11:00:00',
        }),
        '23503',
        [SERVICE_FOREIGN_KEY, PROFESSIONAL_FOREIGN_KEY]
      );
      const afterRejectedWrites = await harness.client.query(`
        SELECT COUNT(*)::integer AS count
        FROM public.agendamentos
        WHERE cliente_nome LIKE 'Cross %'
      `);
      assert.equal(afterRejectedWrites.rows[0].count, 0);

      const base = await insertAppointment({
        businessId: fixture.a.businessId,
        end: '2099-09-04T10:00:00',
        name: 'Mesmo tenant',
        professionalId: fixture.a.professionalId,
        serviceId: fixture.a.serviceId,
        start: '2099-09-04T09:00:00',
      });
      await insertAppointment({
        businessId: fixture.a.businessId,
        end: '2099-09-04T11:00:00',
        name: 'Adjacente',
        professionalId: fixture.a.professionalId,
        serviceId: fixture.a.serviceId,
        start: '2099-09-04T10:00:00',
      });
      await insertAppointment({
        businessId: fixture.a.businessId,
        end: '2099-09-04T13:00:00',
        name: 'Não sobreposto',
        professionalId: fixture.a.professionalId,
        serviceId: fixture.a.serviceId,
        start: '2099-09-04T12:00:00',
      });
      await assertDatabaseFailure(
        insertAppointment({
          businessId: fixture.a.businessId,
          end: '2099-09-04T10:30:00',
          name: 'Sobreposto',
          professionalId: fixture.a.professionalId,
          serviceId: fixture.a.serviceId,
          start: '2099-09-04T09:30:00',
        }),
        '23P01',
        [EXCLUSION_CONSTRAINT]
      );

      await harness.client.query(
        `
          UPDATE public.agendamentos
          SET servico_id = $1, profissional_id = $2
          WHERE id = $3
        `,
        [
          fixture.a.secondServiceId,
          fixture.a.secondProfessionalId,
          base.rows[0].id,
        ]
      );
      const serviceCascade = await harness.client.query(
        `UPDATE public.servicos SET id = id + 1000 WHERE id = $1 RETURNING id`,
        [fixture.a.secondServiceId]
      );
      const professionalCascade = await harness.client.query(
        `UPDATE public.profissionais SET id = id + 1000 WHERE id = $1 RETURNING id`,
        [fixture.a.secondProfessionalId]
      );
      const newBusinessId = fixture.a.businessId + 1000;
      await harness.client.query(
        'UPDATE public.negocios SET id = $1 WHERE id = $2',
        [newBusinessId, fixture.a.businessId]
      );

      const joined = await harness.client.query(
        `
          SELECT
            appointment.id,
            appointment.negocio_id AS appointment_business_id,
            service.negocio_id AS service_business_id,
            professional.negocio_id AS professional_business_id
          FROM public.agendamentos AS appointment
          JOIN public.servicos AS service ON service.id = appointment.servico_id
          JOIN public.profissionais AS professional
            ON professional.id = appointment.profissional_id
          WHERE appointment.negocio_id = $1
          ORDER BY appointment.id
        `,
        [newBusinessId]
      );
      assert.equal(joined.rowCount, 3);
      assert.ok(
        joined.rows.every(
          (row) =>
            row.appointment_business_id === newBusinessId &&
            row.service_business_id === newBusinessId &&
            row.professional_business_id === newBusinessId
        )
      );

      await assertDatabaseFailure(
        harness.client.query('DELETE FROM public.servicos WHERE id = $1', [
          serviceCascade.rows[0].id,
        ]),
        '23503',
        [SERVICE_FOREIGN_KEY]
      );
      await assertDatabaseFailure(
        harness.client.query(
          'DELETE FROM public.profissionais WHERE id = $1',
          [professionalCascade.rows[0].id]
        ),
        '23503',
        [PROFESSIONAL_FOREIGN_KEY]
      );

      const finalRows = await harness.client.query(`
        SELECT cliente_nome
        FROM public.agendamentos
        ORDER BY id
      `);
      assert.deepEqual(
        finalRows.rows.map(({ cliente_nome: name }) => name),
        ['Mesmo tenant', 'Adjacente', 'Não sobreposto']
      );
    });
  }
);

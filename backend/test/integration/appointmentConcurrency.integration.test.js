const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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
const CONSTRAINT_NAME = 'ex_agendamentos_profissional_periodo_ativo';
const TARGET_START = '2099-07-01T10:00:00';
const TARGET_END = '2099-07-01T11:00:00';
const databasePath = require.resolve('../../src/config/database');
const publicoServicePath = require.resolve('../../src/services/publicoService');
const agendamentosServicePath = require.resolve(
  '../../src/services/agendamentosService'
);

const liveGuard = validatePostgresTestEnvironment(process.env);
const liveSkip = liveGuard.enabled ? false : liveGuard.reason;

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function matchesCreateConflict(sql) {
  const query = normalizeSql(sql);
  return (
    query.includes('FROM agendamentos') &&
    query.includes("status IN ('pendente', 'confirmado')") &&
    query.includes('data_hora_inicio < $3') &&
    query.includes('data_hora_fim > $4') &&
    query.includes('FOR UPDATE') &&
    !query.includes('id <>')
  );
}

function matchesRescheduleConflict(sql) {
  const query = normalizeSql(sql);
  return (
    query.includes('FROM agendamentos') &&
    query.includes('id <> $3') &&
    query.includes('data_hora_inicio < $4') &&
    query.includes('data_hora_fim > $5') &&
    query.includes('FOR UPDATE')
  );
}

function matchesAdminConflict(sql) {
  const query = normalizeSql(sql);
  return (
    query.includes('FROM agendamentos') &&
    query.includes('id <> $3') &&
    query.includes('data_hora_inicio < $4') &&
    query.includes('data_hora_fim > $5') &&
    query.includes('LIMIT 1') &&
    !query.includes('FOR UPDATE')
  );
}

function publicPayload(name, start = TARGET_START) {
  return {
    aviso_privacidade_aceito: true,
    cliente_email: `${name.toLowerCase().replace(/\s/g, '-')}@example.invalid`,
    cliente_nome: name,
    cliente_telefone: '13999990000',
    data_hora_inicio: start,
    observacoes: null,
  };
}

function loadServices(pool) {
  const database = require(databasePath);
  const originalGetDatabasePool = database.getDatabasePool;

  delete require.cache[publicoServicePath];
  delete require.cache[agendamentosServicePath];
  database.getDatabasePool = () => pool;

  try {
    return {
      agendamentos: require(agendamentosServicePath),
      publico: require(publicoServicePath),
      restore: () => {
        delete require.cache[publicoServicePath];
        delete require.cache[agendamentosServicePath];
      },
    };
  } finally {
    database.getDatabasePool = originalGetDatabasePool;
  }
}

function assertSafeConflict(outcomes) {
  const fulfilled = outcomes.filter(({ status }) => status === 'fulfilled');
  const rejected = outcomes.filter(({ status }) => status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);

  const error = rejected[0].reason;
  assert.equal(error.status, 409);
  assert.match(error.publicMessage, /Hor.rio indispon.vel para este profissional\./i);
  assert.equal(error.code, undefined);
  assert.equal(error.detail, undefined);
  assert.equal(Object.hasOwn(error, 'constraint'), false);
  assert.equal(Object.hasOwn(error, 'token_gerenciamento'), false);
  assert.equal(Object.hasOwn(error, 'token_publico_hash'), false);
  assert.doesNotMatch(String(error), /23P01|ex_agendamentos/i);

  return fulfilled[0].value;
}

describe(
  'concorrência de agendamentos contra PostgreSQL descartável',
  { concurrency: false, skip: liveSkip },
  () => {
    let Client;
    let Pool;
    let appPool;
    let fixture;
    let harness;
    let migrationRunner;

    before(async () => {
      ({ Client, Pool } = require('pg'));
      migrationRunner = require('../../src/database/migrationRunner');
      harness = await createPostgresTestHarness({ environment: process.env });
      await harness.resetPublicSchema();
      await migrationRunner.runMigrations({
        confirmDatabase: harness.databaseName,
        createClient: () => new Client({ ...liveGuard.clientConfig }),
        migrationsDirectory: ACTIVE_MIGRATIONS,
      });

      appPool = new Pool({ ...liveGuard.clientConfig });
      const identityClient = await appPool.connect();
      try {
        await verifyConnectedIdentity(identityClient, liveGuard);
      } finally {
        identityClient.release();
      }
    });

    after(async () => {
      delete require.cache[publicoServicePath];
      delete require.cache[agendamentosServicePath];
      if (appPool) await appPool.end();
      if (harness?.enabled) await harness.close();
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

      const user = await appPool.query(`
        INSERT INTO public.usuarios (nome, email, senha_hash)
        VALUES ('Owner fixture', 'owner@example.invalid', 'fixture-hash')
        RETURNING id
      `);
      const business = await appPool.query(
        `
          INSERT INTO public.negocios (
            usuario_id,
            nome,
            slug_publico,
            horario_abertura,
            horario_fechamento,
            intervalo_agendamento_minutos,
            dias_funcionamento,
            contato_privacidade
          ) VALUES ($1, 'Studio fixture', 'studio-fixture', TIME '00:00',
            TIME '23:59', 30, '[0,1,2,3,4,5,6]'::jsonb,
            'privacy@example.invalid')
          RETURNING id
        `,
        [user.rows[0].id]
      );
      const service = await appPool.query(
        `
          INSERT INTO public.servicos (
            negocio_id,
            nome,
            duracao_minutos,
            preco
          ) VALUES ($1, 'Corte', 60, 50)
          RETURNING id
        `,
        [business.rows[0].id]
      );
      const professionals = await appPool.query(
        `
          INSERT INTO public.profissionais (negocio_id, nome)
          VALUES ($1, 'Ana'), ($1, 'Bia')
          RETURNING id
        `,
        [business.rows[0].id]
      );

      fixture = {
        businessId: business.rows[0].id,
        otherProfessionalId: professionals.rows[1].id,
        professionalId: professionals.rows[0].id,
        serviceId: service.rows[0].id,
        userId: user.rows[0].id,
      };
    });

    async function insertAppointment(
      executor,
      {
        end,
        name,
        professionalId = fixture.professionalId,
        start,
        status = 'confirmado',
        tokenHash = null,
      }
    ) {
      return executor.query(
        `
          INSERT INTO public.agendamentos (
            negocio_id,
            servico_id,
            profissional_id,
            cliente_nome,
            cliente_telefone,
            data_hora_inicio,
            data_hora_fim,
            status,
            token_publico_hash,
            aviso_privacidade_versao
          ) VALUES ($1, $2, $3, $4, '13999990000', $5, $6, $7, $8,
            '2026-08-24')
          RETURNING id, status
        `,
        [
          fixture.businessId,
          fixture.serviceId,
          professionalId,
          name,
          start,
          end,
          status,
          tokenHash,
        ]
      );
    }

    async function activeTargetRows() {
      const result = await appPool.query(
        `
          SELECT id, negocio_id, status, token_publico_hash,
            data_hora_inicio::text AS data_hora_inicio
          FROM public.agendamentos
          WHERE profissional_id = $1
            AND status IN ('pendente', 'confirmado')
            AND data_hora_inicio < $2::timestamp
            AND data_hora_fim > $3::timestamp
          ORDER BY id
        `,
        [fixture.professionalId, TARGET_END, TARGET_START]
      );
      return result.rows;
    }

    async function runBarrierRace(matches, operations) {
      const barrier = createRealQueryBarrier(appPool, matches);
      const services = loadServices(barrier.pool);
      let outcomesPromise;

      try {
        outcomesPromise = Promise.allSettled(operations(services));
        await barrier.waitUntilReady();
        assert.deepEqual(
          {
            arrivals: barrier.snapshot().arrivals,
            connections: barrier.snapshot().backendPids.length,
            continuations: barrier.snapshot().continuations,
          },
          { arrivals: 2, connections: 2, continuations: 0 }
        );

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

    test('prova constraint, corrida SQL direta e controles permitidos', async () => {
      const constraint = await appPool.query(
        `
          SELECT
            c.contype,
            c.convalidated,
            c.condeferrable,
            c.condeferred,
            i.indisvalid,
            i.indisready,
            i.indimmediate,
            pg_get_constraintdef(c.oid, true) AS definition
          FROM pg_constraint AS c
          JOIN pg_index AS i ON i.indexrelid = c.conindid
          WHERE c.conrelid = 'public.agendamentos'::regclass
            AND c.conname = $1
        `,
        [CONSTRAINT_NAME]
      );

      assert.equal(constraint.rowCount, 1);
      assert.deepEqual(
        {
          condeferred: constraint.rows[0].condeferred,
          condeferrable: constraint.rows[0].condeferrable,
          contype: constraint.rows[0].contype,
          convalidated: constraint.rows[0].convalidated,
          indimmediate: constraint.rows[0].indimmediate,
          indisready: constraint.rows[0].indisready,
          indisvalid: constraint.rows[0].indisvalid,
        },
        {
          condeferred: false,
          condeferrable: false,
          contype: 'x',
          convalidated: true,
          indimmediate: true,
          indisready: true,
          indisvalid: true,
        }
      );
      assert.match(constraint.rows[0].definition, /EXCLUDE USING gist/i);
      assert.match(constraint.rows[0].definition, /profissional_id WITH =/i);
      assert.match(constraint.rows[0].definition, /tsrange\(.+\[\)/i);
      assert.match(constraint.rows[0].definition, /WITH &&/i);
      assert.match(constraint.rows[0].definition, /pendente/i);
      assert.match(constraint.rows[0].definition, /confirmado/i);
      const predicate = constraint.rows[0].definition.split(/\sWHERE\s/i)[1];
      assert.deepEqual(
        [...predicate.matchAll(/'([^']+)'/g)]
          .map((match) => match[1])
          .sort(),
        ['confirmado', 'pendente']
      );

      const firstClient = await appPool.connect();
      const secondClient = await appPool.connect();
      let directOutcomes;
      try {
        directOutcomes = await Promise.allSettled([
          insertAppointment(firstClient, {
            end: '2099-07-02T11:00:00',
            name: 'Corrida A',
            start: '2099-07-02T10:00:00',
          }),
          insertAppointment(secondClient, {
            end: '2099-07-02T11:30:00',
            name: 'Corrida B',
            start: '2099-07-02T10:30:00',
            status: 'pendente',
          }),
        ]);
      } finally {
        firstClient.release();
        secondClient.release();
      }

      assert.equal(
        directOutcomes.filter(({ status }) => status === 'fulfilled').length,
        1
      );
      const directFailure = directOutcomes.find(
        ({ status }) => status === 'rejected'
      ).reason;
      assert.equal(directFailure.code, '23P01');
      assert.equal(directFailure.constraint, CONSTRAINT_NAME);
      const directRows = await appPool.query(
        `
          SELECT id
          FROM public.agendamentos
          WHERE profissional_id = $1
            AND status IN ('pendente', 'confirmado')
            AND data_hora_inicio < TIMESTAMP '2099-07-02 11:30:00'
            AND data_hora_fim > TIMESTAMP '2099-07-02 10:00:00'
        `,
        [fixture.professionalId]
      );
      assert.equal(directRows.rowCount, 1);

      await insertAppointment(appPool, {
        end: '2099-07-03T11:00:00',
        name: 'Base controle',
        start: '2099-07-03T10:00:00',
      });
      await insertAppointment(appPool, {
        end: '2099-07-03T12:00:00',
        name: 'Adjacente',
        start: '2099-07-03T11:00:00',
      });
      await insertAppointment(appPool, {
        end: '2099-07-03T14:00:00',
        name: 'Nao sobreposto',
        start: '2099-07-03T13:00:00',
      });
      await insertAppointment(appPool, {
        end: '2099-07-03T11:30:00',
        name: 'Outro profissional',
        professionalId: fixture.otherProfessionalId,
        start: '2099-07-03T10:30:00',
      });
      await insertAppointment(appPool, {
        end: '2099-07-03T10:45:00',
        name: 'Cancelado',
        start: '2099-07-03T10:15:00',
        status: 'cancelado',
      });
      await insertAppointment(appPool, {
        end: '2099-07-03T10:40:00',
        name: 'Concluido',
        start: '2099-07-03T10:20:00',
        status: 'concluido',
      });

      const controls = await appPool.query(
        `SELECT COUNT(*)::integer AS count
         FROM public.agendamentos
         WHERE data_hora_inicio::date = DATE '2099-07-03'`
      );
      assert.equal(controls.rows[0].count, 6);
    });

    test('barreira executa SQL real em duas conexões antes de continuar', async () => {
      const barrier = createRealQueryBarrier(appPool, (sql) =>
        normalizeSql(sql).includes('barrier_marker')
      );
      let outcomesPromise;

      try {
        outcomesPromise = Promise.allSettled([
          barrier.pool.query('SELECT $1::integer AS barrier_marker', [1]),
          barrier.pool.query('SELECT $1::integer AS barrier_marker', [2]),
        ]);
        await barrier.waitUntilReady();
        assert.equal(barrier.snapshot().arrivals, 2);
        assert.equal(barrier.snapshot().backendPids.length, 2);
        assert.equal(barrier.snapshot().continuations, 0);

        barrier.release();
        const outcomes = await outcomesPromise;
        assert.deepEqual(
          outcomes.map(({ status, value }) => ({
            marker: value?.rows[0].barrier_marker,
            status,
          })),
          [
            { marker: 1, status: 'fulfilled' },
            { marker: 2, status: 'fulfilled' },
          ]
        );
        assert.equal(barrier.snapshot().continuations, 2);
        assert.equal(barrier.snapshot().releases, 2);
      } finally {
        barrier.release();
        if (outcomesPromise) await outcomesPromise;
      }
    });

    test('criação contra criação deixa um vencedor e um conflito seguro', async () => {
      const outcomes = await runBarrierRace(
        matchesCreateConflict,
        ({ publico }) => [
          publico.criarAgendamentoPublico('studio-fixture', {
            ...publicPayload('Cliente A'),
            profissional_id: fixture.professionalId,
            servico_id: fixture.serviceId,
          }),
          publico.criarAgendamentoPublico('studio-fixture', {
            ...publicPayload('Cliente B'),
            profissional_id: fixture.professionalId,
            servico_id: fixture.serviceId,
          }),
        ]
      );

      const winner = assertSafeConflict(outcomes);
      assert.match(winner.token_gerenciamento, /^[a-f0-9]{64}$/);
      assert.equal((await activeTargetRows()).length, 1);

      const services = loadServices(appPool);
      try {
        const control = await services.publico.criarAgendamentoPublico(
          'studio-fixture',
          {
            ...publicPayload('Cliente livre', '2099-07-01T12:00:00'),
            profissional_id: fixture.professionalId,
            servico_id: fixture.serviceId,
          }
        );
        assert.match(control.token_gerenciamento, /^[a-f0-9]{64}$/);
      } finally {
        services.restore();
      }
    });

    test('criação contra reagendamento preserva token e rollback do perdedor', async () => {
      const publicToken = 'b'.repeat(64);
      const tokenHash = crypto
        .createHash('sha256')
        .update(publicToken)
        .digest('hex');
      const existing = await insertAppointment(appPool, {
        end: '2099-07-01T15:00:00',
        name: 'Agendamento gerenciavel',
        start: '2099-07-01T14:00:00',
        tokenHash,
      });

      const outcomes = await runBarrierRace(
        (sql) =>
          matchesCreateConflict(sql) || matchesRescheduleConflict(sql),
        ({ publico }) => [
          publico.criarAgendamentoPublico('studio-fixture', {
            ...publicPayload('Novo cliente'),
            profissional_id: fixture.professionalId,
            servico_id: fixture.serviceId,
          }),
          publico.reagendarAgendamentoPublicoPorToken(publicToken, {
            data_hora_inicio: TARGET_START,
          }),
        ]
      );

      const winner = assertSafeConflict(outcomes);
      const targetRows = await activeTargetRows();
      const existingAfter = await appPool.query(
        `
          SELECT token_publico_hash,
            to_char(data_hora_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS start
          FROM public.agendamentos
          WHERE id = $1
        `,
        [existing.rows[0].id]
      );
      const total = await appPool.query(
        'SELECT COUNT(*)::integer AS count FROM public.agendamentos'
      );

      assert.equal(targetRows.length, 1);
      assert.equal(existingAfter.rows[0].token_publico_hash, tokenHash);
      assert.doesNotMatch(JSON.stringify(outcomes), new RegExp(publicToken));
      assert.doesNotMatch(JSON.stringify(outcomes), new RegExp(tokenHash));

      if (Object.hasOwn(winner, 'token_gerenciamento')) {
        assert.match(winner.token_gerenciamento, /^[a-f0-9]{64}$/);
        assert.equal(existingAfter.rows[0].start, '2099-07-01T14:00:00');
        assert.equal(total.rows[0].count, 2);
      } else {
        assert.equal(existingAfter.rows[0].start, TARGET_START);
        assert.equal(total.rows[0].count, 1);
      }
    });

    test('criação contra reativação administrativa mantém um ativo', async () => {
      const otherUser = await appPool.query(`
        INSERT INTO public.usuarios (nome, email, senha_hash)
        VALUES ('Other owner', 'other@example.invalid', 'fixture-hash')
        RETURNING id
      `);
      const otherBusiness = await appPool.query(
        `INSERT INTO public.negocios (usuario_id, nome, slug_publico)
         VALUES ($1, 'Other studio', 'other-studio')
         RETURNING id`,
        [otherUser.rows[0].id]
      );
      const otherService = await appPool.query(
        `INSERT INTO public.servicos (negocio_id, nome, duracao_minutos)
         VALUES ($1, 'Other service', 60)
         RETURNING id`,
        [otherBusiness.rows[0].id]
      );
      const otherProfessional = await appPool.query(
        `INSERT INTO public.profissionais (negocio_id, nome)
         VALUES ($1, 'Other professional')
         RETURNING id`,
        [otherBusiness.rows[0].id]
      );
      const sentinel = await appPool.query(
        `
          INSERT INTO public.agendamentos (
            negocio_id, servico_id, profissional_id, cliente_nome,
            cliente_telefone, data_hora_inicio, data_hora_fim, status
          ) VALUES ($1, $2, $3, 'Sentinel', '13999990000', $4, $5,
            'confirmado')
          RETURNING id
        `,
        [
          otherBusiness.rows[0].id,
          otherService.rows[0].id,
          otherProfessional.rows[0].id,
          TARGET_START,
          TARGET_END,
        ]
      );
      const cancelled = await insertAppointment(appPool, {
        end: TARGET_END,
        name: 'Agendamento cancelado',
        start: TARGET_START,
        status: 'cancelado',
      });

      const outcomes = await runBarrierRace(
        (sql) => matchesCreateConflict(sql) || matchesAdminConflict(sql),
        ({ agendamentos, publico }) => [
          publico.criarAgendamentoPublico('studio-fixture', {
            ...publicPayload('Cliente concorrente'),
            profissional_id: fixture.professionalId,
            servico_id: fixture.serviceId,
          }),
          agendamentos.atualizarStatusAgendamento(
            fixture.userId,
            cancelled.rows[0].id,
            { status: 'confirmado' }
          ),
        ]
      );

      const winner = assertSafeConflict(outcomes);
      const cancelledAfter = await appPool.query(
        'SELECT status FROM public.agendamentos WHERE id = $1',
        [cancelled.rows[0].id]
      );
      const tenantRows = await appPool.query(
        `
          SELECT COUNT(*)::integer AS total
          FROM public.agendamentos
          WHERE negocio_id = $1
        `,
        [fixture.businessId]
      );
      const sentinelAfter = await appPool.query(
        `SELECT negocio_id, status FROM public.agendamentos WHERE id = $1`,
        [sentinel.rows[0].id]
      );

      assert.equal((await activeTargetRows()).length, 1);
      assert.deepEqual(sentinelAfter.rows[0], {
        negocio_id: otherBusiness.rows[0].id,
        status: 'confirmado',
      });

      if (Object.hasOwn(winner, 'token_gerenciamento')) {
        assert.equal(cancelledAfter.rows[0].status, 'cancelado');
        assert.equal(tenantRows.rows[0].total, 2);
      } else {
        assert.equal(cancelledAfter.rows[0].status, 'confirmado');
        assert.equal(tenantRows.rows[0].total, 1);
      }
    });
  }
);

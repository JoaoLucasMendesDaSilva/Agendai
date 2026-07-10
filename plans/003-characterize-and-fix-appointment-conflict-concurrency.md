# Plan 003: Characterize And Fix Appointment Conflict Concurrency

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 5020d22..HEAD -- backend/src/services/publicoService.js backend/src/services/agendamentosService.js backend/src/services/agendamentoConcurrencyService.js backend/test/publicoService.test.js backend/test/agendamentosService.test.js backend/test/integration/appointmentConcurrency.integration.test.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: `plans/013-automate-migrations-and-mysql-integration.md`
- **Category**: bug
- **Planned at**: commit `5020d22`, 2026-07-10
- **Disposition**: BLOCKED until plan 013 is `DONE`. Plan 013 supplies the
  guarded disposable-MySQL harness required to characterize locking behavior.
  Once `npm.cmd run test:integration` passes against that confirmed test
  schema, change this plan from `BLOCKED` to `TODO` and execute it. Do not use
  development, Railway, staging, or production data to unblock it.

## Why this matters

Agendai promises that one professional cannot have overlapping active
appointments. The service checks before inserting or rescheduling, but
`SELECT ... FOR UPDATE` cannot reliably serialize two writers when the target
interval has no existing row. The admin status path also checks and writes
without one transaction, so it can race a public booking. A real MySQL test and
one shared deterministic lock are required before this invariant can be called
production-safe.

## Current state

- Public creation starts a transaction, checks the interval, then inserts:

```js
backend/src/services/publicoService.js:853
async function criarAgendamentoPublico(slugOuId, dados) {
  ...
  try {
    await connection.beginTransaction();

backend/src/services/publicoService.js:885
const [conflitos] = await connection.execute(
  `SELECT id
   FROM agendamentos
   WHERE negocio_id = ?
     AND profissional_id = ?
     AND status IN ('pendente', 'confirmado')
     AND data_hora_inicio < ?
     AND data_hora_fim > ?
   FOR UPDATE`,

backend/src/services/publicoService.js:909
const [resultado] = await connection.execute(
  `INSERT INTO agendamentos (
```

- Public rescheduling has the same empty-range limitation: its transaction
  starts at `backend/src/services/publicoService.js:509` and its overlap query
  ends with `FOR UPDATE` at line 551.
- Admin reactivation is not transactional at all:

```js
backend/src/services/agendamentosService.js:226
async function atualizarStatusAgendamento(usuarioId, agendamentoId, dados) {
  ...
  if (statusEhAtivo(status)) {
    const agendamentoAtual = await buscarAgendamentoParaAtualizacaoStatus(
      pool,
      id,
      negocioId
    );
    await rejeitarConflitoStatusAtivo(pool, negocioId, agendamentoAtual);
  }

  const [resultado] = await pool.execute(
    'UPDATE agendamentos SET status = ? WHERE id = ? AND negocio_id = ?',
```

- The schema has useful period indexes but no constraint that can represent
  arbitrary overlapping intervals:

```sql
backend/database/migrations/001_create_schema.sql:159
INDEX idx_agendamentos_profissional_periodo
  (profissional_id, data_hora_inicio, data_hora_fim),
INDEX idx_agendamentos_profissional_status_periodo
  (profissional_id, status, data_hora_inicio, data_hora_fim)
```

- `backend/test/publicoService.test.js` and
  `backend/test/agendamentosService.test.js` use mocked pools. They verify SQL
  decisions but cannot prove InnoDB behavior with simultaneous transactions.
- Active appointments are `pendente` and `confirmado`; `cancelado` and
  `concluido` do not block a slot.
- Plan 013 provides a separate, explicitly confirmed `DB_TEST_*` schema,
  advisory-lock-safe migrations, and `npm.cmd run test:integration`.
- Repo constraints:
  - MySQL and multi-instance Railway deployment must remain supported.
  - Use parameterized SQL and release every acquired connection in `finally`.
  - Do not use a process-local mutex; it cannot coordinate multiple instances.
  - Do not introduce a queue or broad availability engine.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend unit tests | `npm.cmd test` from `backend/` | exit 0, all unit tests pass |
| MySQL concurrency tests | `npm.cmd run test:integration` from `backend/` with plan 013's explicit disposable-test variables | exit 0, all real-MySQL tests pass |
| Backend dependency audit | `npm.cmd audit --audit-level=high --omit=dev` from `backend/` | exit 0, no high/critical advisories |
| Whitespace check | `git diff --check` from repo root | exit 0 |

## Suggested executor toolkit

- Use the repo-local `scheduling-rules` skill, if available, to review the
  active-overlap invariant and all mutation paths.
- Use the repo-local `mysql-data-modeling` or `mysql-migration-generator` skill,
  if available, to review InnoDB lock ordering. No migration is expected.
- Use the repo-local `security-review` skill, if available, to verify tenant
  predicates remain present in every lock and update query.

## Scope

**In scope** (the only files you should modify):

- `backend/src/services/publicoService.js`
- `backend/src/services/agendamentosService.js`
- `backend/src/services/agendamentoConcurrencyService.js` (create only for the
  small shared lock/conflict helpers described below)
- `backend/test/publicoService.test.js`
- `backend/test/agendamentosService.test.js`
- `backend/test/integration/appointmentConcurrency.integration.test.js`
  (create)
- `plans/README.md` (status row only)

**Out of scope** (do not touch):

- Database migrations or a slot-lock table; lock the existing professional row.
- Frontend changes or API response-shape changes.
- Appointment duration, slot-grid, operating-day, or timezone rules.
- New statuses, manual blocks, per-professional schedules, queues, or payments.
- Process-local locks, Redis locks, or any new infrastructure dependency.
- Broad decomposition of `publicoService.js` beyond the tiny shared helper.

## Git workflow

- Branch: `codex/003-appointment-conflict-concurrency`
- Use conventional commits, matching repository history.
- Suggested commit message:
  `fix(agendamentos): serialize active appointment writes`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Prove the plan 013 gate is safe and available

Confirm plan 013 is marked `DONE`. Run its integration suite with a database
whose name visibly contains `test`, with `RUN_MYSQL_INTEGRATION=1` and
`CONFIRM_MYSQL_TEST_DB` exactly equal to `DB_TEST_NAME`. Inspect the harness and
confirm it refuses `NODE_ENV=production` and never drops objects outside that
schema.

Do not begin implementation if the suite is skipped, mocked, or pointed at a
shared environment.

**Verify**: `npm.cmd run test:integration` from `backend/` -> exits 0 and the
output shows real MySQL migration integration tests ran, not skipped.

### Step 2: Add deterministic real-MySQL characterization tests

Create
`backend/test/integration/appointmentConcurrency.integration.test.js` using
plan 013's guarded harness. Seed one business, service, professional, and
synthetic appointments. Exercise the real service functions with separate
pooled connections.

For the empty-slot case, wrap test connections so both calls pause immediately
before delegating their overlap `SELECT ... FOR UPDATE`; release the barrier
only after both have reached it. The wrapper must still execute the real query
against MySQL. Do not replace the database with mocks or sleep for timing.

Characterize these races:

1. Two public creates for the same professional and overlapping interval.
2. A public create racing a public reschedule into the same interval.
3. A public create racing an admin transition of an overlapping cancelled
   appointment to `confirmado`.

For each case, the target invariant is exactly one active appointment after
both promises settle. One operation must succeed and the loser must receive a
public-safe `409`, not a raw deadlock or generic database error. Query the
database after settlement to prove the row-level result.

Run the characterization repeatedly in isolated fixtures to determine which
case fails today. If all three already pass reliably under the CI MySQL version
and isolation level, STOP and report the evidence; do not add locking that the
database already proves redundant.

**Verify**: before the fix, `npm.cmd run test:integration` from `backend/` -> at
least one new invariant test fails with evidence of two active rows or an
unhandled database race; unrelated integration tests pass.

### Step 3: Add one shared deterministic professional-row lock

Create `backend/src/services/agendamentoConcurrencyService.js` with two narrow
helpers that accept an existing transaction connection:

1. `bloquearAgendaDoProfissional(connection, negocioId, profissionalId)` runs:

```sql
SELECT id
FROM profissionais
WHERE id = ? AND negocio_id = ?
LIMIT 1
FOR UPDATE
```

It must throw the repository's public-safe `404` convention when the tenant-
scoped professional does not exist.

2. `buscarConflitoAtivo(connection, dados)` performs the existing overlap
predicate with parameterized values and an optional appointment ID to exclude.
It returns the conflicting ID or `null`; callers retain their current message.

The professional row is the serialization point because it exists even when
the requested interval is empty. Every active-slot writer must acquire this
lock before reading or locking appointment rows. Keep the helper CommonJS and
free of pool creation or transaction ownership.

Add unit tests through the existing service tests that assert tenant predicates
and SQL call order. Do not test this lock only by string matching; Step 2's
integration tests remain authoritative.

**Verify**: `npm.cmd test` from `backend/` -> helper/service unit tests pass;
existing tests remain green.

### Step 4: Use the lock in public creation and rescheduling

In `criarAgendamentoPublico`, after the transaction starts and the validated
professional is known, acquire the professional-row lock before checking
overlaps. Then run the shared conflict query and insert exactly as today.

For `reagendarAgendamentoPublicoPorToken`, the code needs the professional ID
before taking the canonical lock. Perform a tenant-safe, non-locking lookup to
identify it, begin the transaction, acquire the professional-row lock, then
re-read the appointment by token with `FOR UPDATE` and use only that locked row
for status/time validation and update. If the professional ID differs between
the two reads, rollback and return a retryable public-safe `409`; never continue
under the wrong lock.

Both functions must rollback on failure and release the connection in
`finally`. Preserve token hashing, response fields, slot rules, and Portuguese
error messages.

**Verify**: `npm.cmd test` from `backend/` -> public service tests pass;
`npm.cmd run test:integration` -> public-create/public-create and
public-create/reschedule races each leave exactly one active interval.

### Step 5: Make admin active transitions use the same lock and transaction

Refactor `atualizarStatusAgendamento` only as far as necessary to make its
check-and-update atomic:

1. Resolve the tenant business as today and perform a non-locking appointment
   lookup to identify `profissional_id`.
2. Obtain a dedicated connection and begin a transaction.
3. Acquire the same professional-row lock.
4. Re-read the target appointment by `id` and `negocio_id` with `FOR UPDATE`.
   If it disappeared or its professional changed, rollback and return the
   existing `404` or a public-safe `409`; do not write under a stale lock.
5. For `pendente` or `confirmado`, run the shared active-conflict query with the
   target appointment ID excluded.
6. Update status, commit, and then load the existing response shape.

All exits must rollback when needed and release the connection in `finally`.
Preserve terminal-status behavior and tenant isolation. Do not redesign the
status model.

**Verify**: `npm.cmd test` from `backend/` -> admin tests pass;
`npm.cmd run test:integration` -> the public-create/admin-reactivation race
leaves exactly one active appointment and returns one stable `409`.

### Step 6: Verify scheduling behavior and finish the index

Keep or add tests proving:

- Non-overlapping appointments for one professional both succeed.
- Overlapping appointments for different professionals both succeed.
- Cancelled and completed appointments do not block a slot.
- The same tenant and active-status predicates apply to creation, rescheduling,
  and admin reactivation.
- A forced failure rolls back and every connection is released.
- No process-local state participates in correctness.

Run unit tests, integration tests, dependency audit, and whitespace check.
Inspect `git diff --name-only` for scope. Only then mark plan 003 `DONE` in
`plans/README.md`.

**Verify**: all commands in "Commands you will need" exit 0 and no out-of-scope
path appears in `git diff --name-only`.

## Test plan

- Unit tests:
  - `backend/test/publicoService.test.js`: professional lock precedes conflict
    query for create and reschedule; rollback/release behavior remains correct.
  - `backend/test/agendamentosService.test.js`: active transition uses a
    transaction, excludes itself from conflicts, preserves terminal statuses,
    and always releases the connection.
- Real-MySQL integration tests:
  - simultaneous public create/create;
  - public create/reschedule;
  - public create/admin reactivation;
  - non-overlap, different-professional, and terminal-status controls.
- Each concurrency assertion must query final rows. Promise results alone are
  not sufficient.
- Use synthetic fixtures in the explicitly confirmed disposable schema only.

## Done criteria

- [ ] Plan 013 is `DONE` and its guarded real-MySQL suite runs in CI.
- [ ] All active-slot writers acquire the same tenant-scoped professional-row
      lock before appointment conflict reads or writes.
- [ ] Two simultaneous overlapping public creates produce one success, one
      stable `409`, and exactly one active row.
- [ ] Public rescheduling and admin reactivation share the same protection and
      pass cross-path race tests.
- [ ] Non-overlapping and different-professional writes remain concurrent and
      correct.
- [ ] Every transaction rolls back on failure and releases its connection.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd run test:integration` exits 0 against disposable MySQL.
- [ ] `npm.cmd audit --audit-level=high --omit=dev` from `backend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No migration, frontend file, or out-of-scope backend file is modified.
- [ ] `plans/README.md` marks plan 003 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Plan 013 is not complete or the disposable-MySQL identity guard cannot be
  satisfied.
- Any test would connect to development, shared, Railway, staging, or
  production data.
- Characterization proves all three races already satisfy the invariant under
  the supported MySQL version and isolation level.
- A mutation path cannot acquire the professional row before appointment rows
  without changing the public API contract.
- Fixing the race requires a migration, slot-lock table, queue, distributed
  lock, or major availability redesign.
- The product now permits overlapping active appointments or uses different
  active statuses.
- A raw MySQL deadlock reaches the API after one reasonable retry/ordering fix.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- All future code that creates, moves, or reactivates an appointment must use
  the same professional-row lock and lock order.
- Parent-row locking serializes writes per professional, not per business, so
  unrelated professionals remain independent.
- If future features add professional deletion, manual blocks, recurring
  appointments, or multi-unit scheduling, revisit the serialization key before
  adding another lock concept.
- Reviewers should scrutinize lock order, transaction boundaries, tenant
  predicates, final-state integration assertions, and connection cleanup.

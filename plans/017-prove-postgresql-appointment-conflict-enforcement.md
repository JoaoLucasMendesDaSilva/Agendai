# Plan 017: Prove PostgreSQL Appointment Conflict Enforcement

> **Executor instructions**: This is a characterization-first plan. Add the
> real PostgreSQL evidence before changing production scheduling logic. If the
> existing exclusion constraint already protects every mutation path, retain
> it as the sole concurrency authority and do not add application locks. Follow
> every STOP condition and update only this plan's index row when verified.
>
> **Drift check (run first)**:
> `git diff --stat f7e455b..HEAD -- backend/database/postgres-migrations backend/src/services/publicoService.js backend/src/services/agendamentosService.js backend/test/publicoService.test.js backend/test/agendamentosService.test.js backend/test/integration`
> Plan 016's guarded PostgreSQL harness must be present and green. Compare live
> SQL, active statuses, exported functions, and error translation with the
> assumptions below.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**:
  `plans/016-automate-postgresql-migrations-and-integration-verification.md`
- **Category**: test
- **Planned at**: commit `f7e455b`, 2026-08-17
- **Replaces**:
  `plans/003-characterize-and-fix-appointment-conflict-concurrency.md`

## Why this matters

Preventing overlapping active appointments is Agendai's central correctness
rule. PostgreSQL migration 001 now defines a GiST exclusion constraint, and
public/admin services translate exclusion violations to `409`. Mocked tests
cannot prove what happens when two real transactions race across different
mutation paths. This plan supplies that proof without carrying the obsolete
MySQL professional-row lock design into PostgreSQL.

## Current state

- `backend/database/postgres-migrations/001_create_schema.sql` defines
  `ex_agendamentos_profissional_periodo_ativo` with a half-open time range for
  statuses `pendente` and `confirmado`.
- `criarAgendamentoPublico` and
  `reagendarAgendamentoPublicoPorToken` perform preflight overlap reads inside
  transactions, then insert/update.
- `atualizarStatusAgendamento` performs a preflight read and update without one
  explicit transaction. The database constraint should still be authoritative
  for a racing reactivation.
- `publicoService.js` and `agendamentosService.js` translate PostgreSQL code
  `23P01` to public-safe `409` errors.
- No integration test races these paths against a real PostgreSQL engine.

## Commands you will need

From `backend/`:

- Unit tests: `npm.cmd test`
- Guarded real PostgreSQL tests: `npm.cmd run test:integration`
- Dependency audit: `npm.cmd audit --audit-level=high --omit=dev`

From repository root: `git diff --check`.

The `postgres-integration` GitHub Actions job from plan 016 must run the new
test file and show it was not skipped.

## Scope

**In scope**:

- `backend/test/integration/appointmentConcurrency.integration.test.js`
  (create)
- `backend/test/integration/postgresTestHarness.js` (only small reusable barrier
  or fixture extensions)
- `backend/test/publicoService.test.js`
- `backend/test/agendamentosService.test.js`
- `backend/src/services/publicoService.js` (only evidence-required error
  translation or transaction cleanup)
- `backend/src/services/agendamentosService.js` (same restriction)
- `plans/README.md` (status row only)

**Out of scope**:

- Database migration changes, replacement constraints, slot tables, or status
  model changes.
- Professional-row locks, advisory locks in scheduling services, process-local
  mutexes, Redis, queues, or retries that can duplicate side effects.
- Availability-grid, timezone, duration, API-shape, controller, or frontend
  redesign.
- Broad decomposition of `publicoService.js`.
- Shared, Supabase, development, staging, or production test data.

## Git workflow

- Branch: `codex/017-postgresql-appointment-concurrency`
- Suggested commit: `test(agendamentos): prove PostgreSQL conflict enforcement`
- If a narrow translator/cleanup correction is required, use a separate
  `fix(agendamentos): stabilize exclusion conflicts` commit.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Assert the database invariant directly

Create the integration file with plan 016's guarded harness. On a fresh
migrated database, query PostgreSQL catalogs and assert the named constraint:

- exists on `public.agendamentos`;
- is an exclusion constraint using professional equality and overlapping
  half-open `tstzrange` periods;
- applies only to `pendente` and `confirmado`;
- is valid and immediate under the supported schema.

Seed synthetic users, businesses, services, and professionals. Directly insert
two overlapping active appointments on separate clients and assert PostgreSQL
allows exactly one and rejects the other with code `23P01` and the expected
constraint name. Query final rows.

Control cases must prove the constraint permits:

- adjacent half-open periods where first end equals second start;
- non-overlapping periods for one professional;
- overlapping periods for different professionals;
- overlap with `cancelado` or `concluido` rows.

**Verify**: the direct database tests pass repeatedly. If they fail, STOP; do
not compensate with application locking inside this plan.

### Step 2: Build a deterministic real-query barrier

Extend only the integration harness with a test-local wrapper around the real
`pg` pool/client. It must delegate every SQL statement to PostgreSQL. For a
specific test-selected query pattern, allow both real preflight overlap queries
to finish, hold their promise resolution until both have reached the barrier,
then release them together.

Inject the wrapped `getDatabasePool()` before requiring each service, restore
the module cache and pool after every test, and fail if either participant does
not reach the barrier. Do not alter production exports solely for test
instrumentation. Do not replace SQL results, stub the pool, use sleeps, or
accept a race that did not synchronize both preflight reads.

Use a bounded test timeout only to detect deadlock and always release clients in
cleanup.

**Verify**: a harness self-test shows both separate real connections reached
and executed the target SQL before either caller continued.

### Step 3: Race public create against public create

Call the real `criarAgendamentoPublico` twice for the same business,
professional, and overlapping interval using distinct customer/token data.
Synchronize after both real overlap reads return empty and before either insert
continues.

Assert:

- exactly one promise fulfills;
- exactly one rejects with status `409` and the established public conflict
  message, not a raw PostgreSQL error;
- exactly one active overlapping row exists afterward;
- the successful response has one valid management token and the failed call
  exposes no token or constraint detail;
- both transaction clients are released.

Also run a non-overlapping control without the barrier.

**Verify**: the case passes repeatedly in the guarded integration suite without
retrying the test itself.

### Step 4: Race public create against public reschedule

Seed one manageable appointment with a synthetic token outside the target
period. Race `reagendarAgendamentoPublicoPorToken` into the target period
against a new `criarAgendamentoPublico`. Synchronize their real conflict reads.

Assert one success, one stable `409`, one active target interval, preserved
token secrecy, rollback of the losing transaction, and unchanged time on the
losing pre-existing appointment when reschedule loses.

**Verify**: final database rows, not only promises, prove the invariant.

### Step 5: Race public create against admin reactivation

Seed a cancelled appointment overlapping the target. Race a public create
against `atualizarStatusAgendamento(..., { status: 'confirmado' })` for that
row. Synchronize both real preflight reads before insert/update.

Assert one success, one stable `409`, exactly one active target interval, and
tenant-scoped final state. If admin reactivation loses, its status remains
`cancelado`; if creation loses, no extra row/token persists.

This test specifically proves the exclusion constraint protects the current
non-transactional admin preflight/update gap.

**Verify**: run repeatedly; no raw `23P01`, two-active-row result, or partial
state is accepted.

### Step 6: Tighten only evidence-required error handling

If Steps 3-5 already pass, do not change production service algorithms. Add
unit regressions proving both translators return the stable `409` for the named
appointment exclusion constraint and preserve unknown errors.

If a path leaks a raw `23P01`, make the smallest change in the relevant scoped
service. Prefer matching both `erro.code === '23P01'` and
`erro.constraint === 'ex_agendamentos_profissional_periodo_ativo'`; rethrow an
unknown exclusion violation so future unrelated constraints are not mislabeled
as scheduling conflicts. Preserve existing public wording and response shape.

If rollback/release failure masks the primary conflict, correct only that
cleanup path and add a unit regression. Do not add a new lock, retry, or shared
service abstraction.

**Verify**: unit and integration suites pass. Production service diffs are
empty unless a failing test required a narrow correction.

### Step 7: Run the complete gate and update the index

Run all commands, remote CI, whitespace check, and a `scheduling-rules` plus
`security-review` review. Inspect the final diff for sleeps, mocks masquerading
as integration, weakened constraints, leaked tokens, unbounded waits, or
unrelated refactors.

Mark plan 017 `DONE` only when all three cross-path races and controls run
against real PostgreSQL in CI.

## Done criteria

- [ ] Catalog and direct-SQL tests prove the named exclusion constraint and its
      active-status/half-open-period semantics.
- [ ] A deterministic barrier executes real preflight queries on separate
      connections before releasing both writers.
- [ ] Create/create produces one success, one stable `409`, and one active row.
- [ ] Create/reschedule produces one success, one stable `409`, correct rollback,
      and one active target interval.
- [ ] Create/admin reactivation produces one success, one stable `409`, and one
      active target interval.
- [ ] Adjacent, non-overlapping, different-professional, cancelled, and
      completed controls remain allowed.
- [ ] Unknown database errors are not mislabeled or exposed.
- [ ] No application/distributed lock or migration was added.
- [ ] Unit and guarded PostgreSQL integration tests pass locally and in CI.
- [ ] `git diff --check` exits 0 and only in-scope files changed.
- [ ] `plans/README.md` marks plan 017 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Plan 016's real PostgreSQL gate is absent, skipped, or unsafe.
- The named exclusion constraint is missing, invalid, deferrable unexpectedly,
  or differs materially from the active-status/half-open invariant.
- Direct concurrent SQL can leave two overlapping active rows.
- A test target fails any disposable-database identity guard.
- Deterministic synchronization would require changing production behavior,
  replacing real SQL with mocks, or using timing sleeps.
- Correctness requires a migration, new lock design, retry protocol, status
  change, or API contract change.
- A public-safe result cannot be achieved without masking an unknown database
  error.
- A gate fails twice after one reasonable evidence-based correction.

## Maintenance notes

- The exclusion constraint is the concurrency authority. Preflight queries are
  useful for friendly early errors but do not prove correctness.
- Every future create, move, duration change, professional reassignment, or
  active-status transition must retain a real PostgreSQL race test.
- Use final database state plus public error shape as evidence; promise results
  alone are insufficient.
- If manual blocks, recurring appointments, or new active statuses are added,
  revise the constraint and these tests together through a new migration plan.

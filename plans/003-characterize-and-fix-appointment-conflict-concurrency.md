# Plan 003: Characterize And Fix Appointment Conflict Concurrency

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7692321..HEAD -- backend/src/services/publicoService.js backend/database/migrations backend/test backend/tests`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-establish-backend-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `7692321`, refreshed 2026-07-02
- **Disposition**: BLOCKED. The current machine has no Docker CLI, MySQL
  client, compose definition, or explicit test-database environment variables.
  Resume only after the operator provides or approves a disposable MySQL
  schema whose identity is visibly distinct from development/Railway data.

## Why this matters

The MVP promise includes blocking conflicting appointments. The service checks for overlap inside a transaction, but the current `SELECT ... FOR UPDATE` can only lock rows that already exist. If two clients request the same free slot at the same time, this needs a characterization test against MySQL behavior before deciding the safest fix.

## Current state

- Public appointment creation opens a transaction:

```js
backend/src/services/publicoService.js:862
try {
  await connection.beginTransaction();
```

- It checks conflicts before insert:

```js
backend/src/services/publicoService.js:888
const [conflitos] = await connection.execute(
  `SELECT id
   FROM agendamentos
   WHERE negocio_id = ?
     AND profissional_id = ?
     AND status IN ('pendente', 'confirmado')
     AND data_hora_inicio < ?
     AND data_hora_fim > ?
   FOR UPDATE`,
```

- It inserts after the check:

```js
backend/src/services/publicoService.js:909
const [resultado] = await connection.execute(
  `INSERT INTO agendamentos (
    negocio_id, servico_id, profissional_id, cliente_nome, cliente_telefone,
```

- The schema has helpful indexes but no uniqueness/constraint that directly prevents overlapping intervals:

```sql
backend/database/migrations/001_create_schema.sql:156
INDEX idx_agendamentos_negocio_id (negocio_id),
INDEX idx_agendamentos_servico_id (servico_id),
INDEX idx_agendamentos_profissional_id (profissional_id),
INDEX idx_agendamentos_negocio_inicio (negocio_id, data_hora_inicio),
INDEX idx_agendamentos_profissional_periodo (profissional_id, data_hora_inicio, data_hora_fim),
INDEX idx_agendamentos_profissional_status_periodo (profissional_id, status, data_hora_inicio, data_hora_fim)
```

- Public rescheduling now has the same row-lock limitation: its transaction
  starts at `backend/src/services/publicoService.js:509` and its overlap query
  uses `FOR UPDATE` at line 551. A future fix must continue covering creation
  and rescheduling with one locking concept.

- The backend unit baseline now lives in `backend/test/`, including
  `publicoService.test.js`, but it uses mocks and does not prove MySQL lock
  behavior under simultaneous transactions.

- Repo constraints:
  - MySQL is required.
  - Keep scheduling logic simple and explainable for the TCC.
  - Do not introduce a queue or distributed lock service unless explicitly approved.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend tests | `npm.cmd test` from `backend/` | exit 0 |
| Backend audit | `npm.cmd audit --audit-level=high --omit=dev` from `backend/` | exit 0 |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `backend/src/services/publicoService.js`
- Backend concurrency/integration tests
- A new migration only if the chosen fix needs schema support

**Out of scope**:
- Frontend changes
- Changing appointment duration rules
- Changing public route paths
- Replacing MySQL
- Adding payments, queues, calendars, or advanced availability features

## Git workflow

- Branch suggestion: `codex/003-appointment-conflict-concurrency`
- Suggested commit message: `fix(agendamentos): harden conflict blocking under concurrency`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Write a characterization test

Create a test that attempts two concurrent `criarAgendamentoPublico` calls for the same `negocio_id`, `profissional_id`, and overlapping time.

Preferred approach:

- Use a real test MySQL schema only if the local environment provides explicit test DB variables.
- If no test DB is available, create a test that documents the missing integration gate and STOP; do not fake concurrency with mocks and claim it proves database locking.

The test should expect exactly one appointment insert to succeed and the other to fail with HTTP-style status `409`.

**Verify**: `npm.cmd test` from `backend/` -> if no test DB exists, STOP and report that this plan needs test DB configuration before implementation.

### Step 2: Choose the smallest safe locking strategy

Investigate MySQL behavior with the existing index. Prefer one of these simple approaches:

- Lock a deterministic parent row for the business/professional during conflict check, such as `SELECT id FROM profissionais WHERE id = ? AND negocio_id = ? FOR UPDATE`, then check conflicts and insert in the same transaction.
- Or add a narrowly-scoped slot-lock table/migration if row-level parent locking is insufficient for the desired granularity.

Do not invent a broad availability engine.

**Verify**: Explain the chosen strategy in code comments only if the SQL would otherwise be surprising; then run `npm.cmd test` from `backend/` -> tests still fail until implementation is complete.

### Step 3: Implement the locking fix in creation and reagendamento

Apply the selected locking strategy to:

- `criarAgendamentoPublico`
- `reagendarAgendamentoPublicoPorToken`

Both paths must protect the same invariant: no two `pendente` or `confirmado` appointments overlap for the same professional.

**Verify**: `npm.cmd test` from `backend/` -> concurrency test passes.

### Step 4: Verify existing scheduling behavior

Add or keep tests for:

- Non-overlapping appointments succeed.
- Overlapping appointment returns `409`.
- Cancelled appointment does not block a slot.
- Completed appointment does not block a slot unless product rules say otherwise.

**Verify**: `npm.cmd test` from `backend/` -> all scheduling tests pass.

## Test plan

- This plan needs at least one integration-style concurrency test. Mock-only tests are not enough for the core finding.
- Use a dedicated test database/schema. Never point tests at production or shared Railway data.
- Test data must be generated and cleaned up by the test.

## Done criteria

- [ ] A concurrency test exists and proves only one of two overlapping simultaneous public bookings succeeds.
- [ ] `criarAgendamentoPublico` and public reagendamento share the same concurrency protection concept.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd audit --audit-level=high --omit=dev` from `backend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] Any migration is documented and additive.
- [ ] No frontend files modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- There is no safe disposable MySQL test database available.
- The characterization test cannot reproduce or disprove the race.
- The fix requires a major availability model redesign.
- The fix requires changing public API contracts.
- You are tempted to use process-local locks; they will not protect multi-instance Railway deployments.

## Maintenance notes

Reviewers should scrutinize transaction boundaries and ensure every acquired connection is released in `finally`. If future features add manual blocks, folgas, or multiple units, revisit this locking strategy.

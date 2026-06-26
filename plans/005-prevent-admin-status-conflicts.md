# Plan 005: Prevent Admin Status Changes From Creating Conflicts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2fe0e87..HEAD -- backend/src/services/agendamentosService.js backend/src/services/publicoService.js backend/test`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-establish-backend-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `2fe0e87`, 2026-06-26

## Why this matters

The admin panel can change an appointment to any known status. Conflict checks
only run when a public booking or public reschedule creates a slot. That means
an entrepreneur can cancel an appointment, let the same time be booked again,
then set the old appointment back to `confirmado`, leaving two active
appointments for the same professional and time. The fix should keep the status
workflow simple while protecting the core MVP promise: no overlapping active
appointments.

## Current state

- `backend/src/services/agendamentosService.js` owns private appointment status
  updates and allows all four statuses:

```js
backend/src/services/agendamentosService.js:3
const STATUS_PERMITIDOS = ['pendente', 'confirmado', 'cancelado', 'concluido'];
```

- The private status update writes the new status directly:

```js
backend/src/services/agendamentosService.js:180
async function atualizarStatusAgendamento(usuarioId, agendamentoId, dados) {
  const id = validarId(agendamentoId);
  const status = validarPayloadStatus(dados);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const [resultado] = await pool.execute(
    'UPDATE agendamentos SET status = ? WHERE id = ? AND negocio_id = ?',
    [status, id, negocioId]
  );
```

- Public creation checks overlaps only at booking time:

```js
backend/src/services/publicoService.js:869
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

- Repo conventions:
  - Backend services use CommonJS and `mysql2/promise`.
  - Public-safe errors are `Error` objects with `status` and `publicMessage`.
  - Keep messages in simple Portuguese.
  - Do not add a workflow engine or new status values for this MVP fix.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend tests | `npm.cmd test` from `backend/` | exit 0, all tests pass |
| Backend audit | `npm.cmd audit --audit-level=high --omit=dev` from `backend/` | exit 0, no high/critical vulnerabilities |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `backend/src/services/agendamentosService.js`
- Backend tests under `backend/test/**`
- A tiny shared helper only if needed to avoid duplicating the active-overlap
  SQL in multiple services

**Out of scope**:
- Frontend redesigns or new admin screens
- Public route path changes
- New appointment status values
- The concurrent public booking race covered by `plans/003-*`
- Payments, notifications, manual blocks, or advanced availability

## Git workflow

- Branch suggestion: `codex/005-admin-status-conflicts`
- Suggested commit message: `fix(agendamentos): prevent status changes from creating conflicts`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add regression tests for resurrected conflicts

Create backend tests for `atualizarStatusAgendamento` with a mocked pool. Cover:

- Updating a cancelled appointment to `confirmado` is rejected with status `409`
  when another active appointment overlaps the same professional/time.
- Updating a cancelled appointment to `pendente` is rejected under the same
  overlap.
- Updating to terminal statuses `cancelado` and `concluido` does not run the
  overlap check.
- Updating to `confirmado` succeeds when no active overlap exists.

Use the existing `backend/test/*.test.js` pattern with `node:test` and
`node:assert/strict`.

**Verify**: `npm.cmd test` from `backend/` -> the new conflict tests fail before
the service change and the existing 11 tests still run.

### Step 2: Fetch the current appointment before active transitions

In `atualizarStatusAgendamento`, load the appointment being updated by `id` and
`negocio_id` before applying an active status. The query must include at least
`id`, `profissional_id`, `data_hora_inicio`, `data_hora_fim`, and `status`.

If the target appointment does not exist, preserve the current 404 behavior.

**Verify**: `npm.cmd test` from `backend/` -> tests may still fail until the
overlap rejection is added.

### Step 3: Reject active transitions that overlap another active appointment

When the requested status is `pendente` or `confirmado`, check for another
appointment in the same business and professional where:

- `id <> ?`
- `status IN ('pendente', 'confirmado')`
- `data_hora_inicio < target.data_hora_fim`
- `data_hora_fim > target.data_hora_inicio`

If a conflict exists, throw `criarErro(409, 'Horario indisponivel para este profissional.')`
or the closest existing Portuguese message. Keep SQL parameterized.

**Verify**: `npm.cmd test` from `backend/` -> all status-conflict tests pass.

### Step 4: Keep the update shape simple

After validation, keep the existing update response shape by returning
`buscarAgendamentoPorId(usuarioId, id)`. Do not introduce a separate status
workflow model unless a test proves the direct helper is not enough.

**Verify**: `npm.cmd test` from `backend/` -> all tests pass.

## Test plan

- Add unit tests with mocked database responses in `backend/test/`.
- Include one test proving the conflict query excludes the appointment being
  updated.
- Include one test proving terminal status updates still work without a
  conflict check.
- Run `npm.cmd test` from `backend/`.

## Done criteria

- [ ] Private status changes cannot create two active overlapping appointments.
- [ ] Existing public booking tests still pass.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd audit --audit-level=high --omit=dev` from `backend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No frontend files are modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The service no longer exposes `atualizarStatusAgendamento`.
- The fix appears to require changing the public or private API response shape.
- The product owner wants cancelled appointments to be reactivated even when the
  time has been reused.
- You are tempted to solve this with process-local locks; they will not protect
  multi-instance Railway deployments.

## Maintenance notes

When plan 003 is unblocked, review the overlap helper/query created here so
public creation, public rescheduling, and admin reactivation all protect the
same invariant. If future statuses are added, update the active-status list in
one place.

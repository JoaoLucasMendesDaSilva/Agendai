# Plan 002: Block Public Actions On Completed Appointments

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3072a78..HEAD -- backend/src/services/publicoService.js backend/src/controllers/publicoController.js backend/src/routes/publicoRoutes.js backend/test backend/tests`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-establish-backend-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `3072a78`, 2026-06-25

## Why this matters

The public management token is meant for a client to manage an active appointment. Today, completed appointments can still be cancelled, confirmed again, or moved to a new date through public token routes because the service only blocks `cancelado` in several places. Once an entrepreneur marks an appointment as `concluido`, the public token should no longer mutate it.

## Current state

- Public routes expose token-based actions:

```js
backend/src/routes/publicoRoutes.js:11
router.put(
  '/agendamentos/:token/confirmacao',
  publicoController.confirmarPresenca
);
```

```js
backend/src/routes/publicoRoutes.js:15
router.put(
  '/agendamentos/:token/reagendamento',
  publicoController.reagendarAgendamento
);
router.delete('/agendamentos/:token', publicoController.cancelarAgendamento);
```

- Cancellation updates any status except `cancelado`, including `concluido`:

```js
backend/src/services/publicoService.js:417
`UPDATE agendamentos
 SET status = 'cancelado'
 WHERE token_publico_hash = ? AND status <> 'cancelado'`
```

- Presence confirmation can turn `concluido` back into `confirmado`:

```js
backend/src/services/publicoService.js:437
`UPDATE agendamentos
 SET status = 'confirmado'
 WHERE token_publico_hash = ?
   AND status NOT IN ('confirmado', 'cancelado')`
```

- Reagendamento only blocks `cancelado`:

```js
backend/src/services/publicoService.js:499
if (agendamento.status === 'cancelado') {
  throw criarErro(409, 'Agendamento cancelado nao pode ser reagendado.');
}
```

- Repo conventions:
  - Service errors use `criarErro(status, mensagem)` and should return user-safe Portuguese messages.
  - Status enum in schema is `pendente`, `confirmado`, `cancelado`, `concluido`.
  - Keep route shapes unchanged.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend tests | `npm.cmd test` from `backend/` | exit 0 |
| Backend audit | `npm.cmd audit --audit-level=high --omit=dev` from `backend/` | exit 0 |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `backend/src/services/publicoService.js`
- Backend tests created by Plan 001

**Out of scope**:
- Route paths and HTTP methods
- Frontend pages
- Database schema
- Private admin status updates in `backend/src/services/agendamentosService.js`
- Any new appointment status values

## Git workflow

- Branch suggestion: `codex/002-block-completed-public-actions`
- Suggested commit message: `fix(agendamentos): block public actions on completed appointments`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add regression tests first

Add tests for public token operations with mocked database results:

- `cancelarAgendamentoPublicoPorToken` returns conflict when the existing appointment is `concluido`.
- `confirmarPresencaPublicaPorToken` returns conflict when the existing appointment is `concluido`.
- `listarHorariosReagendamentoPublico` and `reagendarAgendamentoPublicoPorToken` return conflict when status is `concluido`.

Use the same test runner established in Plan 001.

**Verify**: `npm.cmd test` from `backend/` -> the new tests fail before the service change.

### Step 2: Centralize terminal public status validation

In `backend/src/services/publicoService.js`, add a small helper near the existing `criarErro` helper:

```js
function validarAgendamentoGerenciavel(agendamento, acao) {
  if (agendamento.status === 'cancelado') {
    throw criarErro(409, `Agendamento cancelado nao pode ser ${acao}.`);
  }

  if (agendamento.status === 'concluido') {
    throw criarErro(409, `Agendamento concluido nao pode ser ${acao}.`);
  }
}
```

Adjust wording if needed, but keep it simple, public-safe, and in Portuguese.

**Verify**: `npm.cmd test` from `backend/` -> tests may still fail until callers use the helper.

### Step 3: Apply the helper to all public token mutations

Update:

- `cancelarAgendamentoPublicoPorToken`
- `confirmarPresencaPublicaPorToken`
- `listarHorariosReagendamentoPublico`
- `reagendarAgendamentoPublicoPorToken`

For direct `UPDATE` statements, change SQL predicates so `concluido` is not mutated. After `affectedRows === 0`, fetch the appointment and return a specific conflict for `cancelado` or `concluido`.

Do not change how already-confirmed active appointments are handled unless required by tests.

**Verify**: `npm.cmd test` from `backend/` -> all tests pass.

## Test plan

- Tests must cover all three public mutation paths: confirmation, cancellation, reagendamento.
- Include one active-status happy path so the executor does not accidentally block `pendente` or existing `confirmado` behavior.
- No real MySQL required; use mocked pool/connection.

## Done criteria

- [ ] Public token routes cannot mutate `concluido` appointments.
- [ ] Existing behavior for active `pendente`/`confirmado` appointments remains covered.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd audit --audit-level=high --omit=dev` from `backend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No frontend files, routes, or migrations modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Plan 001 has not established a backend test command.
- The service code no longer has the public token functions named in this plan.
- Fixing the bug appears to require changing the public API response shape.
- Product owner says completed appointments should remain mutable by clients.

## Maintenance notes

If future statuses are added, review this helper and every token-based public mutation. The public token should be treated as a limited client-management capability, not as an unrestricted appointment editor.

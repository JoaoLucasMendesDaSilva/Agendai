# Plan 009: Sync Deployment, Runtime, And Public Management Docs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2fe0e87..HEAD -- README.md backend/package.json frontend/package.json frontend/package-lock.json backend/database/migrations backend/src/routes/publicoRoutes.js frontend/src/App.jsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `2fe0e87`, 2026-06-26

## Why this matters

The README is the setup and presentation script for the TCC, but it has drifted
from the current code. It lists only migrations 001 and 002 even though public
appointment management depends on migration 003. It still describes public
cancel/reschedule as missing, although routes and pages exist. It also allows
Node 18 while the current frontend lockfile requires a newer runtime for Vite.
These are small documentation/runtime fixes that prevent avoidable demo and
deploy failures.

## Current state

- README migration order is stale:

```md
README.md:270
As duas migrations devem ser executadas nesta ordem:

1. **backend/database/migrations/001_create_schema.sql**
2. **backend/database/migrations/002_add_business_branding.sql**
```

- Migration 003 adds the public token column used by booking creation:

```sql
backend/database/migrations/003_add_public_appointment_token.sql:4
ALTER TABLE agendamentos
  ADD COLUMN token_publico_hash CHAR(64) NULL AFTER observacoes,
```

- Public booking creation inserts that column:

```js
backend/src/services/publicoService.js:890
const [resultado] = await connection.execute(
  `INSERT INTO agendamentos (
    negocio_id, servico_id, profissional_id, cliente_nome, cliente_telefone,
    cliente_email, data_hora_inicio, data_hora_fim, status, observacoes,
    token_publico_hash
```

- Public management routes and frontend route exist:

```js
backend/src/routes/publicoRoutes.js:6
router.get('/agendamentos/:token', publicoController.buscarAgendamentoPorToken);
```

```js
frontend/src/App.jsx:52
if (path.startsWith('/gerenciar-agendamento/')) {
```

- Current package runtime docs allow Node 18:

```json
backend/package.json:24
"node": ">=18"
```

```json
frontend/package.json:26
"node": ">=18"
```

- The frontend lockfile requires a newer Node for Vite:

```json
frontend/package-lock.json:1166
"node": "^20.19.0 || >=22.12.0"
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend tests | `npm.cmd test` from `backend/` | exit 0, all tests pass |
| Frontend build | `npm.cmd run build` from `frontend/` | exit 0 |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `README.md`
- `backend/package.json`
- `frontend/package.json`
- `frontend/package-lock.json` only if `npm install` is needed to refresh engine metadata

**Out of scope**:
- Changing migration SQL behavior
- Adding a migration runner
- Changing public route paths
- Editing deployment secrets or `.env`
- Implementing new public management features

## Git workflow

- Branch suggestion: `codex/009-sync-deployment-docs`
- Suggested commit message: `docs: sync deployment and public management notes`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Update migration order and verification docs

Update README sections for:

- Local migration order.
- MySQL Workbench steps.
- Railway/MySQL deploy checklist.
- Schema verification commands.

The migration order must be:

1. `001_create_schema.sql`
2. `002_add_business_branding.sql`
3. `003_add_public_appointment_token.sql`

Add a verification note that `DESCRIBE agendamentos;` should include
`token_publico_hash`.

**Verify**: `rg -n "003_add_public_appointment_token|token_publico_hash|DESCRIBE agendamentos" README.md` from repo root -> shows the updated docs.

### Step 2: Fix public management feature docs

Update implemented features, API route docs, limitations, and next-evolution
sections so they no longer say public cancel/reschedule is missing.

Document the current behavior:

- Client receives/uses a management link after booking.
- Public token can view limited appointment details.
- Public token can cancel, confirm presence, list reschedule times, and
  reschedule active appointments.
- Completed/cancelled appointments are not freely mutable by public token.

Keep wording simple and useful for the TCC presentation.

**Verify**: `rg -n "reagendamento|cancelamento|gerenciar-agendamento|token" README.md` from repo root -> shows current behavior and no stale "not implemented" limitation for public cancel/reschedule.

### Step 3: Standardize supported Node runtime

Set backend and frontend `engines.node` to a runtime compatible with the
frontend Vite lockfile. Prefer:

```json
"node": ">=20.19.0"
```

Update README requirements and deploy notes to the same runtime. If the host
environment uses Node 22, this range still allows it.

If `package-lock.json` changes only because of engine metadata after
`npm.cmd install`, include it. If it changes many unrelated dependency versions,
STOP and report instead of committing unrelated churn.

**Verify**:

- `rg -n "\">=20\\.19\\.0\"|Node\\.js 20" README.md backend/package.json frontend/package.json`
- `npm.cmd test` from `backend/` -> exits 0
- `npm.cmd run build` from `frontend/` -> exits 0

### Step 4: Keep roadmap aligned with TCC scope

Where README lists next evolutions, keep payments and advanced dashboards clearly
future/out-of-scope and prioritize MVP-adjacent reliability items first:

- disposable MySQL test DB for plan 003
- migration runner or migration tracking
- manual blocks/folgas
- notification simulation/integration
- upload persistence check
- frontend test baseline
- plan 004 pagination

Do not remove payments entirely if the README wants a long-term idea list, but
do not present it as a near-term TCC item.

**Verify**: `rg -n "Pagamentos|Dashboard avançado|banco de testes|folgas|migra" README.md` -> roadmap wording is clear.

## Test plan

- This is primarily documentation/runtime metadata.
- Run backend tests and frontend build after changing engine fields.
- Use `rg` checks above to confirm README no longer contradicts code.

## Done criteria

- [ ] README lists migrations 001, 002, and 003 in setup and deploy sections.
- [ ] README documents current public appointment management behavior.
- [ ] Backend and frontend `engines.node` agree with the frontend lockfile.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd run build` from `frontend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Updating package metadata causes broad dependency churn.
- The live deploy platform cannot support Node 20.19+ or Node 22.
- README has already been rewritten and the cited stale sections no longer
  exist.
- You discover migration 003 was intentionally omitted for a deployment reason
  not recorded in the repo.

## Maintenance notes

This plan does not solve migration idempotency. A later plan should add a small
migration history convention or runner so deploys do not depend on manual memory.

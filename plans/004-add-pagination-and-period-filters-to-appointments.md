# Plan 004: Add Pagination And Period Filters To Appointments

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3072a78..HEAD -- backend/src/services/agendamentosService.js backend/src/controllers/agendamentosController.js backend/src/routes/agendamentosRoutes.js frontend/src/services/agendamentosService.js frontend/src/pages/Dashboard.jsx frontend/src/pages/Clientes.jsx frontend/src/pages/Agenda.jsx backend/test backend/tests`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-establish-backend-verification-baseline.md`
- **Category**: perf
- **Planned at**: commit `3072a78`, 2026-06-25

## Why this matters

The admin pages currently fetch all appointments for the business, then Dashboard, Clientes, and Agenda derive metrics client-side. This is acceptable for early MVP data, but it will become slow as appointment history grows. A small pagination/period-filter design keeps the MVP simple while preventing unbounded payloads.

## Current state

- Backend list endpoint returns all appointments for the business:

```js
backend/src/services/agendamentosService.js:92
async function listarAgendamentos(usuarioId) {
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const [agendamentos] = await pool.execute(
    `${consultaAgendamentosBase()}
     WHERE a.negocio_id = ?
     ORDER BY a.data_hora_inicio ASC`,
    [negocioId]
  );
```

- Controller does not pass query filters:

```js
backend/src/controllers/agendamentosController.js:9
async function listar(req, res, next) {
  try {
    const agendamentos = await listarAgendamentos(req.usuario.id);
```

- Frontend service calls the endpoint without parameters:

```js
frontend/src/services/agendamentosService.js:3
function listarAgendamentos() {
  return request('/api/agendamentos');
}
```

- Clientes derives a full client profile from all appointments:

```js
frontend/src/pages/Clientes.jsx:213
const carregarClientes = useCallback(async (silencioso = false) => {
  ...
  const [resultadoAgendamentos, resultadoServicos] =
    await Promise.allSettled([listarAgendamentos(), listarServicos()]);
```

- Repo conventions:
  - Frontend service functions live in `frontend/src/services/*Service.js`.
  - Backend validates payload/query values inside service helpers.
  - Keep response shapes simple JSON objects.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend tests | `npm.cmd test` from `backend/` | exit 0 |
| Frontend build | `npm.cmd run build` from `frontend/` | exit 0 |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `backend/src/services/agendamentosService.js`
- `backend/src/controllers/agendamentosController.js`
- `frontend/src/services/agendamentosService.js`
- Minimal changes to `Dashboard.jsx`, `Clientes.jsx`, `Agenda.jsx` only as needed to pass filters
- Backend tests for query validation

**Out of scope**:
- New dashboard design
- Infinite scroll
- Advanced reports
- Database denormalization
- Changing public scheduling endpoints

## Git workflow

- Branch suggestion: `codex/004-appointment-pagination-filters`
- Suggested commit message: `feat(agendamentos): add filters to admin appointment list`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Define a backward-compatible query contract

Support optional query parameters on `GET /api/agendamentos`:

- `inicio`: `YYYY-MM-DD`, optional
- `fim`: `YYYY-MM-DD`, optional
- `status`: one of existing statuses, optional
- `limit`: integer, default 100, max 500
- `offset`: integer, default 0

If no query params are provided, keep behavior close to current but still apply a safe default limit. If that would break current Dashboard/Clientes expectations, STOP and propose separate summary endpoints instead.

**Verify**: Add tests for valid and invalid query parsing; `npm.cmd test` from `backend/` should pass.

### Step 2: Implement backend filtering

Update `listarAgendamentos(usuarioId, filtros)` to build a parameterized SQL query. Continue using `consultaAgendamentosBase()` and `pool.execute`; do not concatenate user values into SQL.

Return metadata:

```json
{
  "agendamentos": [],
  "paginacao": { "limit": 100, "offset": 0, "total": 0 }
}
```

If adding `total` requires a second `COUNT(*)` query, keep it simple and parameterized.

**Verify**: `npm.cmd test` from `backend/` -> filtering and pagination tests pass.

### Step 3: Update frontend service without changing callers abruptly

Update `frontend/src/services/agendamentosService.js` so `listarAgendamentos(filtros = {})` serializes provided filters with `URLSearchParams`. Existing calls with no argument must continue to work.

**Verify**: `npm.cmd run build` from `frontend/` -> exits 0.

### Step 4: Make page usage explicit

Update pages only where necessary:

- `Agenda.jsx`: request a relevant period/status when filters are selected.
- `Dashboard.jsx`: request the period needed for dashboard metrics/report, or STOP if it requires a new summary endpoint.
- `Clientes.jsx`: if full history is required for client profile, either request a larger bounded period or STOP and recommend a dedicated clients endpoint.

Keep UI changes minimal.

**Verify**: `npm.cmd run build` from `frontend/` -> exits 0.

## Test plan

- Backend tests:
  - default filters
  - invalid date rejected
  - invalid status rejected
  - limit clamped/rejected according to chosen rule
  - generated query remains parameterized
- Frontend verification:
  - build succeeds
  - service serializes params correctly, either through tests if frontend test runner exists or by small unit coverage if one is introduced later

## Done criteria

- [ ] `GET /api/agendamentos` supports bounded filters.
- [ ] Existing frontend calls still build and run.
- [ ] Backend tests cover query validation.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd run build` from `frontend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No unrelated UI redesign or route rename.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Applying a default limit would make current Dashboard or Clientes incorrect.
- The right solution is clearly a new summary/client endpoint instead of stretching `/api/agendamentos`.
- Filtering requires touching many unrelated frontend components.
- Plan 001's backend test command is not available.

## Maintenance notes

This is a stepping stone, not a reporting system. If future requirements include complex metrics, create dedicated summary endpoints rather than shipping all appointments to the browser.

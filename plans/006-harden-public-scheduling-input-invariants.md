# Plan 006: Harden Public Scheduling Input Invariants

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2fe0e87..HEAD -- backend/src/services/publicoService.js backend/src/services/negocioService.js frontend/src/pages/Negocio.jsx frontend/src/pages/AgendamentoPublico.jsx backend/test`
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

The public UI offers a controlled list of available slots, but the backend
currently accepts any valid `data_hora_inicio` that is inside business hours and
does not conflict. A direct API caller can book `10:07` even when the business
uses a 30-minute grid. There is a second related invariant leak: the business
form can save `dias_funcionamento: []`, and the scheduling service treats an
empty array like "all days allowed" while the public page displays it as "days
not informed." This plan makes the scheduling contract explicit and enforceable.

## Current state

- `backend/src/services/publicoService.js` generates available slots from
  business opening time and `intervalo_agendamento_minutos`:

```js
backend/src/services/publicoService.js:751
const abertura = aplicarHorario(data, negocio.horario_abertura);
const fechamento = aplicarHorario(data, negocio.horario_fechamento);
const intervalo = Number(negocio.intervalo_agendamento_minutos) || 30;
...
for (
  let inicio = new Date(abertura);
  inicio < fechamento;
  inicio = adicionarMinutos(inicio, intervalo)
) {
```

- Public create validates day, hours, and conflicts, but not slot alignment:

```js
backend/src/services/publicoService.js:836
async function criarAgendamentoPublico(slugOuId, dados) {
  const dadosValidados = montarDadosAgendamento(dados);
  const negocio = await buscarNegocioPublico(slugOuId);
```

- Business days validation accepts an empty array:

```js
backend/src/services/negocioService.js:103
function normalizarDiasFuncionamento(valor) {
  if (valor === undefined) {
    return undefined;
  }
  ...
  return valor;
}
```

- Public scheduling checks days only when the array has length:

```js
backend/src/services/publicoService.js:816
const diasFuncionamento = parseJsonArray(negocio.dias_funcionamento);

if (
  diasFuncionamento &&
  diasFuncionamento.length > 0 &&
  !diasFuncionamento.includes(data.getDay())
) {
```

- The frontend can uncheck the last day and send an empty array:

```js
frontend/src/pages/Negocio.jsx:257
function alternarDia(dia) {
  setForm((atual) => {
    const dias = atual.dias_funcionamento.includes(dia)
      ? atual.dias_funcionamento.filter((item) => item !== dia)
      : [...atual.dias_funcionamento, dia].sort((a, b) => a - b);
```

- The public page labels empty days as not informed:

```js
frontend/src/pages/AgendamentoPublico.jsx:105
function formatarDiasFuncionamento(dias) {
  if (!Array.isArray(dias) || dias.length === 0) {
    return 'Dias nao informados';
  }
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend tests | `npm.cmd test` from `backend/` | exit 0, all tests pass |
| Frontend build | `npm.cmd run build` from `frontend/` | exit 0 |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `backend/src/services/publicoService.js`
- `backend/src/services/negocioService.js`
- `backend/test/**`
- `frontend/src/pages/Negocio.jsx`
- `frontend/src/pages/AgendamentoPublico.jsx`

**Out of scope**:
- Database schema changes
- New availability/blocking features
- New interval configuration UI
- Public route path changes
- The concurrent booking race covered by plan 003

## Git workflow

- Branch suggestion: `codex/006-public-scheduling-invariants`
- Suggested commit message: `fix(agendamentos): enforce public scheduling invariants`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add tests for slot alignment

Add backend tests for public creation and public rescheduling validation. Use a
mocked connection/pool following `backend/test/publicoService.test.js`.

Cover:

- A business with opening `08:00:00` and interval `30` rejects `08:15`.
- The same business accepts `08:30` when there is no conflict.
- The same rule applies to `reagendarAgendamentoPublicoPorToken`.

The error should be public-safe Portuguese, for example
`Horario fora da grade de agendamento do negocio.`

**Verify**: `npm.cmd test` from `backend/` -> the new slot-alignment tests fail
before the service change.

### Step 2: Add one backend helper for slot alignment

In `backend/src/services/publicoService.js`, add a small pure helper near the
existing date/time helpers. It should compare `dataHoraInicio` against
`aplicarHorario(dataHoraInicio, negocio.horario_abertura)` and
`negocio.intervalo_agendamento_minutos`.

Use minute precision. Do not rely on string slicing for the actual decision.

**Verify**: `npm.cmd test` from `backend/` -> tests may still fail until callers
use the helper.

### Step 3: Apply the slot helper to create and reschedule

Call the helper in both:

- `criarAgendamentoPublico`
- `reagendarAgendamentoPublicoPorToken`

Place the validation after service duration is known and before conflict SQL.
Keep the conflict SQL unchanged except for any necessary helper reuse.

**Verify**: `npm.cmd test` from `backend/` -> slot tests pass.

### Step 4: Decide and enforce the empty-days contract

For this MVP, choose the simplest safe contract: a business must have at least
one operating day. Implement it in `normalizarDiasFuncionamento` so an empty
array returns a `400` with a clear Portuguese message.

Add backend tests for create/update validation:

- `dias_funcionamento: []` is rejected.
- Duplicate days are still rejected.
- Valid days still pass.

**Verify**: `npm.cmd test` from `backend/` -> all business-day tests pass.

### Step 5: Mirror the rule in the frontend form

In `frontend/src/pages/Negocio.jsx`, prevent saving when no day is selected and
show the same practical message. Prefer a simple guard in `handleSubmit`; avoid
large UI restructuring.

In `frontend/src/pages/AgendamentoPublico.jsx`, keep the display fallback for
legacy/null data, but do not imply an empty array means open every day.

**Verify**: `npm.cmd run build` from `frontend/` -> exits 0.

## Test plan

- Backend unit tests:
  - slot alignment for create
  - slot alignment for public reschedule
  - empty business days rejected
  - valid business days accepted
- Frontend verification:
  - build succeeds
  - manually try unchecking all days in `/negocio` and confirm the form blocks
    save with a clear message

## Done criteria

- [ ] Direct public API calls cannot book off-grid start times.
- [ ] Public rescheduling uses the same grid rule as creation.
- [ ] Businesses cannot save an empty `dias_funcionamento` array.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd run build` from `frontend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Product owner says empty operating days should intentionally mean "open every
  day." If so, update display/documentation instead of rejecting it.
- Slot alignment appears to require supporting per-professional schedules.
- The service code has already been split and these helpers now belong in a
  different scheduling module.
- Frontend validation requires a redesign of the business form.

## Maintenance notes

If a future feature adds custom intervals per service or professional, this
helper must become part of the canonical scheduling rules module. Do not add a
second copy in the frontend; the backend remains the source of truth.

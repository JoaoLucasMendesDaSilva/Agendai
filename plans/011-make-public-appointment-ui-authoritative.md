# Plan 011: Make public appointment UI reflect authoritative outcomes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 5020d22..HEAD -- frontend/src/pages/AgendamentoPublico.jsx frontend/src/pages/AgendamentoPublico.test.jsx frontend/src/pages/GerenciarAgendamento.jsx frontend/src/pages/GerenciarAgendamento.test.jsx plans/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `5020d22`, 2026-07-10

## Why this matters

The public booking UI can tell a customer that booking failed after the backend
has already committed it, solely because a follow-up availability refresh
failed. The management page also exposes actions that the backend rejects for
completed appointments, and a slower date request can overwrite the slots for
a newer date. These contradictions invite duplicate bookings, needless support
requests, and accidental action on stale data. The frontend must treat mutation
responses as authoritative, show actions only for manageable statuses, and
apply only the newest asynchronous slot response.

## Current state

### Files and roles

- `frontend/src/pages/AgendamentoPublico.jsx` owns the unauthenticated service,
  professional, date, slot, customer, and booking-confirmation flow.
- `frontend/src/pages/AgendamentoPublico.test.jsx` has two component tests and
  already hoists mocks for every public service used by the page.
- `frontend/src/pages/GerenciarAgendamento.jsx` loads an appointment by public
  token and offers confirmation, rescheduling, and cancellation.
- `frontend/src/pages/GerenciarAgendamento.test.jsx` does not exist.
- `frontend/src/services/publicoService.js` is the API adapter. Its public
  function signatures are sufficient; this plan does not change the adapter or
  response shapes.
- `backend/src/services/publicoService.js` is read-only context for the UI
  contract. It rejects management of `cancelado` and `concluido` appointments.
- `plans/README.md` is the execution index and receives only the final status
  update for this plan.

### Invariant 1: a successful create response is authoritative

`confirmarAgendamento` currently puts the primary POST and an auxiliary slot
refresh in one `try/catch`:

```jsx
// frontend/src/pages/AgendamentoPublico.jsx:224-268
try {
  // ...
  const resposta = await criarAgendamentoPublico(slugOuId, payload);
  // ...
  setSucesso(resposta.mensagem || 'Agendamento confirmado...');
  setResumoConfirmado({ ...resumo, linkGerenciamento });
  setCliente(CLIENTE_INICIAL);
  setHorarioSelecionado(null);

  const horariosResposta = await listarHorariosDisponiveis(slugOuId, {
    data,
    servico_id: servicoId,
    profissional_id: profissionalId,
  });
  setHorarios(horariosResposta.horarios || []);
} catch (err) {
  setErro(
    err.message.includes('indispon') || err.message.includes('conflito')
      ? 'Este horário ficou indisponível. Escolha outro horário.'
      : err.message
  );
}
```

If `criarAgendamentoPublico` resolves and the later list call rejects, the page
keeps the success summary but also renders an error implying that the booking
did not happen. Only a rejection from `criarAgendamentoPublico` may be reported
as a create failure. A refresh failure after success must preserve the success
message, confirmation summary, management link, and cleared form.

### Invariant 2: terminal appointments have no mutating public actions

The management page knows all four current statuses:

```jsx
// frontend/src/pages/GerenciarAgendamento.jsx:18-23
const STATUS_LABELS = {
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  confirmado: 'Confirmado',
  pendente: 'Pendente',
};
```

But its action visibility checks only `cancelado`:

```jsx
// frontend/src/pages/GerenciarAgendamento.jsx:289-370
{exibindoReagendamento && agendamento.status !== 'cancelado' && (...)}
{agendamento.status !== 'cancelado' && <button>Confirmar presença</button>}
{agendamento.status !== 'cancelado' && <button>Reagendar</button>}
```

The cancel button is likewise disabled only for `cancelado`. The backend's
actual terminal rule is broader:

```js
// backend/src/services/publicoService.js:35-43
function validarAgendamentoGerenciavel(agendamento, acao) {
  if (agendamento.status === 'cancelado') {
    throw criarErro(409, `Agendamento cancelado nao pode ser ${acao}.`);
  }

  if (agendamento.status === 'concluido') {
    throw criarErro(409, `Agendamento concluido nao pode ser ${acao}.`);
  }
}
```

For the current domain, `pendente` and `confirmado` are manageable;
`cancelado` and `concluido` are terminal. Centralize that predicate once in
`GerenciarAgendamento.jsx` and use it for the reschedule panel and all three
mutating actions. Do not invent additional statuses or change backend rules.

### Invariant 3: slot lists are latest-request-wins

`AgendamentoPublico` starts a request whenever service, professional, date, or
slug changes. Its effect-local `ativo` flag protects ordinary effect cleanup,
but the manual post-create refresh is a second call path and has no shared
ordering token:

```jsx
// frontend/src/pages/AgendamentoPublico.jsx:139-180
useEffect(() => {
  let ativo = true;
  async function carregarHorarios() {
    // ...
    const resposta = await listarHorariosDisponiveis(slugOuId, filtros);
    if (ativo) {
      setHorarios(resposta.horarios || []);
      setHorarioSelecionado(null);
    }
  }
  carregarHorarios();
  return () => { ativo = false; };
}, [data, profissionalId, servicoId, slugOuId]);
```

`GerenciarAgendamento` has no stale-response guard at all:

```jsx
// frontend/src/pages/GerenciarAgendamento.jsx:132-151
async function selecionarNovaData(valor) {
  setNovaData(valor);
  setHorarios([]);
  // ...
  setCarregandoHorarios(true);
  try {
    const resposta = await listarHorariosReagendamento(token, valor);
    setHorarios(resposta.horarios || []);
  } catch (err) {
    setErro(err.message);
  } finally {
    setCarregandoHorarios(false);
  }
}
```

If date A is requested, then date B, and A settles last, the UI can show A's
slots under B. Use a monotonically increasing request id stored in `useRef` in
each page. Increment before every slot request and also when clearing/changing
the selection invalidates an outstanding request. Only the request whose id
still matches may update slots, selected slot, slot error, or loading state.
Do not use response arrival order as the source of truth.

### Test and product conventions

- `frontend/src/pages/AgendamentoPublico.test.jsx` uses Vitest, React Testing
  Library, `userEvent`, and a hoisted `publicoServiceMock`. Extend it rather than
  creating a parallel test style.
- `frontend/src/pages/Servicos.test.jsx` demonstrates service/context mocks and
  asynchronous assertions with `waitFor`.
- Use a local deferred-promise helper in tests to control settlement order:

```js
function criarPromessaControlada() {
  let resolve;
  let reject;
  const promise = new Promise((resolver, rejeitar) => {
    resolve = resolver;
    reject = rejeitar;
  });
  return { promise, reject, resolve };
}
```

- `PRODUCT.md:35-39` requires the current state and next action to be clear,
  and calls appointment status an operation that must inspire trust.
- `DESIGN.md:119` requires visible, understandable success/error states;
  showing mutually contradictory success and error violates that rule.
- `DESIGN.md:147` says semantic error colors represent a real error. Do not
  display a booking failure for an optional refresh failure.
- Keep all user-facing language in simple Portuguese and preserve the existing
  mobile-first markup. No CSS change is needed.

## Commands you will need

Run frontend commands from `frontend/` and Git commands from the repository
root.

| Purpose | Command | Expected on success |
|---|---|---|
| Focused public-flow tests | `npm.cmd test -- src/pages/AgendamentoPublico.test.jsx src/pages/GerenciarAgendamento.test.jsx` | exit 0; 2 files and 7 tests pass |
| Full frontend suite | `npm.cmd test` | exit 0; all frontend tests pass |
| Production build | `npm.cmd run build` | exit 0; Vite build completes |
| Terminal rule check | `rg -n "STATUS_TERMINAIS|podeSerGerenciado|agendamentoGerenciavel" src/pages/GerenciarAgendamento.jsx` | one centralized predicate and its uses are visible |
| Request ordering check | `rg -n "useRef|ultima.*Consulta|consulta.*Id" src/pages/AgendamentoPublico.jsx src/pages/GerenciarAgendamento.jsx` | both pages show an explicit monotonic request guard |
| Whitespace | `git diff --check` | exit 0 |
| Scope | `git status --short` | only the five in-scope paths are listed |

## Suggested executor toolkit

- Use the project `frontend-mobile-first` skill if available to preserve the
  public flow's accessible labels, Portuguese state messages, and mobile
  interaction model.
- Use the project `scheduling-rules` skill if available to verify that frontend
  predicates mirror, rather than redefine, the backend's existing terminal
  status contract. This plan does not authorize backend changes.

## Scope

**In scope** (the only files you should modify):

- `frontend/src/pages/AgendamentoPublico.jsx`
- `frontend/src/pages/AgendamentoPublico.test.jsx`
- `frontend/src/pages/GerenciarAgendamento.jsx`
- `frontend/src/pages/GerenciarAgendamento.test.jsx` (create)
- `plans/README.md` (status update only after completion)

**Out of scope** (do not touch):

- `frontend/src/services/publicoService.js` or any public API response shape
- All backend code, routes, status transitions, token behavior, and database
  logic
- CSS, visual redesign, copy overhaul, routing, or authentication
- Adding a data-fetching library, state-management library, or test dependency
- Retrying a booking POST automatically; create is a mutation and must never be
  replayed speculatively
- General cancellation of every request in the application. This plan is
  limited to the two public slot-selection flows proven unsafe here.

## Git workflow

- Suggested branch: `codex/011-authoritative-public-appointment-ui`
- Keep each behavior with its regression coverage. Two logical commits are
  acceptable:
  - `fix(frontend): preserve public booking outcomes`
  - `fix(frontend): guard public appointment actions`
- The repository uses conventional prefixes such as
  `fix(frontend): endurecer interacoes da landing page`; match that style.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Lock the successful-booking boundary with a regression test

Extend `frontend/src/pages/AgendamentoPublico.test.jsx` with one test named for
the observable contract, for example
`mantem a confirmacao quando a atualizacao auxiliar de horarios falha`.

Arrange the existing business, one service, one professional, and one initial
slot. Configure:

1. The first `listarHorariosDisponiveis` call to resolve with the initial slot.
2. `criarAgendamentoPublico` to resolve with a confirmation message and an
   appointment containing `token_gerenciamento`.
3. The post-create `listarHorariosDisponiveis` call to reject with a distinctive
   message such as `Falha ao atualizar horários`.

Drive the rendered flow through accessible controls: select service,
professional, and the initial slot; fill `Nome` and `Telefone`; submit
`Confirmar agendamento`. Assert all of the following after the auxiliary
rejection settles:

- the confirmation summary remains visible;
- the management link built from the returned token remains visible;
- the successful message remains visible;
- no alert reports the auxiliary refresh failure;
- `criarAgendamentoPublico` was called exactly once.

This test must fail against the planned-at implementation because the shared
catch calls `setErro` for the second request.

**Verify**: `npm.cmd test -- src/pages/AgendamentoPublico.test.jsx` from
`frontend/` -> exit is non-zero only for the new auxiliary-refresh assertion;
the existing two tests still pass. Do not commit the red phase separately.

### Step 2: Separate the primary mutation outcome from best-effort refresh

Refactor only `confirmarAgendamento` in
`frontend/src/pages/AgendamentoPublico.jsx` so its state transitions have an
explicit boundary:

1. Await `criarAgendamentoPublico` in the primary error boundary.
2. If the POST rejects, show the current conflict/general message, leave no
   success summary, and finish without retrying.
3. Once the POST resolves, immediately commit the success message, summary,
   management link, cleared customer fields, and cleared selected slot. No
   later operation may convert that outcome into a booking error.
4. Refresh slots as a best-effort secondary operation. If it rejects, keep the
   success state and at minimum remove the just-booked slot from the current
   local list. Do not call `setErro` with the refresh error and do not retry the
   POST.

Use the exact `data_hora_inicio` captured before clearing
`horarioSelecionado` when removing the booked slot. Do not silently swallow a
primary create failure. A comment is appropriate only at the secondary catch,
explaining that the confirmed POST is authoritative; do not narrate trivial
state setters.

**Verify**: `npm.cmd test -- src/pages/AgendamentoPublico.test.jsx` from
`frontend/` -> exit 0; 1 file and 3 tests pass at this step.

### Step 3: Make public slot requests latest-request-wins

In `frontend/src/pages/AgendamentoPublico.jsx`:

1. Add `useRef` to the React import and create one monotonically increasing ref
   dedicated to availability queries.
2. Every availability request, including the post-create best-effort refresh,
   captures a new numeric id.
3. Before setting `horarios`, `horarioSelecionado`, `erro`, or
   `carregandoHorarios`, compare the captured id to the current ref value.
4. When service/professional/date selection becomes incomplete or is reset,
   increment the ref before clearing state so an old request cannot repopulate
   it.
5. Preserve the primary booking success boundary from step 2: an obsolete or
   failed refresh cannot set the create error.

Do not add `AbortController` unless the existing service wrapper already
accepts `signal` at the planned commit; it does not. Ignoring stale completion
is sufficient and keeps the API adapter out of scope.

Add a fourth test to `AgendamentoPublico.test.jsx` using two controlled
promises. After selecting service and professional, change `Data do
agendamento` to date A and immediately to date B. Let A settle while B remains
pending; assert A's slot is absent and the loading status remains. Then resolve
B and assert only B's slot is offered. The test must prove rendered state, not
just service call order.

**Verify**: `npm.cmd test -- src/pages/AgendamentoPublico.test.jsx` from
`frontend/` -> exit 0; 1 file and 4 tests pass.

### Step 4: Centralize terminal-state action visibility

In `frontend/src/pages/GerenciarAgendamento.jsx`, define one local domain
predicate based on `cancelado` and `concluido`. A constant set plus a helper or
a clearly named boolean derived from `agendamento.status` is acceptable. Do not
copy three independent comparisons.

Use the predicate to ensure:

- the rescheduling panel cannot render for a terminal appointment;
- `Confirmar presença`, `Reagendar`, and `Cancelar agendamento` are not rendered
  for either terminal status;
- if an appointment becomes terminal after an action response, any open
  rescheduling state and slots are cleared;
- the status badge and appointment details remain visible;
- one concise `role="status"` message explains in Portuguese that a completed
  or cancelled appointment has no available changes.

Create `frontend/src/pages/GerenciarAgendamento.test.jsx`. Hoist mocks for all
five imported public-service functions. Add an `it.each` test covering
`cancelado` and `concluido`; each rendered fixture must retain its status badge
but have no confirm, reschedule, or cancel button. This parameterized case
counts as two tests.

**Verify**: `npm.cmd test -- src/pages/GerenciarAgendamento.test.jsx` from
`frontend/` -> exit 0; 1 file and 2 terminal-status cases pass.

### Step 5: Prevent stale rescheduling results and loading-state races

In `frontend/src/pages/GerenciarAgendamento.jsx`:

1. Add `useRef` to the React import and create a request counter dedicated to
   `listarHorariosReagendamento`.
2. In `selecionarNovaData`, increment and capture the request id before the
   early return or API call.
3. Only the current id may set slots, request errors, or
   `carregandoHorarios = false`.
4. Increment the id when closing/resetting the reschedule panel so an
   outstanding response cannot reopen data or alter messages.
5. Do not clear a success message from an unrelated newer mutation when an old
   slot request settles.

Add one controlled-promise test to
`frontend/src/pages/GerenciarAgendamento.test.jsx`: load a `pendente`
appointment, open `Reagendar`, request date A, then date B. Resolve A first and
assert its slot is absent while the newest request is still loading. Resolve B
and assert only B's slot is rendered and loading ends. No timers or arbitrary
sleeps are allowed.

**Verify**: `npm.cmd test -- src/pages/GerenciarAgendamento.test.jsx` from
`frontend/` -> exit 0; 1 file and 3 tests pass.

### Step 6: Run combined and repository-level frontend gates

Run both public-flow test files together before the full suite. This catches
mock leakage and confirms the five new regression cases coexist with the two
existing public-booking tests.

**Verify**:

1. `npm.cmd test -- src/pages/AgendamentoPublico.test.jsx src/pages/GerenciarAgendamento.test.jsx`
   from `frontend/` -> exit 0; 2 files and 7 tests pass.
2. `npm.cmd test` from `frontend/` -> exit 0; all frontend tests pass.
3. `npm.cmd run build` from `frontend/` -> exit 0; Vite production build
   completes.
4. `git diff --check` from the repository root -> exit 0.

Do not commit `frontend/dist/`.

### Step 7: Reconcile the plan index and inspect final scope

After all gates pass, change only plan 011's status in `plans/README.md` to
`DONE`, including the implementing commit SHA if the index convention records
it. Do not alter other plan rows.

**Verify**: `git status --short` from the repository root -> only the four
frontend files in this plan plus `plans/README.md` are listed. `git diff --stat`
must show no CSS, dependency, generated, service-adapter, or backend changes.

## Test plan

Add exactly five regression cases, for seven focused tests total:

- `frontend/src/pages/AgendamentoPublico.test.jsx` (retain 2, add 2):
  - committed booking remains confirmed when the auxiliary slot refresh fails;
  - reversed date-request completion displays only the latest date's slots and
    preserves its loading state until that request settles.
- `frontend/src/pages/GerenciarAgendamento.test.jsx` (create with 3):
  - `cancelado` fixture shows details/status but no mutating actions;
  - `concluido` fixture shows details/status but no mutating actions;
  - reversed reschedule-date completion displays only the latest date's slots
    and does not end loading when the stale request settles.

Testing requirements:

- Use service mocks only; no network or live backend.
- Use controlled promises rather than fake timeouts or sleeps.
- Query inputs/buttons/status messages by accessible role or Portuguese label.
- Assert rendered outcomes and call count for the booking POST; do not test
  private refs or helper implementation.
- Focused verification:
  `npm.cmd test -- src/pages/AgendamentoPublico.test.jsx src/pages/GerenciarAgendamento.test.jsx`
  -> 2 files / 7 tests pass.
- Regression verification: `npm.cmd test` -> complete frontend suite passes.

## Done criteria

All must hold:

- [ ] A resolved `criarAgendamentoPublico` call is never reported as a booking
      failure because a later availability refresh rejects.
- [ ] The successful summary, management link, and message survive the tested
      auxiliary refresh failure, and the POST occurs exactly once.
- [ ] Both public slot flows use an explicit latest-request-wins guard that
      covers slot data, slot-specific errors, selected slot, and loading state.
- [ ] Neither `cancelado` nor `concluido` renders confirm, reschedule, or cancel
      controls; both still render appointment details and status.
- [ ] The five specified regression cases exist, with no snapshots, arbitrary
      sleeps, or live service calls.
- [ ] Focused tests exit 0 with 2 files / 7 tests.
- [ ] `npm.cmd test` exits 0 for the complete frontend suite.
- [ ] `npm.cmd run build` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No files outside the in-scope list are modified.
- [ ] Plan 011's `plans/README.md` row is `DONE`; no other row changed.

## STOP conditions

Stop and report; do not improvise if:

- The drift check reports changes and the create/refresh error boundary, status
  values, or reschedule handler no longer matches the excerpts above.
- The backend no longer treats exactly `cancelado` and `concluido` as terminal
  for all three public mutations. Do not guess a frontend status matrix.
- `criarAgendamentoPublico` no longer returns the management token in
  `resposta.agendamento.token_gerenciamento`.
- Fixing request ordering appears to require changing the public service API,
  adding a dependency, or modifying backend code.
- A proposed approach automatically retries the booking POST or can issue it
  more than once for one submit.
- A controlled-promise test cannot distinguish stale slot data and loading
  state without changing production behavior outside these pages.
- Any focused test fails twice after the corresponding invariant is implemented
  and mocks match the imported service functions.
- Full tests or build expose an unrelated pre-existing failure; capture exact
  command/output and report it rather than weakening a gate.
- The fix requires CSS or files outside the in-scope list.

## Maintenance notes

- The backend remains authoritative for authorization and transitions. These
  frontend predicates are affordance guards, not security controls.
- Reviewers should trace each asynchronous state setter to the matching request
  id. Guarding only `setHorarios` while allowing a stale request to clear
  loading or set an error is incomplete.
- Reviewers should also verify that the primary POST catch and secondary
  refresh catch cannot be conflated during later cleanup.
- If a query library is introduced later, preserve these contracts using query
  keys/cancellation and mutation callbacks; do not remove the tests merely
  because implementation details change.
- Broader stale-request auditing in admin pages, public mutation concurrency,
  and backend transition races are intentionally deferred to separate plans.

# Plan 010: Restore functional dashboard report period controls

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 5020d22..HEAD -- frontend/src/pages/Dashboard.jsx frontend/src/pages/Dashboard.test.jsx plans/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `5020d22`, 2026-07-10

## Why this matters

Both report date inputs render, but changing either one calls a function that
does not exist. The resulting runtime `ReferenceError` leaves the controlled
input unchanged and prevents an entrepreneur from selecting the period used by
PDF and XLSX exports. A production build does not detect unresolved identifiers
inside an event handler, so this regression also needs a component interaction
test that exercises both controls.

## Current state

- `frontend/src/pages/Dashboard.jsx` is the administrative dashboard. It owns
  the report period and both export actions.
- `frontend/src/pages/Dashboard.test.jsx` does not exist. Existing page tests,
  such as `frontend/src/pages/Servicos.test.jsx`, use Vitest, React Testing
  Library, `userEvent`, hoisted service mocks, and accessible labels.
- `plans/README.md` is the execution index and must be marked `DONE` only after
  every verification in this plan passes.

The period is a two-field object initialized to the current month:

```jsx
// frontend/src/pages/Dashboard.jsx:244-255
function Dashboard({ navigate }) {
  // ...
  const [periodoRelatorio, setPeriodoRelatorio] = useState(obterPeriodoMesAtual);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
```

The controls call `atualizarPeriodo`, but the symbol has no definition in the
current file:

```jsx
// frontend/src/pages/Dashboard.jsx:893-908
<label>
  Início
  <input
    onChange={(event) => atualizarPeriodo('inicio', event.target.value)}
    type="date"
    value={periodoRelatorio.inicio}
  />
</label>
<label>
  Fim
  <input
    onChange={(event) => atualizarPeriodo('fim', event.target.value)}
    type="date"
    value={periodoRelatorio.fim}
  />
</label>
```

At the planned commit, this command finds the state and two calls but no
function declaration:

```powershell
rg -n "periodoRelatorio|atualizarPeriodo" frontend/src/pages/Dashboard.jsx
```

Git history identifies the accidental deletion. The parent of commit
`0e6d71c` contained the intended minimal updater at lines 481-486:

```jsx
function atualizarPeriodo(campo, valor) {
  setPeriodoRelatorio((atual) => ({
    ...atual,
    [campo]: valor,
  }));
}
```

Use this shape. The functional state setter is load-bearing: updating `inicio`
must preserve `fim`, and updating `fim` must preserve `inicio` even if React
batches interactions.

Relevant repository conventions and constraints:

- Mock all four dashboard service modules; component tests must not contact a
  backend. Each list service can resolve to its corresponding empty array and
  `buscarNegocio` can resolve to `{ negocio: null }`.
- Mock `useAuth`, `useTheme`, and `chart.js/auto`. The chart mock only needs a
  constructible `Chart` with a `destroy` spy; report-period behavior must not
  depend on canvas rendering.
- `frontend/test/setup.js` already installs jest-dom matchers and a
  `window.matchMedia` mock.
- `DESIGN.md:167` requires simple Portuguese UI language. Do not rename the
  existing `Início` and `Fim` labels as part of this fix.
- `DESIGN.md:207` requires visible error and disabled states. Do not change the
  export validation or button state while fixing the input handler.

## Commands you will need

Run frontend commands from `frontend/` and Git commands from the repository
root.

| Purpose | Command | Expected on success |
|---|---|---|
| Confirm the symbol shape | `rg -n "function atualizarPeriodo|atualizarPeriodo\(" src/pages/Dashboard.jsx` | one definition and two call sites after the fix |
| Focused regression tests | `npm.cmd test -- src/pages/Dashboard.test.jsx` | exit 0; 1 test file and 2 tests pass |
| Full frontend suite | `npm.cmd test` | exit 0; all frontend tests pass |
| Production build | `npm.cmd run build` | exit 0; Vite build completes |
| Whitespace | `git diff --check` | exit 0 |
| Scope check | `git status --short` | only the three in-scope paths are listed |

## Suggested executor toolkit

- Use the project `frontend-mobile-first` skill if available to check that the
  existing labels, keyboard behavior, and controlled-input semantics are
  preserved. This plan does not authorize a visual redesign.

## Scope

**In scope** (the only files you should modify):

- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Dashboard.test.jsx` (create)
- `plans/README.md` (status update only after completion)

**Out of scope** (do not touch):

- PDF generation, XLSX generation, filenames, or report filtering rules
- Dashboard layout, CSS, chart behavior, metrics, or service-loading behavior
- New dependencies or changes to `frontend/package.json`
- Other pages, backend files, migrations, and deployment configuration
- Refactoring unrelated helpers out of the 934-line dashboard; that deserves a
  separate plan with broader regression coverage

## Git workflow

- Suggested branch: `codex/010-restore-dashboard-period-controls`
- Keep the production fix and its regression test in one logical commit so the
  branch is never left with an untested handler.
- Commit message: `fix(frontend): restore dashboard report period controls`
- The repository uses conventional prefixes such as
  `fix(frontend): endurecer interacoes da landing page`; match that style.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add component tests that exercise both controlled date inputs

Create `frontend/src/pages/Dashboard.test.jsx` using the structure in
`frontend/src/pages/Servicos.test.jsx`:

1. Hoist mocks for `listarAgendamentos`, `listarServicos`,
   `listarProfissionais`, and `buscarNegocio`.
2. Mock `useAuth` as an authenticated entrepreneur and `useTheme` as light
   mode. Mock `DashboardShell` only if its navigation behavior makes the test
   noisy; if mocked, render its `children` without changing production code.
3. Mock `chart.js/auto` with a constructible `Chart` whose instances expose
   `destroy()`. Do not install a canvas package.
4. In `beforeEach`, resolve the services to empty collections and clear all
   mocks.
5. Add exactly these two interactions:
   - Change the input labelled `Início` to `2026-07-01`; assert its value is
     `2026-07-01` and the existing `Fim` value is preserved.
   - Change the input labelled `Fim` to `2026-07-31`; assert its value is
     `2026-07-31` and the existing `Início` value is preserved.

Use Testing Library interaction APIs (`userEvent` or `fireEvent.change`) and
query by accessible label. Do not call the state updater directly and do not
use a snapshot: the regression only appears through the rendered event
handler.

Before the production fix, running the focused test is expected to fail with a
reference to missing `atualizarPeriodo` and/or an unchanged date value. This is
the deliberate red phase; do not commit it separately.

**Verify**: `npm.cmd test -- src/pages/Dashboard.test.jsx` from `frontend/` ->
exit is non-zero for the missing-handler regression, and the failure is in one
of the two new date-input tests rather than test setup.

### Step 2: Restore the minimal functional updater

In `frontend/src/pages/Dashboard.jsx`, add `atualizarPeriodo(campo, valor)`
between `handleLogout` and `gerarRelatorioPdf`, matching the historical shape
shown in "Current state". It must call the functional form of
`setPeriodoRelatorio` and spread the previous object before replacing the named
field.

Do not inline separate setters into the JSX, mutate the existing object, add
validation to the change handler, or alter the export functions. Their existing
submit-time validation already handles missing and reversed date ranges.

**Verify**: `rg -n "function atualizarPeriodo|atualizarPeriodo\(" src/pages/Dashboard.jsx` from `frontend/` -> exactly one function definition and
two call sites; then `npm.cmd test -- src/pages/Dashboard.test.jsx` -> exit 0,
1 file and 2 tests pass.

### Step 3: Run the full frontend verification gates

Run the suite and build without weakening tests or changing the Vite config.
Do not commit `frontend/dist/`; it is build output.

**Verify**:

1. `npm.cmd test` from `frontend/` -> exit 0, all test files pass.
2. `npm.cmd run build` from `frontend/` -> exit 0 and Vite reports a successful
   production build.
3. `git diff --check` from the repository root -> exit 0.

### Step 4: Reconcile the plan index and inspect scope

After all gates pass, change only plan 010's status in `plans/README.md` to
`DONE`, including the implementing commit SHA if the index convention records
it. Do not change other plan statuses.

**Verify**: `git status --short` from the repository root -> only
`frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Dashboard.test.jsx`, and
`plans/README.md` are listed. `git diff --stat` must show no generated files.

## Test plan

- Create `frontend/src/pages/Dashboard.test.jsx` with two interaction tests.
- Test 1 changes `Início` and proves `Fim` remains intact.
- Test 2 changes `Fim` and proves `Início` remains intact.
- Model service/context mocks after `frontend/src/pages/Servicos.test.jsx` and
  accessible queries after `frontend/src/components/DashboardShell.test.jsx`.
- Keep all service calls mocked and deterministic; no network, backend, current
  database, PDF generation, or filesystem write is part of these tests.
- Focused verification:
  `npm.cmd test -- src/pages/Dashboard.test.jsx` -> 1 file / 2 tests pass.
- Regression verification: `npm.cmd test` -> all existing and new tests pass.

## Done criteria

All must hold:

- [ ] `Dashboard.jsx` contains exactly one `atualizarPeriodo` definition using
      the functional `setPeriodoRelatorio((atual) => ...)` form.
- [ ] Both existing date inputs still use their original accessible Portuguese
      labels and update independently.
- [ ] `frontend/src/pages/Dashboard.test.jsx` exists with the two specified
      rendered interaction tests.
- [ ] `npm.cmd test -- src/pages/Dashboard.test.jsx` exits 0 with 2 tests.
- [ ] `npm.cmd test` exits 0 for the complete frontend suite.
- [ ] `npm.cmd run build` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No files outside the in-scope list are modified.
- [ ] Plan 010's `plans/README.md` row is `DONE`; no other row changed.

## STOP conditions

Stop and report; do not improvise if:

- The drift check reports a change to `Dashboard.jsx` or an existing
  `Dashboard.test.jsx`, and the state/control excerpts no longer match.
- `atualizarPeriodo` already exists at HEAD; report the independent fix and do
  not add a duplicate.
- The two date controls are no longer controlled by one object with `inicio`
  and `fim` fields.
- Rendering the dashboard test requires a production-code refactor, a canvas
  dependency, or any package change rather than local mocks.
- A focused test still fails twice after the updater matches the specified
  shape and the mocks match the four service calls.
- The fix appears to require changing report filtering, export code, CSS, or a
  file outside the in-scope list.
- Full tests or build expose an unrelated pre-existing failure; capture the
  exact command/output and report it instead of weakening a gate.

## Maintenance notes

- A static lint rule for undefined identifiers would have caught this before
  runtime; add that at repository level rather than expanding this bug fix.
- Reviewers should insist that the tests dispatch real DOM change interactions.
  A unit test of a copied object-spread helper would not guard the missing JSX
  handler.
- If the report period later moves into a reusable component, move these same
  preservation assertions with it; do not drop them during extraction.
- Dashboard decomposition, export-service extraction, and chart isolation are
  intentionally deferred because they increase this P1 fix's blast radius.

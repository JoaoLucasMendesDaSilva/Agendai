# Plan 012: Establish A Supported Runtime And Enforced CI Gates

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5020d22..HEAD -- .nvmrc .github/workflows/quality.yml README.md backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json frontend/eslint.config.js design-prototype/package.json design-prototype/package-lock.json design-prototype/.npmrc plans/009-sync-deployment-runtime-docs.md plans/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/010-restore-dashboard-report-period-controls.md`
- **Category**: dx
- **Planned at**: commit `5020d22`, 2026-07-10

## Why this matters

The repository currently has no automated pull-request gate, declares a Node
20-compatible range after Node 20 reached end of life on 2026-03-24, and lets
runtime metadata drift between manifests and lockfiles. The frontend also has
no static check capable of catching an undefined runtime handler such as the
Dashboard regression addressed by plan 010. Standardizing on Node 24 LTS,
adding a deliberately small ESLint baseline, and running each application in
GitHub Actions turns the existing tests and builds into enforced evidence
instead of optional local knowledge. The README must describe the same runtime,
database, and deploy procedure that the repository actually uses.

This plan supersedes `plans/009-sync-deployment-runtime-docs.md`. Plan 009 was
implemented in commit `8e1e106`, then commit `518e7ab` rewrote the README and
reintroduced stale setup and feature text; it should remain in the repository
as history, not be executed again.

## Current state

The executor starts from these verified facts:

- `backend/package.json` — backend scripts and declared runtime:

```json
backend/package.json:7-10
"scripts": {
  "dev": "node --watch src/server.js",
  "start": "node src/server.js",
  "test": "node --test"
}

backend/package.json:23-25
"engines": {
  "node": ">=20.19.0"
}
```

- `backend/package-lock.json` — its root package metadata still says
  `"node": ">=18"`, so the manifest and lockfile already disagree.
- `frontend/package.json` — has real test and build commands, but no lint
  command or ESLint dependencies:

```json
frontend/package.json:7-13
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}

frontend/package.json:32-34
"engines": {
  "node": ">=20.19.0"
}
```

- `frontend/package-lock.json:28-30` repeats the frontend root engine range.
- `design-prototype/package.json` — is a separate Vite application with
  `"build": "vite build"`, but has no `engines` field.
- `design-prototype/package-lock.json` — likewise has no root-package engine
  contract.
- There is no root `.nvmrc` and no `.github/workflows/` directory at commit
  `5020d22`.
- There is no root `package.json`, npm workspace, or monorepo task runner. Each
  of `backend/`, `frontend/`, and `design-prototype/` has an independent
  `package-lock.json`; preserve that topology.
- `design-prototype/.npmrc` is tracked and contains workstation-specific and
  policy-changing settings:

```ini
design-prototype/.npmrc:1-3
cache=C:\Users\jlmen\OneDrive\Documentos\Projetos\tcc-agendamento\design-prototype\.npm-cache
fund=false
audit=false
```

  The adjacent `design-prototype/.gitignore` already ignores `.npm-cache/`, so
  deleting the tracked `.npmrc` does not require a new ignore rule.
- The frontend tests import their Vitest APIs explicitly (for example
  `frontend/src/pages/Login.test.jsx`), and `frontend/test/setup.js` imports
  `vi`; the ESLint configuration does not need implicit test globals.
- Plan 010 fixes the known undefined `atualizarPeriodo` callback in
  `frontend/src/pages/Dashboard.jsx`. This plan depends on it because the new
  `no-undef` gate is expected to reject that pre-fix state.
- `README.md` currently contradicts live configuration:
  - line 257 says only “Node.js” and gives no supported major;
  - lines 280 and 284 show `PORT=3000` and `DB_NAME=agendai`, while the tracked
    root `.env.example` uses `PORT=3001` and `DB_NAME=tcc_agendamento`;
  - line 291 refers to a generic `migrations` folder instead of the actual
    `backend/database/migrations/` path and omits the required ordered files;
  - line 319 points the frontend at `http://localhost:3000`, while
    `frontend/.env.example` uses `http://localhost:3001`;
  - line 379 lists automated tests as future work even though backend Node
    tests and frontend Vitest suites exist.
- `backend/src/app.js` and `backend/src/config/database.js` load the backend
  environment from the repository-root `.env`, not `backend/.env`.
- The three current migration files, in required order, are:
  `001_create_schema.sql`, `002_add_business_branding.sql`, and
  `003_add_public_appointment_token.sql` under
  `backend/database/migrations/`. Until plan 013 introduces an automated
  runner, README instructions must describe them as a manual ordered step.
- The repo names Vercel for the frontend and Railway for the backend, but it
  contains no Railway service configuration. Documentation must distinguish
  repository requirements from deployment state that can only be verified in
  those provider dashboards.
- Runtime references:
  - Node.js release status: <https://nodejs.org/en/about/previous-releases>
  - Node.js EOL dates: <https://nodejs.org/en/about/eol>
  - Vercel Node.js versions: <https://vercel.com/docs/functions/runtimes/node-js/node-js-versions>

## Commands you will need

Run commands from the repository root unless the command explicitly changes
directory. On Windows PowerShell, use `npm.cmd`; GitHub Actions uses `npm`.

| Purpose | Command | Expected on success |
|---|---|---|
| Confirm runtime | `node --version` | output begins with `v24.` |
| Install backend | `cd backend; npm.cmd ci; cd ..` | exit 0; lockfile unchanged |
| Backend tests | `cd backend; npm.cmd test; cd ..` | exit 0; all existing tests pass |
| Install frontend | `cd frontend; npm.cmd ci; cd ..` | exit 0 |
| Frontend lint | `cd frontend; npm.cmd run lint; cd ..` | exit 0; zero errors |
| Frontend tests | `cd frontend; npm.cmd test; cd ..` | exit 0; all existing tests pass |
| Frontend build | `cd frontend; npm.cmd run build; cd ..` | exit 0 |
| Install prototype | `cd design-prototype; npm.cmd ci; cd ..` | exit 0; lockfile unchanged after metadata refresh |
| Prototype build | `cd design-prototype; npm.cmd run build; cd ..` | exit 0 |
| Workflow structure | `rg -n "backend-tests|frontend-quality|prototype-build|node-version-file|npm ci" .github/workflows/quality.yml` | all three jobs and their Node/install gates are present |
| Whitespace | `git diff --check` | exit 0 |

GitHub Actions' own workflow parser and first pull-request run are the
authoritative workflow-syntax and execution verification after push. A parse
error or failed job is a STOP condition, not permission to disable a job.

## Suggested executor toolkit

- Use the repository's `pre-commit-checklist` skill before committing, if it
  is available, to verify scope, generated lockfile changes, tests, and docs.
- Use the `deployment-readiness` skill to review the README deployment section
  without claiming provider state that was not actually inspected.
- Use `vercel:react-best-practices` only if resolving a real React Hooks lint
  error requires changing component code. Do not refactor components merely to
  satisfy stylistic preferences.

## Scope

**In scope** (the only files you should modify):

- `.nvmrc` (create)
- `.github/workflows/quality.yml` (create)
- `README.md`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/eslint.config.js` (create)
- `design-prototype/package.json`
- `design-prototype/package-lock.json`
- `design-prototype/.npmrc` (delete)
- `plans/009-sync-deployment-runtime-docs.md`
- `plans/README.md`

**Out of scope** (do NOT touch):

- Creating a root `package.json`, npm workspaces, Turborepo, Nx, or another
  root task orchestrator. Three explicit CI jobs are sufficient here.
- Upgrading application libraries, Vite, React, Express, or test frameworks.
- Broad dependency refreshes unrelated to Node metadata or the four frontend
  lint packages.
- Changing application behavior or fixing lint violations in source files. If
  the minimal rules expose a source violation after plan 010 is complete, STOP
  and report the exact file, line, rule, and message so it can receive a
  focused correction plan.
- Adding backend or prototype linting; this plan establishes the smallest
  useful frontend gate first.
- Implementing a migration runner or changing SQL; plan 013 owns that work.
- Editing `.env`, adding secret values, or accessing deployment credentials.
- Changing Vercel/Railway resources, redeploying, or asserting that production
  already runs Node 24 without provider evidence.
- Removing the `design-prototype/` application. It remains a buildable design
  reference and therefore receives the same runtime contract and CI build.

## Git workflow

- Branch: `codex/012-supported-runtime-ci`
- Commit by logical unit. Recommended messages:
  1. `chore: standardize Node 24 runtime`
  2. `test: add frontend lint and CI gates`
  3. `docs: restore runtime and deployment guidance`
- Recent repository history uses conventional prefixes such as
  `fix(frontend): ...`, `perf(frontend): ...`, and `docs: ...`; match that
  style.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm plan 010 and the Node 24 execution environment

Run the drift check exactly as written at the top. Then confirm that plan 010
is marked `DONE` in `plans/README.md` and that
`frontend/src/pages/Dashboard.jsx` no longer invokes an undefined
`atualizarPeriodo` symbol.

Switch the local shell to Node 24 using the operator's version manager before
installing packages. Do not regenerate lockfiles under Node 20 or a different
major and assume they represent the target environment.

**Verify**:

```powershell
node --version
rg -n "atualizarPeriodo|alterarPeriodoRelatorio|setPeriodoRelatorio" frontend/src/pages/Dashboard.jsx
rg -n "\| 010 .*DONE" plans/README.md
```

Expected: Node output begins with `v24.`; the Dashboard search shows a defined
period-change handler (or direct controlled setters) for both date controls;
plan 010 is `DONE`. If any condition differs, STOP.

### Step 2: Establish one Node 24 contract across the repository

Create root `.nvmrc` containing exactly:

```text
24
```

Set the root package `engines.node` value in all three application manifests
to the bounded major range:

```json
"engines": {
  "node": ">=24 <25"
}
```

For `backend/package.json` and `frontend/package.json`, replace the existing
range. Add the same field to `design-prototype/package.json`. Refresh only the
root-package metadata in each lockfile by running `npm.cmd install
--package-lock-only --ignore-scripts` from that package directory under Node
24. Do not hand-edit transitive package engine declarations: they describe the
dependencies, not Agendai's supported runtime.

Inspect every lockfile diff. Expected changes at this point are only the root
`packages[""]` engine value. If npm changes resolved dependency versions,
integrities, or unrelated metadata, restore the lockfile and STOP with the
diff; do not accept incidental upgrades.

Delete `design-prototype/.npmrc`. Its absolute local cache path is not portable,
and repository policy must not silently disable npm audit. Keep
`design-prototype/.gitignore` unchanged because it already ignores
`.npm-cache/`.

**Verify**:

```powershell
node --version
Get-Content .nvmrc
node -e "for (const p of ['backend','frontend','design-prototype']) { const manifest=require('./'+p+'/package.json'); const lock=require('./'+p+'/package-lock.json'); if (manifest.engines?.node !== '>=24 <25' || lock.packages[''].engines?.node !== '>=24 <25') throw new Error(p+' runtime drift'); } console.log('runtime metadata aligned')"
Test-Path design-prototype/.npmrc
git diff -- backend/package-lock.json frontend/package-lock.json design-prototype/package-lock.json
```

Expected: Node begins with `v24.`; `.nvmrc` prints `24`; the Node check prints
`runtime metadata aligned`; `Test-Path` prints `False`; each lockfile diff is
limited to its root engine metadata.

### Step 3: Add a narrow frontend ESLint baseline

From `frontend/`, install only these development dependencies:

```powershell
npm.cmd install --save-dev eslint globals eslint-plugin-react-hooks eslint-plugin-react-refresh
```

This command must update `frontend/package.json` and
`frontend/package-lock.json`; it must not upgrade existing application or test
dependencies. Add this script to `frontend/package.json`:

```json
"lint": "eslint src test public/*.js *.config.js"
```

Create `frontend/eslint.config.js` using ESLint's flat-config format. It must:

- ignore `dist/` and `node_modules/`;
- parse modern ESM and JSX;
- apply browser globals to `src/**/*.{js,jsx}` and `test/**/*.js`;
- apply service-worker globals to `public/*.js`;
- apply Node globals to `*.config.js`;
- load `eslint-plugin-react-hooks`;
- set `no-undef` to `error` explicitly;
- set `react-hooks/rules-of-hooks` to `error`;
- set `react-hooks/exhaustive-deps` to `warn` for the first baseline;
- set `react-refresh/only-export-components` to `warn` for JSX application
  files, allowing constant exports;
- avoid enabling broad style rules or `no-unused-vars` in this first gate.

Use this target shape (adapt only import syntax required by the installed
packages, not the rule severity):

```js
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const baseRules = {
  'no-undef': 'error',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
};

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.{js,jsx}', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: baseRules,
  },
  {
    files: ['src/**/*.jsx'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['public/*.js'],
    languageOptions: { globals: globals.serviceworker },
    rules: { 'no-undef': 'error' },
  },
  {
    files: ['*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: { 'no-undef': 'error' },
  },
];
```

Run lint once. Warnings are visible debt but do not fail this initial gate;
errors must be zero. Do not suppress a `no-undef` or Rules-of-Hooks error with
an inline disable. Because source changes are outside this plan, any error is a
STOP condition with the full lint output attached.

**Verify**:

```powershell
cd frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
cd ..
```

Expected: all three commands exit 0; lint reports zero errors; all existing
Vitest tests pass; Vite produces the production build.

### Step 4: Add three independent GitHub Actions quality jobs

Create `.github/workflows/quality.yml`, triggered on `pull_request` and pushes
to `main`. Give the workflow read-only repository permissions:

```yaml
permissions:
  contents: read
```

Define exactly three Ubuntu jobs, each using `actions/checkout@v4` and
`actions/setup-node@v4` with `node-version-file: .nvmrc` and npm caching:

1. `backend-tests`
   - `cache-dependency-path: backend/package-lock.json`
   - `working-directory: backend` for run steps
   - `npm ci`
   - `npm test`
2. `frontend-quality`
   - `cache-dependency-path: frontend/package-lock.json`
   - `working-directory: frontend`
   - `npm ci`
   - `npm run lint`
   - `npm test`
   - `npm run build`
3. `prototype-build`
   - `cache-dependency-path: design-prototype/package-lock.json`
   - `working-directory: design-prototype`
   - `npm ci`
   - `npm run build`

Set `timeout-minutes: 10` on each job. Do not pass secrets or production
environment variables: the current backend unit tests do not require a live
database, and frontend/prototype builds must succeed from tracked defaults.
Plan 013 will add a separate disposable-MySQL integration gate.

Do not collapse the jobs into a root script, add a matrix, or introduce a root
workspace. Separate jobs make the failing application obvious and match the
three independent lockfiles.

**Verify**:

```powershell
rg -n "pull_request|push:|contents: read|backend-tests|frontend-quality|prototype-build|node-version-file|npm ci|npm run lint|npm test|npm run build" .github/workflows/quality.yml
```

Expected locally: the search shows all three jobs, triggers, permissions, and
gates. After push, GitHub Actions accepts the workflow and the first
pull-request run completes all three jobs successfully; that remote result is
the authoritative parse and execution check before merge.

### Step 5: Restore accurate runtime, migration, test, and deployment docs

Update `README.md` in Portuguese, preserving its intended non-technical
audience. Correct facts rather than appending a second contradictory setup
section. At minimum:

1. State **Node.js 24 LTS** in prerequisites and mention `.nvmrc`.
2. Explain that the backend reads the repository-root `.env`; direct the user
   to copy `.env.example` there. Use the tracked defaults `PORT=3001`,
   `DB_PORT=3306`, `DB_NAME=tcc_agendamento`, and
   `CORS_ORIGIN=http://localhost:5173`. Never include a real secret.
3. Keep the frontend's optional local override in `frontend/.env`, copied from
   `frontend/.env.example`, with `VITE_API_URL=http://localhost:3001`.
4. Correct the tree from `backend/migrations/` to
   `backend/database/migrations/`.
5. Document the manual migration order until plan 013 lands:
   `001_create_schema.sql`, `002_add_business_branding.sql`, then
   `003_add_public_appointment_token.sql`. State that running an already
   applied migration may fail because no migration history runner exists yet;
   operators must inspect the target schema and back it up rather than blindly
   replaying SQL.
6. Add the real verification commands, each from its package directory:
   backend `npm test`; frontend `npm run lint`, `npm test`, and
   `npm run build`; prototype `npm run build`.
7. Remove automated tests from the “future improvements” list. Describe what
   exists without inventing coverage percentages or production test results.
8. In the deploy section, distinguish checked-in configuration from external
   state. Document Node 24 for both providers, Vercel frontend build settings,
   Railway backend start command, required environment variable names, explicit
   CORS origins, ordered migrations, and the need for durable object storage or
   a persistent volume for uploads. Do not claim the current provider settings
   were verified unless the executor actually inspected them.
9. Reconcile the public appointment-management wording restored by plan 009:
   the token link can view limited details and manage supported active states;
   do not list public cancel/reschedule as missing.
10. Link the Node release/EOL page and Vercel runtime page listed in “Current
    state” so future maintainers can recheck the chosen major.

The README should remain a practical product/TCC guide. Do not turn it into a
provider-specific operations manual; link to detailed docs if such a file is
added in a later plan.

**Verify**:

```powershell
rg -n "Node.js 24|\.nvmrc|PORT=3001|DB_PORT=3306|DB_NAME=tcc_agendamento|CORS_ORIGIN=http://localhost:5173|VITE_API_URL=http://localhost:3001" README.md
rg -n "backend/database/migrations|001_create_schema|002_add_business_branding|003_add_public_appointment_token|token_publico_hash" README.md
rg -n "npm (run lint|test|run build)|Vercel|Railway|UPLOAD_DIR|volume|armazenamento" README.md
rg -n "PORT=3000|DB_NAME=agendai|VITE_API_URL=http://localhost:3000|backend/migrations" README.md
```

Expected: the first three searches show the corrected runtime, configuration,
migrations, verification, and deployment notes. The last search returns no
matches.

### Step 6: Run every gate from clean installs and reconcile plan history

Delete only generated `node_modules/` and `dist/` directories if a clean-install
check is needed; never delete tracked files. Run `npm ci` and the gates in all
three package directories under Node 24. Confirm `npm ci` does not rewrite any
lockfile.

Ensure `plans/009-sync-deployment-runtime-docs.md` begins with its
`STALE / SUPERSEDED` warning and retains the old plan body. Update only plan
012's status row in `plans/README.md` to `DONE`; keep plan 009 marked as stale
or superseded rather than presenting it as pending work.

Finally inspect scope and whitespace. The pre-existing user modification in
`.codex/config.toml`, if still present, is unrelated and must not be staged or
altered.

**Verify**:

```powershell
node --version
cd backend; npm.cmd ci; npm.cmd test; cd ..
cd frontend; npm.cmd ci; npm.cmd run lint; npm.cmd test; npm.cmd run build; cd ..
cd design-prototype; npm.cmd ci; npm.cmd run build; cd ..
git diff --check
git status --short
git diff --name-only 5020d22..HEAD
```

Expected: Node begins with `v24.`; every install and gate exits 0; whitespace
check exits 0; only the files in this plan's in-scope list are changed by the
implementation. An unrelated pre-existing `.codex/config.toml` modification
may still appear in `git status`, but it must not appear in this plan's commit.

## Test plan

No new application behavior test is required. This plan makes existing checks
repeatable and adds static and CI verification:

- Backend: run all tests under `backend/test/` with `npm test` after a clean
  `npm ci` on Node 24.
- Frontend: run the full Vitest suite under `frontend/src/**/*.test.*` after a
  clean `npm ci`; run the new lint gate and production Vite build in the same
  Node 24 environment.
- Prototype: run a clean install and production Vite build.
- Static regression: the ESLint fixture is the real frontend. In particular,
  plan 010's fixed Dashboard must pass `no-undef`; reintroducing an undefined
  event handler must cause `npm run lint` to exit nonzero.
- CI: open or update a pull request and require all three jobs from
  `.github/workflows/quality.yml` to finish successfully before merge.
- Documentation: run the four README `rg` commands in step 5; the stale values
  search must return no matches.
- Lockfiles: run `npm ci` in each package and then `git diff --exit-code --
  backend/package-lock.json frontend/package-lock.json
  design-prototype/package-lock.json`; expected exit 0 after intended changes
  are staged or committed.

## Done criteria

Machine-checkable; ALL must hold:

- [ ] `node --version` begins with `v24.` and root `.nvmrc` contains `24`.
- [ ] All three manifests and root lockfile package entries declare
  `"node": ">=24 <25"`.
- [ ] `design-prototype/.npmrc` is deleted; no tracked absolute workstation
  cache path or `audit=false` remains.
- [ ] `frontend/eslint.config.js` exists and explicitly enforces `no-undef` and
  `react-hooks/rules-of-hooks` as errors.
- [ ] `cd frontend; npm.cmd run lint` exits 0 with zero errors.
- [ ] `.github/workflows/quality.yml` defines `backend-tests`,
  `frontend-quality`, and `prototype-build` with Node 24 via `.nvmrc`.
- [ ] Backend `npm.cmd test` exits 0 after `npm.cmd ci`.
- [ ] Frontend lint, tests, and build exit 0 after `npm.cmd ci`.
- [ ] Prototype build exits 0 after `npm.cmd ci`.
- [ ] The first pull-request workflow run completes all three jobs successfully.
- [ ] README uses the tracked ports, database name, root `.env` location, all
  three ordered migrations, current test commands, and cautious deploy wording.
- [ ] README contains none of `PORT=3000`, `DB_NAME=agendai`,
  `VITE_API_URL=http://localhost:3000`, or `backend/migrations`.
- [ ] Plan 009 retains its history and is visibly marked stale/superseded by
  plan 012.
- [ ] No root package manifest, workspace, or task runner is introduced.
- [ ] `git diff --check` exits 0.
- [ ] No files outside the in-scope list are included in the implementation
  commit; the pre-existing `.codex/config.toml` change remains untouched.
- [ ] `plans/README.md` status row for plan 012 is updated.

## STOP conditions

Stop and report back; do not improvise if:

- Any in-scope file changed after commit `5020d22` and no longer matches the
  current-state facts above.
- Plan 010 is not complete or the Dashboard still contains an undefined period
  handler; do not weaken `no-undef` to accommodate it.
- Node 24 cannot install the existing locked dependencies, run bcrypt, execute
  the tests, or build either Vite application.
- Vercel or Railway is proven not to support the selected Node 24 runtime. Give
  the provider evidence; do not silently choose a different major.
- Regenerating a lockfile changes unrelated dependency versions, tarball URLs,
  or integrity hashes.
- ESLint reports a source error. Report the exact path, line, rule, and message;
  do not add inline disables or expand this plan into an application refactor.
- Adding the lint dependencies requires upgrading Vite, React, Vitest, or other
  existing application dependencies.
- Backend tests require real production credentials or a live shared database.
- The workflow needs repository secrets to run the current unit tests/builds.
- GitHub Actions rejects the YAML or any job fails twice after one reasonable
  workflow-only correction.
- README facts cannot be reconciled from tracked code and examples without
  accessing unapproved provider settings or secrets.
- Completion appears to require a root workspace, a migration runner, source
  behavior changes, or any other out-of-scope file.

## Maintenance notes

- Node major upgrades are now a coordinated change: update `.nvmrc`, all three
  manifests, all three lockfile root entries, CI, README, and provider runtime
  settings in one reviewed pull request.
- Recheck Node's release page before Node 24 leaves Maintenance LTS; do not let
  an unbounded `>=24` range silently select Node 25+.
- Keep the initial ESLint baseline narrow. Promote
  `react-hooks/exhaustive-deps` from warning only after existing warnings have
  focused tests and fixes; do not mass-disable the rule.
- Reviewers should scrutinize lockfile diffs, workflow permissions, the absence
  of secrets, and whether README deploy claims have direct evidence.
- Plan 013 should add migration tracking and disposable MySQL integration tests
  as a separate job or workflow; it must not weaken these three fast gates.
- The prototype remains independent intentionally. If it is later archived or
  removed, delete its CI job and runtime metadata in the same change.
- A later deployment-readiness pass should verify Node 24 and upload persistence
  in the actual Vercel/Railway dashboards; checked-in files alone cannot prove
  the live configuration.

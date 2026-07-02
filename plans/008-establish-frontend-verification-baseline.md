# Plan 008: Establish Frontend Verification Baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8e1e106..HEAD -- frontend/package.json frontend/package-lock.json frontend/src frontend/test frontend/vitest.config.*`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `8e1e106`, 2026-06-26
- **Disposition**: DONE in commit `7692321` on 2026-07-02; reviewer
  independently verified 5 test files / 9 tests, the production build, clean
  whitespace, and frontend-only scope.

## Why this matters

The backend now has a small test baseline, but the frontend still relies on
manual testing and `vite build`. The most important user flows are frontend
heavy: public booking, admin agenda refresh, business form validation, exports,
and auth routing. Before splitting large CSS/page files or lazy-loading routes,
the project needs a cheap frontend test command that a future executor can run
without a browser session.

## Current state

- `frontend/package.json` has no test or lint script:

```json
frontend/package.json:7
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
},
```

- Current frontend dependencies include React/Vite but no test tooling:

```json
frontend/package.json:21
"devDependencies": {
  "@vitejs/plugin-react": "^6.0.2",
  "vite": "^8.0.16"
}
```

- `README.md` already acknowledges automated tests are incomplete:

```md
README.md:584
- Não possui testes automatizados completos.
```

- Plan 006 has landed. `frontend/src/pages/Negocio.jsx` now blocks save when
  no operating day is selected:

```js
frontend/src/pages/Negocio.jsx:274
if (
  !Array.isArray(form.dias_funcionamento) ||
  form.dias_funcionamento.length === 0
) {
  setErro('Selecione ao menos um dia de funcionamento.');
  return;
}
```

- Frontend code is plain React JavaScript, CSS imported from
  `frontend/src/App.jsx`, and service functions live under
  `frontend/src/services/*Service.js`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install frontend deps | `npm.cmd install` from `frontend/` | exit 0, lockfile updated |
| Frontend tests | `npm.cmd test` from `frontend/` | exit 0, all tests pass |
| Frontend build | `npm.cmd run build` from `frontend/` | exit 0 |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vitest.config.js` or equivalent minimal config
- `frontend/src/**/*.test.jsx` or `frontend/test/**`
- Minimal exports of pure helper functions from pages only when needed for tests

**Out of scope**:
- Large UI refactors
- CSS decomposition
- Replacing the custom router
- Introducing TypeScript
- E2E/browser automation
- Backend files

## Git workflow

- Branch suggestion: `codex/008-frontend-verification-baseline`
- Suggested commit message: `test(frontend): add verification baseline`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the smallest React test toolchain

Install Vitest and React Testing Library packages that match Vite/React:

- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Do not add a formatter/linter in this plan unless the operator explicitly asks;
keep the baseline narrow.

**Verify**: `npm.cmd test` from `frontend/` -> exits 0 or reports no tests only
before test files are added.

### Step 2: Test pure date/customer helpers without rendering heavy pages

Start with small helper tests around behavior that already exists:

- Dashboard period filtering for inclusive start/end dates.
- Client grouping by phone, then e-mail, then normalized name.
- Public booking formatting helpers for day/date display.

If a helper is currently private inside a page, prefer extracting it to a small
nearby module such as `frontend/src/pages/dashboardUtils.js` only when that
reduces coupling. Do not export every helper from a page by default.

**Verify**: `npm.cmd test` from `frontend/` -> helper tests pass.

### Step 3: Add one component interaction test for public booking selection

Add a small rendering test for the public booking flow or a carved-out child
component if the full page is too coupled to API calls. Cover selected-state
behavior for service/professional/time controls.

Mock service modules; do not hit the real backend.

**Verify**: `npm.cmd test` from `frontend/` -> component test passes.

### Step 4: Add one regression test for business-day validation from plan 006

Plan 006 has landed. Add a real test that the business form cannot submit with
no selected operating days. Do not leave this as `test.todo`.

**Verify**: `npm.cmd test` from `frontend/` -> exits 0.

### Step 5: Keep build verification in place

Run the existing production build after tests. Do not commit `dist/`.

**Verify**: `npm.cmd run build` from `frontend/` -> exits 0.

## Test plan

- New frontend tests must run without network or a live backend.
- Prefer small helper/component tests over snapshot tests.
- Tests should use Portuguese labels/text that users actually see only when the
  text is part of the behavior under test.
- Keep the first baseline under roughly 8-12 tests.

## Done criteria

- [ ] `frontend/package.json` has a `test` script.
- [ ] `npm.cmd test` from `frontend/` exits 0.
- [ ] At least one helper test and one component interaction test exist.
- [ ] `npm.cmd run build` from `frontend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No backend files are modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The current Vite/React versions cannot support Vitest cleanly without a
  broader dependency migration.
- Testing a page requires large production-code rewrites.
- A dependency install changes unrelated packages in a surprising way.
- The test baseline starts drifting into visual redesign work.

## Maintenance notes

After this baseline lands, execute CSS decomposition, route lazy loading, and
selected-control accessibility changes with frontend tests running in every PR.
Do not let future frontend plans rely only on manual browser checks.

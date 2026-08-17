# Plan 020: Remediate Known npm Security Advisories

> **Executor instructions**: Apply only compatible, evidence-backed dependency
> patches. Start from clean lockfile installs, inspect every lockfile delta, and
> run every application gate. Never use `npm audit fix --force`. Stop if the
> fix requires a major upgrade or unrelated dependency churn. Mark only this
> plan's index row `DONE` after local and remote verification.
>
> **Drift check (run first)**:
> `git diff --stat f7e455b..HEAD -- backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json design-prototype/package.json design-prototype/package-lock.json .github/workflows/quality.yml`
> Rerun online audits because advisory data changes. Reconcile exact installed,
> locked, wanted, and patched versions before editing.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**:
  `plans/012-establish-supported-runtime-and-ci-gates.md`
- **Category**: dependency
- **Planned at**: commit `f7e455b`, 2026-08-17

## Why this matters

The first successful online audit after the PostgreSQL reconciliation found
known vulnerabilities in all three npm trees. The highest findings affect the
design prototype's Vite development/build toolchain on Windows, which is the
active contributor platform. Compatible patched releases exist; leaving exact
vulnerable locks provides no maintenance benefit.

## Current evidence

Run on 2026-08-17 with `npm audit --audit-level=high --omit=dev`:

- Backend lock: `body-parser` 1.20.5, low advisory
  `GHSA-v422-hmwv-36x6`; 1.20.6 is patched and allowed by Express's range.
- Frontend lock: `dompurify` 3.4.11, moderate advisories
  `GHSA-c2j3-45gr-mqc4` and `GHSA-55q2-fjhq-7xh7`; 3.4.13 is patched and
  allowed by jsPDF's range.
- Prototype manifest/lock: Vite 6.4.2, high advisory
  `GHSA-fx2h-pf6j-xcff` plus `GHSA-v6wh-96g9-6wx3`; Vite 6.4.3 is the patched
  6.x release.
- Prototype lock: PostCSS 8.5.16 and nanoid 3.3.15 have high advisories;
  8.5.26 and 3.3.18 respectively are compatible patched transitive releases.

Audit severity describes the package advisory, not proof of exploitation in
Agendai. The prototype binds its dev server to loopback, which reduces exposure
but does not justify retaining a vulnerable Windows toolchain.

## Scope

**In scope**:

- `backend/package-lock.json`
- `frontend/package-lock.json`
- `design-prototype/package.json`
- `design-prototype/package-lock.json`
- `plans/README.md` (status row only)

Modify `backend/package.json` or `frontend/package.json` only if a direct
dependency must be declared to obtain the smallest patched version; prefer the
existing transitive semver ranges and lock-only updates.

**Out of scope**:

- Major upgrades of Express, React, Vite, jsPDF, ESLint, or Vitest.
- `npm audit fix --force`, broad `npm update`, package-manager changes, or a root
  workspace.
- Adding overrides without first proving the parent semver range cannot select
  a patched version.
- Source/UI/API behavior changes.
- Dismissing an advisory solely because it affects development tooling.
- Committing `node_modules`, build output, npm cache/logs, or root untracked
  package files.

## Git workflow

- Branch: `codex/020-npm-security-patches`
- Suggested commit: `chore(deps): apply compatible security patches`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Reproduce from lockfiles and capture the current tree

For each of `backend/`, `frontend/`, and `design-prototype/`:

1. Run `npm.cmd ci` on Node 24.
2. Run `npm.cmd ls` for the affected packages.
3. Run online `npm.cmd audit --omit=dev --json` and preserve only advisory IDs,
   package names, severity, affected path, and patched range in the work log;
   never commit registry tokens, cache logs, or machine paths.

If audit data no longer matches the evidence above, use the current registry
result and official upstream advisory as authority. Do not update unrelated
packages merely because newer versions exist.

**Verify**: every affected version is reproducible from the committed lock,
not only from a previously mutated `node_modules` tree.

### Step 2: Update the backend lock only to body-parser 1.20.6+

From `backend/`, use npm's lock-aware update for `body-parser` without adding it
as a direct dependency. Express's existing `~1.20.5` range admits 1.20.6.

Inspect the lock diff. It should change only body-parser's resolved version,
integrity, and metadata required by npm. If Express or any unrelated package
changes, restore the lock from a fresh checkout and use a more targeted
package-lock-only command; do not hand-edit integrity hashes.

**Verify**: clean `npm ci`, `npm ls body-parser`, backend 61+ tests, and online
audit show no backend advisory at or above low severity.

### Step 3: Update the frontend lock only to DOMPurify 3.4.13+

From `frontend/`, update the transitive `dompurify` selected through jsPDF's
existing compatible range. Do not add DOMPurify as a direct dependency unless
the live dependency graph proves that is necessary.

Inspect the lock diff. No Vite, React, test framework, or unrelated production
dependency should move.

**Verify**: clean `npm ci`, `npm ls dompurify`, lint, 35+ tests, production
build, and online audit show no frontend advisory at or above low severity.

### Step 4: Patch the prototype toolchain within Vite 6

Change the prototype's exact direct Vite version from 6.4.2 to 6.4.3. Regenerate
its lockfile with npm so the compatible PostCSS and nanoid selections reach at
least 8.5.26 and 3.3.18. Keep `@vitejs/plugin-react` on its compatible current
major unless npm reports an actual peer conflict.

Inspect all lockfile changes. Allow only Vite and the transitive packages needed
by its security patch. Do not jump to Vite 7/8 or use `--force`.

**Verify**:

- clean `npm ci`;
- `npm ls vite postcss nanoid` shows patched versions and no invalid peer;
- prototype build passes normally in GitHub CI;
- local managed Windows build passes with `--configLoader runner` if the normal
  loader cannot traverse the protected workspace parent;
- online audit shows no prototype advisory at or above low severity.

### Step 5: Run all repository gates and inspect reproducibility

Run:

- backend tests;
- frontend lint, tests, and build;
- prototype build;
- `npm audit --audit-level=low --omit=dev` in all three packages;
- `git diff --check` on attributed scoped files;
- all GitHub Actions jobs.

Confirm `npm ci` makes no lock changes and `git diff --name-only` contains only
the scoped manifest/lockfiles plus the plan status. Document the two existing
Fast Refresh warnings separately; they are not dependency failures.

Use `pre-commit-checklist` and security review. Mark plan 020 `DONE` only after
remote CI is green and all three online audits exit 0 at low threshold.

## Done criteria

- [ ] Backend locks body-parser 1.20.6 or a later compatible patched version.
- [ ] Frontend locks DOMPurify 3.4.13 or a later compatible patched version.
- [ ] Prototype directly pins Vite 6.4.3 and locks patched PostCSS/nanoid.
- [ ] No major dependency, source file, API, or UI behavior changed.
- [ ] Fresh `npm ci` succeeds in all three packages without lock drift.
- [ ] Backend tests, frontend lint/tests/build, and prototype build pass.
- [ ] All three online production-tree audits exit 0 at `--audit-level=low`.
- [ ] GitHub quality jobs pass with the new locks.
- [ ] Scoped `git diff --check` exits 0 and unrelated worktree files remain
      untouched.
- [ ] `plans/README.md` marks plan 020 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Current advisory or patched ranges differ materially from the evidence above.
- A fix requires a major version, `--force`, override, or peer-dependency bypass.
- A targeted command changes unrelated direct dependencies or causes broad
  unexplained lockfile churn.
- Clean `npm ci` cannot reproduce the patched graph.
- Tests/build reveal a behavioral regression.
- Registry access is unavailable for final audit verification.
- Remote CI is unavailable or unauthorized; leave the plan blocked awaiting
  CI rather than claiming completion.

## Maintenance notes

- Keep direct tool versions intentional, but refresh exact pins promptly for
  security patches.
- Add automated dependency update review only after defining ownership,
  grouping, test gates, and merge policy.
- Audit all three lockfiles regularly; a green build does not prove the
  dependency graph is safe.
- Never fix lockfile advisories by deleting tests/dev tooling or omitting a
  vulnerable package from the install without understanding its use.

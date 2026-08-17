# Plan 018: Enforce Durable Business Identity On PostgreSQL

> **Executor instructions**: Follow this plan step by step. Add failing tests
> before service changes, use only the plan 016 runner/harness, and never repair
> duplicate production data automatically. Stop on every STOP condition. Mark
> only this plan's row `DONE` after all local and remote evidence is green.
>
> **Drift check (run first)**:
> `git diff --stat f7e455b..HEAD -- backend/database/postgres-migrations backend/src/database/migrationRunner.js backend/src/services/negocioService.js backend/test/negocioService.test.js backend/test/integration README.md MIGRACAO.md docs`
> Confirm plans 015 and 016 are complete, migration 004 is the latest numbered
> migration, and the live constraint/error names match this plan.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**:
  `plans/016-automate-postgresql-migrations-and-integration-verification.md`
- **Category**: migration
- **Planned at**: commit `f7e455b`, 2026-08-17
- **Replaces**: `plans/014-enforce-durable-business-identity.md`

## Why this matters

The product and authorization model assume one business per entrepreneur, but
PostgreSQL has only a non-unique index on `negocios.usuario_id`. Concurrent
creates can therefore produce two tenant roots. Public slug allocation also
uses check-then-insert, so same-name races can surface as internal errors.
Finally, renaming a business regenerates its public slug and silently breaks
shared booking links and QR codes.

The database must own uniqueness, expected races must return stable `409`
responses, and an existing public address must remain durable.

## Current state

- `backend/database/postgres-migrations/001_create_schema.sql` defines unique
  `uk_negocios_slug_publico` but only non-unique
  `idx_negocios_usuario_id`.
- `criarNegocio` first checks the owner, calls `gerarSlugPublico` to query for a
  free candidate, then inserts. Neither preselection is concurrency-safe.
- `atualizarNegocio` derives and writes a new `slug_publico` whenever `nome`
  changes.
- The service has no PostgreSQL `23505`/constraint-name classification.
- Plan 016 supplies transactional migrations, exact checksums, structural
  baselining, and a guarded real PostgreSQL harness. Do not create another
  runner or manual migration path.

## Commands you will need

From `backend/`:

- `npm.cmd test`
- guarded `npm.cmd run test:integration`
- guarded migration run against a disposable local database:
  `npm.cmd run db:migrate`
- `npm.cmd audit --audit-level=high --omit=dev`

From root: `git diff --check`. GitHub's `backend-tests` and
`postgres-integration` jobs must pass.

## Scope

**In scope**:

- `backend/database/postgres-migrations/005_enforce_business_identity.sql`
  (create)
- `backend/src/database/migrationRunner.js` (migration 005 baseline signature)
- `backend/test/migrationRunner.test.js`
- `backend/src/services/negocioService.js`
- `backend/test/negocioService.test.js`
- `backend/test/integration/businessIdentity.integration.test.js` (create)
- `README.md`
- `MIGRACAO.md`
- `docs/POSTGRES-SUPABASE.md`
- `plans/README.md` (status row only)

**Out of scope**:

- Choosing, merging, deleting, or reassigning duplicate business rows.
- Multiple businesses per user, business switching, roles, or permission
  redesign.
- Editing migrations 001-004 or migration history/checksums.
- Changing public route paths, response shapes, or existing slugs.
- User-editable slugs, redirects, or slug-history tables.
- Frontend changes or deployment/provider mutations.
- Parsing PostgreSQL message text or exposing constraint/database details.

## Git workflow

- Branch: `codex/018-postgresql-business-identity`
- Suggested commits:
  - `feat(database): enforce one business per owner`
  - `fix(negocio): make public identity race-safe`
- Do not push, deploy, or open a PR unless instructed.

## Steps

### Step 1: Add failing service tests for PostgreSQL conflicts

Extend `backend/test/negocioService.test.js` with the existing mock style. Add
tests for:

1. Insert error `{ code: '23505', constraint: 'uk_negocios_usuario_id' }`
   becomes the existing owner-conflict `409`.
2. Insert error `{ code: '23505', constraint: 'uk_negocios_slug_publico' }`
   retries the next deterministic candidate and succeeds.
3. Unknown `23505` constraint is rethrown unchanged.
4. Non-`23505` database error is rethrown unchanged.
5. Candidate attempts are bounded at 100 and exhaustion returns the existing
   public-safe slug `409`.
6. Owner lookup remains a friendly sequential fast path, but an empty result
   does not bypass insert-time classification.
7. Renaming updates `nome` only: it performs no slug lookup, includes no
   `slug_publico` assignment, and returns the original slug.

Tests must assert `error.constraint`, never `detail`, `message`, or localized
server text.

**Verify**: new tests fail against the current implementation while unrelated
unit tests still run.

### Step 2: Add migration 005 with a transactional duplicate guard

Create `005_enforce_business_identity.sql`. Inside one SQL file:

1. Run a `DO` block that tests for duplicate `usuario_id` groups with
   `GROUP BY usuario_id HAVING COUNT(*) > 1`.
2. If any group exists, raise one sanitized exception that reports only the
   count of duplicate owner groups. Do not include IDs, names, contact data, or
   row contents.
3. Add named unique constraint `uk_negocios_usuario_id` on
   `negocios(usuario_id)`.
4. Drop redundant non-unique `idx_negocios_usuario_id` only after the unique
   constraint exists and catalog evidence proves the unique index covers owner
   lookups.

Do not auto-delete or update a row. Do not use `IF NOT EXISTS` to mask an
unknown same-named object. Plan 016's outer transaction must roll back the
guard, DDL, and history row together.

Extend the runner's baseline verifier so a manually applied migration 005 is
recognized only when the named unique constraint has the exact one-column
definition and the redundant index is absent. Partial/incompatible state must
still stop without history mutation.

**Verify**: runner unit tests cover clean, duplicate, exact baseline, partial,
and wrong-definition cases.

### Step 3: Make inserts authoritative and slug retries bounded

Retain `criarSlugBase(nome)` and replace database preselection with a pure
candidate helper:

```js
gerarCandidatoSlug(nome, tentativa)
// 1 => base; 2 => base-2; ...; 100 => base-100
```

In `criarNegocio`:

1. Validate once and keep the initial owner lookup for a readable sequential
   response.
2. Attempt the parameterized insert for candidates 1 through 100. PostgreSQL
   unique constraints decide the winner.
3. On `uk_negocios_usuario_id`, return the stable owner `409` immediately.
4. On `uk_negocios_slug_publico`, retry the next candidate.
5. On every unknown constraint/code, rethrow unchanged for centralized error
   sanitization; never reinterpret it as a slug collision.
6. After 100 slug conflicts, return the established slug-exhaustion `409`.
7. Load/format the created business exactly as today.

Do not wrap all attempts in one transaction: after a PostgreSQL statement
error, that transaction would remain aborted. Each pool-level insert attempt
may use its existing autocommit statement boundary.

**Verify**: unit tests pass and no query preselects a slug before insert.

### Step 4: Preserve public slug on rename

When `atualizacao.nome` exists, append only `nome` and its value. Remove the
call that generates and writes a new slug. Keep `slug_publico` forbidden in
request payloads and keep returning it in responses.

Regression fixture: rename a business from `Studio Antigo` to `Studio Novo`
while its slug remains `studio-antigo`; public lookup by that slug must resolve
the same row after rename.

Do not add redirect, alias, editing, or history behavior.

**Verify**: unit test proves SQL and query order; integration test proves the
same public identifier resolves after rename.

### Step 5: Prove migration behavior on real PostgreSQL

Using plan 016's guarded harness, test:

- clean migrations through 004 apply 005 successfully;
- a fixture with two businesses for one owner makes migration 005 fail, leaves
  both rows untouched, adds no 005 history row, and leaves no partial
  constraint/index change;
- direct duplicate owner insertion after 005 fails with `23505` and constraint
  `uk_negocios_usuario_id`;
- unique owner queries use the remaining unique index;
- a second migration run is a no-op;
- exact 005 baseline succeeds, while partial/wrong signatures fail unchanged.

No test may print fixture data or use an existing environment.

**Verify**: guarded integration suite passes against disposable PostgreSQL.

### Step 6: Prove creation races on real services

Create `backend/test/integration/businessIdentity.integration.test.js` and call
the real `criarNegocio` service with synthetic users:

1. Same owner, different names, simultaneous create: one fulfills, one rejects
   with owner `409`, and exactly one owner row exists.
2. Different owners, same name, simultaneous create: both fulfill; slugs are
   `base` and `base-2` in either ownership order; each owner has one row.
3. Several occupied candidates: creation chooses the first available suffix
   within the bound.
4. Unknown constraint injection remains an internal failure and exposes no
   database detail through the service/controller error contract.
5. Rename preserves slug and public lookup identity.

Use a deterministic real-query barrier where concurrency needs alignment. Do
not use sleeps or retry the test case.

**Verify**: final database queries prove counts and values; all promises alone
are insufficient.

### Step 7: Document invariant, preflight, and recovery

Update scoped active PostgreSQL docs:

- migration 005 and its zero-duplicate prerequisite;
- read-only diagnostic query for duplicate owner groups;
- mandatory backup and human resolution before applying 005 when duplicates
  exist;
- no automated winner/deletion/merge;
- one business per authenticated entrepreneur;
- display-name changes do not change `slug_publico`;
- repository/CI completion does not prove migration 005 is live in Supabase.

Never show real owner IDs or production rows in examples.

**Verify**:
`rg -n "005_enforce_business_identity|uk_negocios_usuario_id|slug_publico" README.md MIGRACAO.md docs backend/database/postgres-migrations`
and review every match.

### Step 8: Run the full gate and update the index

Run unit/integration tests, audit, whitespace check, and GitHub jobs. Review
with `mysql-*` skills excluded; use `security-review`, `postgres` evidence from
the runner tests, `api-design-review`, and `pre-commit-checklist` as available.

Inspect for raw database details, mutable existing migrations, unbounded retry,
automatic data repair, frontend drift, or a second runner. Mark plan 018 `DONE`
only after every criterion holds.

## Done criteria

- [ ] Migration 005 refuses duplicate owners without data/history/schema
      mutation and adds exact `uk_negocios_usuario_id` on clean data.
- [ ] The redundant non-unique owner index is removed only after unique coverage
      exists.
- [ ] Runner baseline verification recognizes exact migration 005 and rejects
      partial/incompatible state.
- [ ] Same-owner create race produces one success, one stable `409`, one row.
- [ ] Same-name/different-owner race produces two businesses with distinct
      bounded slugs.
- [ ] Error handling uses PostgreSQL code plus structured constraint name; it
      never parses server message text.
- [ ] Unknown constraints/errors are preserved for centralized sanitization.
- [ ] Renaming a business preserves its existing public slug and lookup.
- [ ] Unit and real PostgreSQL integration suites pass locally and in CI.
- [ ] No existing migration, real data, or frontend file changed.
- [ ] `git diff --check` exits 0 and only in-scope files changed.
- [ ] `plans/README.md` marks plan 018 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Plans 015/016 are incomplete, migration 005 already exists, or migration
  001-004/history checksums drifted.
- Duplicate owners are found outside the confirmed disposable test database.
- Product requirements now allow multiple businesses per user.
- A same-named or functionally equivalent owner constraint/index already exists
  with an unknown definition.
- The exact PostgreSQL constraint name is unavailable to service errors.
- Slug conflict handling would require parsing `detail` or message text.
- Correct repair requires changing public URLs, choosing a duplicate winner, or
  mutating production data.
- A reliable race test would require shared data or timing sleeps.
- A gate fails twice after one reasonable evidence-based correction.

## Maintenance notes

- The unique owner constraint is authoritative. Keep the initial lookup only
  for friendly sequential feedback.
- Add structured handling before introducing any future unique constraint on
  `negocios`.
- Public slugs become durable identifiers. A user-editable slug requires a
  separately designed redirect/history and authorization model.
- Multiple-business support requires product, routing, authorization, database,
  and migration design together; never drop the constraint ad hoc.

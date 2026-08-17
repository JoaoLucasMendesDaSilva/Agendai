# Plan 015: Harden PostgreSQL Transport And Supabase Data Boundary

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Stop
> on every STOP condition; do not weaken a security control to make a test or
> deployment pass. Update only this plan's row in `plans/README.md` after all
> done criteria hold.
>
> **Drift check (run first)**:
> `git diff --stat f7e455b..HEAD -- backend/src/config/database.js backend/database/postgres-migrations .github/workflows/quality.yml .env.example render.yaml README.md AGENTS.md MIGRACAO.md docs`
> Compare every changed in-scope file with the assumptions below. PostgreSQL
> migration files already recorded as applied must never be edited.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: `plans/012-establish-supported-runtime-and-ci-gates.md`
- **Category**: security
- **Planned at**: commit `f7e455b`, 2026-08-17

## Why this matters

The active PostgreSQL pool accepts a server certificate without verifying its
issuer or hostname. The application tables also live in Supabase's API-exposed
`public` schema without an explicit Row Level Security boundary. A leaked or
accidentally used publishable key must not expose business, customer, or
appointment data, and production database traffic must fail closed when server
identity cannot be verified.

The deployment documentation still directs operators toward MySQL/Railway and
an administrative `postgres` runtime credential. Those instructions can cause
the correct PostgreSQL implementation to be deployed insecurely.

## Current state

- `backend/src/config/database.js` creates `pg.Pool` with
  `ssl: { rejectUnauthorized: false }`.
- `backend/database/postgres-migrations/001_create_schema.sql` creates
  `usuarios`, `negocios`, `servicos`, `profissionais`, and `agendamentos` in
  the implicit `public` schema. No migration enables RLS or revokes Supabase
  Data API roles.
- PostgreSQL migrations 001-003 are active. The MySQL files under
  `backend/database/migrations/` are historical and must not be applied to the
  current backend.
- `README.md`, `AGENTS.md`, `MIGRACAO.md`, and deployment guides still contain
  active MySQL, `DB_*`, Railway, or administrative-role instructions.
  `.env.example` already uses PostgreSQL but omits the TLS policy and embeds the
  administrative role in its example URI.
- `render.yaml` sets `NODE_VERSION=24.14.1` even though the in-root
  `backend/package.json#engines.node` already defines the bounded Node 24
  contract. Root `.nvmrc` defines the matching local/CI major contract.
- The production database, Supabase dashboard, secrets, grants, and applied
  migration history were not inspected. Do not infer their state.

## Required verification

Run from the indicated directory:

- Backend unit tests: `npm.cmd test` from `backend/`.
- Backend dependency audit:
  `npm.cmd audit --audit-level=high --omit=dev` from `backend/`.
- Frontend tests/build after documentation and runtime changes:
  `npm.cmd test && npm.cmd run build` from `frontend/`.
- Repository whitespace check: `git diff --check` from the root.
- Fresh PostgreSQL security-boundary CI job: must pass using only disposable
  GitHub service credentials and migrations 001-004.

If registry access prevents the audit, report it as unverified; do not claim
zero vulnerabilities. It does not authorize skipping the other gates.

## Scope

**In scope**:

- `backend/src/config/database.js`
- `backend/test/databaseConfig.test.js` (create)
- `backend/database/postgres-migrations/004_harden_supabase_data_boundary.sql`
  (create)
- `.github/workflows/quality.yml`
- `.env.example`
- `render.yaml`
- `README.md`
- `AGENTS.md`
- `MIGRACAO.md`
- `docs/POSTGRES-SUPABASE.md`
- `docs/RENDER.md`
- `plans/README.md` (status row only)

**Out of scope**:

- Reading or changing production secrets, Supabase settings, or Render
  environment values.
- Claiming migration 004 has run on an existing deployment.
- Moving tables out of `public`, changing application authentication, or
  exposing PostgreSQL directly to browsers.
- Creating a production login or rotating the existing database credential.
- Adding permissive RLS policies for `anon` or `authenticated`.
- Editing PostgreSQL migrations 001-003 or historical MySQL migrations.
- Deploying, merging, or changing frontend behavior.

## Git workflow

- Branch: `codex/015-postgresql-security-boundary`
- Suggested commits:
  - `fix(database): verify PostgreSQL transport security`
  - `fix(database): close Supabase Data API access`
  - `docs: align PostgreSQL and Render operations`
- Do not push, deploy, or open a PR unless the operator requested it.

## Steps

### Step 1: Make database connection policy testable

Create `backend/test/databaseConfig.test.js` first. Refactor
`backend/src/config/database.js` to export a pure configuration builder in
addition to the existing singleton pool API. The builder must accept an
explicit environment object in tests and must never connect, mutate
`process.env`, or log `DATABASE_URL`.

Tests must cover:

1. Missing or invalid `DATABASE_URL` returns `DB_CONFIG_ERROR` without echoing
   credentials.
2. Production and any non-loopback host require verified TLS.
3. `DATABASE_SSL_MODE=disable` is accepted only outside production and only for
   `localhost`, `127.0.0.1`, or `::1`.
4. `DATABASE_SSL_MODE=verify-full` produces `ssl.rejectUnauthorized === true`.
5. An optional PEM supplied through `DATABASE_SSL_CA` is passed as `ssl.ca`
   without being logged.
6. Every URL query parameter and fragment is rejected. This includes host/port
   overrides, `ssl`, `sslmode`, certificate options, and `sslnegotiation`.
7. The final pool configuration contains discrete decoded host, port, user,
   password, and database fields; it never forwards the raw connection string.
8. Encoded credentials decode correctly without appearing in errors.
9. Unknown modes and malformed URLs fail closed.

Keep `getDatabasePool()` and `testDatabaseConnection()` compatible with current
callers. Do not instantiate a pool at module import time.

**Verify**: `npm.cmd test -- test/databaseConfig.test.js` from `backend/` exits
0 and no assertion contains a real credential.

### Step 2: Replace fail-open TLS behavior

Use the tested builder in `getDatabasePool()`. The supported policy is:

- `verify-full`: always pass `ssl: { rejectUnauthorized: true }`; include the
  configured CA only when present.
- `disable`: set `ssl: false` only for a loopback database in non-production.
- In production, absence of `DATABASE_SSL_MODE` defaults to `verify-full`.
- In non-production, absence defaults to `disable` only for loopback; a remote
  host still defaults to `verify-full`.

Parse the URL once, validate/decode each discrete field, and pass no
`connectionString` to `pg.Pool`. Sanitize configuration errors. They may
identify the invalid variable, host class, or mode, but never the URL, username,
password, certificate contents, query string, or fragment.

If the supported Supabase connection cannot validate with the platform's
certificate chain, STOP. Configure a trusted CA through the environment after
operator review; never restore `rejectUnauthorized: false`.

**Verify**: full backend unit suite passes and
`rg -n "rejectUnauthorized:\s*false" backend` returns no match.

### Step 3: Add an explicit Supabase Data API boundary

Create migration 004 without changing migrations 001-003. It must:

1. Enable, but not force, RLS on all five application tables: `usuarios`,
   `negocios`, `servicos`, `profissionais`, and `agendamentos`.
2. Revoke all table and sequence privileges from `PUBLIC`.
3. Conditionally revoke all table and sequence privileges from Supabase roles
   `anon`, `authenticated`, and `service_role` only when each role exists, so
   the migration is also valid on vanilla PostgreSQL CI.
4. Revoke public execution of the trigger function
   `public.atualizar_updated_at()` and conditionally revoke it from the same
   Supabase roles.
5. Create no policy for any Data API role. `service_role` bypasses RLS, so its
   object privileges must be revoked rather than relying on policies.

Use explicit object lists, schema qualification, and transaction-compatible
SQL. Do not use `ALTER DEFAULT PRIVILEGES` without proving which role will own
future objects. Do not use `FORCE ROW LEVEL SECURITY`: the current owner-based
server connection must remain functional until a dedicated runtime login and
policies are designed and rotated separately.

Add a `postgres-security-boundary` job to `.github/workflows/quality.yml` with
an explicit official PostgreSQL major image and CI-only credentials. Use two
fresh disposable databases. Apply every file with
`psql -X --single-transaction -v ON_ERROR_STOP=1`:

1. In the first database, apply 001-004 while Supabase roles do not exist,
   proving portable conditional handling.
2. In the second, apply 001-003; create fixture roles `anon`, `authenticated`,
   and `service_role`; deliberately grant those roles and `PUBLIC` table,
   sequence, and trigger-function access; then apply 004.

Use exception-raising catalog assertions, not boolean output, to assert:

- every application table has `relrowsecurity = true`;
- no application table has a policy;
- `PUBLIC` has no application table or sequence privilege;
- `PUBLIC` and all three fixture roles no longer have table, sequence, or
  trigger-function privilege, proving migration 004 revoked seeded access;
- the schema and exclusion constraint still exist.
- an owner-side insert/update still succeeds and fires
  `atualizar_updated_at`, proving the server-owner path remains functional.

The CI job must not consume repository or production database secrets.

**Verify**: the new job passes on a pull request. A local run is optional only
when no disposable PostgreSQL is available; remote CI evidence is mandatory.

### Step 4: Correct environment, database, and deployment documentation

Update the scoped documentation so it consistently states:

- Active database: PostgreSQL on Supabase through server-side Express.
- Active backend host: Render. Active frontend host: Vercel.
- `DATABASE_URL`, `DATABASE_SSL_MODE=verify-full`, and optional
  `DATABASE_SSL_CA` replace active `DB_*` instructions.
- Historical MySQL migrations are retained for provenance only and must not be
  applied to PostgreSQL.
- Migrations 001-004 are ordered and immutable. Until plan 016 lands, applying
  them to an existing environment remains a deliberate operator action.
- RLS closes the Supabase Data API boundary; it does not replace Express JWT
  authorization or tenant predicates.
- The default Supabase `postgres` role is administrative and must not be
  recommended as the long-term runtime login. Dedicated credential
  provisioning and rotation remain an explicit operational follow-up.
- Never paste connection strings, passwords, service-role keys, or certificates
  into documentation, commits, logs, screenshots, or PR descriptions.

Remove `NODE_VERSION` from `render.yaml` so Render uses the in-root bounded
`backend/package.json#engines.node` contract. Keep root `.nvmrc` as the matching
intentionally rolling Node 24 contract for local development and CI. This
aligns the major contract but does not claim identical patch releases across
time. Preserve the free Render plan and unrelated environment values.

Do not say migration 004, RLS, TLS, deployment, or credential rotation is live
without direct environment evidence.

**Verify**:

`rg -n "MySQL|Railway|DB_HOST|DB_NAME|rejectUnauthorized|NODE_VERSION|PostgreSQL|Supabase|Render" README.md AGENTS.md MIGRACAO.md docs .env.example render.yaml`

Review every match: historical mentions must be labeled; active instructions
must agree.

### Step 5: Run the complete gate and review security boundaries

Run all required verification. Because the shared worktree already contains
unrelated user changes, inspect the executor-attributable scoped diff and run
`git diff --check -- <scoped paths>`. Confirm:

- no secret or provider hostname was introduced;
- migration 004 is the only new migration and migrations 001-003 are unchanged;
- CI uses only disposable credentials;
- no RLS policy or object grant gives a Data API role access;
- pool configuration cannot disable TLS for a remote or production database;
- documentation separates implemented repository state from operator-applied
  deployment state.

Use the repository `security-review`, `deployment-readiness`, and
`tcc-documentation` skills for final review. Mark plan 015 `DONE` only after the
new remote PostgreSQL job and existing quality jobs are green.

## Done criteria

- [ ] Remote and production PostgreSQL connections verify the certificate and
      hostname; insecure remote/production modes fail closed.
- [ ] Database configuration tests cover URLs, modes, CA handling, loopback,
      redaction, and URL-option override attempts.
- [ ] Migration 004 enables RLS on every application table and revokes
      `PUBLIC`, `anon`, `authenticated`, and `service_role` object access
      without adding permissive policies.
- [ ] Fresh PostgreSQL CI proves both absent-role portability and seeded-role
      revocation atomically, then verifies catalogs and owner-trigger behavior.
- [ ] Existing backend, frontend, prototype, and new PostgreSQL CI jobs pass.
- [ ] Active docs consistently describe PostgreSQL/Supabase, Render, verified
      TLS, and the operator boundary.
- [ ] `render.yaml` no longer overrides the bounded in-root backend engine;
      `.nvmrc` remains the matching local/CI Node 24 contract.
- [ ] No production secret, deployment mutation, or unverifiable live-state
      claim appears in the diff.
- [ ] Scoped `git diff --check` exits 0 and the executor changed only in-scope
      files; unrelated pre-existing worktree changes remain untouched.
- [ ] `plans/README.md` marks plan 015 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Any PostgreSQL migration 001-003 differs from its applied copy or an unknown
  migration 004 already exists.
- A provider connection requires disabling certificate verification.
- RLS or revokes would break a known direct browser client that is part of the
  approved product architecture.
- A catalog check shows an existing policy or grant whose purpose cannot be
  established safely.
- Fresh migrations fail on disposable PostgreSQL twice after one reasonable,
  evidence-based correction.
- The only available database for migration verification is development,
  staging, shared, Supabase production, or any database with real data.
- Documentation would require guessing production credentials or applied
  migration state.
- Remote CI is not authorized or available. In that case finish local evidence,
  leave the plan `BLOCKED - awaiting remote CI`, and do not mark it `DONE`.

## Maintenance notes

- RLS is defense in depth. Every Express query must still enforce tenant
  ownership and authorization.
- Do not grant `anon` or `authenticated` access merely to silence a client or
  dashboard error; define an approved product flow first.
- A future dedicated runtime login needs narrow grants, explicit RLS behavior,
  credential rotation, rollback, and live verification as a separate change.
- New application tables in an exposed schema require the same RLS/grant review
  in their migration.
- Keep `.nvmrc` and the bounded backend engine aligned on Node 24. Render reads
  the in-root backend manifest; local/CI tooling reads the repository `.nvmrc`.

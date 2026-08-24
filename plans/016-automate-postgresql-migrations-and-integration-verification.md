# Plan 016: Automate PostgreSQL Migrations And Integration Verification

> **Executor instructions**: Follow every step in order. Run each verification
> before continuing. Treat every database identity guard and STOP condition as
> mandatory. Never point destructive integration setup at a shared or real-data
> database. Freeze migration SQL at LF before recording exact-byte checksums.
> Update only this plan's row in `plans/README.md` after completion.
>
> **Drift check (run first)**:
> `git diff --stat f7e455b..HEAD -- .gitattributes backend/database/postgres-migrations backend/src/config/database.js backend/src/database backend/scripts backend/package.json backend/test .github/workflows/quality.yml .env.example README.md MIGRACAO.md docs`
> Plan 015 is expected to add migration 004 and a temporary fresh-schema
> security job. If its final state differs from this plan, reconcile the live
> migration set before writing runner code. Never modify an applied migration.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**:
  `plans/015-harden-postgresql-transport-and-supabase-data-boundary.md`
- **Category**: migration
- **Planned at**: commit `f7e455b`, 2026-08-17

## Why this matters

The active PostgreSQL migrations are instructions for manual SQL Editor use.
There is no durable migration history, checksum validation, concurrent-runner
lock, guarded baseline for an existing Supabase schema, or real PostgreSQL
service test for application behavior. Recovery and deployment therefore rely
on operator memory, while mocked database tests cannot prove constraints,
transactions, or PostgreSQL error handling.

This plan adds one transactional runner, split into focused CommonJS modules,
and one guarded integration path. It does not auto-run schema changes when the
web server starts and it does not touch any provider database.

## Current state

- Ordered PostgreSQL SQL files live under
  `backend/database/postgres-migrations/` and currently cover 001-004 after
  plan 015.
- The SQL files contain PostgreSQL DDL but have no checksums or history table.
- `backend/package.json` has only `dev`, `start`, and `test` scripts.
- Unit tests mock the database compatibility layer. There is no
  `backend/test/integration/` PostgreSQL harness.
- `.github/workflows/quality.yml` has fast backend/frontend/prototype jobs and,
  after plan 015, a fresh-schema security-boundary job. It does not exercise a
  migration runner, baseline, rollback, lock contention, or real services.
- Existing Supabase schema state is unknown. It may contain manually applied
  migrations without `schema_migrations` rows.

## Commands you will need

From `backend/`:

- Unit tests: `npm.cmd test`
- Guarded integration tests: `npm.cmd run test:integration`
- Migration CLI help/argument validation: `npm.cmd run db:migrate -- --help`
- Full-tree dependency audit: `npm.cmd audit --audit-level=low`

From the repository root:

- `git diff --check`
- GitHub Actions: existing jobs plus `postgres-integration` must pass.

Never run `db:migrate` against any environment until its database name,
backup, migration signatures, and command have been reviewed by the operator.
Every non-help invocation requires
`--confirm-database=<exact-current-database>`.

## Scope

**In scope**:

- `backend/src/database/migrationContracts.js` (create)
- `backend/src/database/migrationDiscovery.js` (create)
- `backend/src/database/migrationDatabaseState.js` (create)
- `backend/src/database/migrationSchema.js` (create)
- `backend/src/database/postgresCatalog.js` (create)
- `backend/src/database/migrationRunner.js` (create facade/orchestrator)
- `backend/scripts/migrate.js` (create)
- `backend/src/config/database.js`
- `backend/package.json`
- `backend/test/migrationRunner.test.js` (create)
- `backend/test/integration/postgresTestHarness.js` (create)
- `backend/test/integration/postgresTestHarness.test.js` (create)
- `backend/test/integration/migrationRunner.integration.test.js` (create)
- `backend/test/fixtures/migrations/` (create only deterministic test fixtures)
- `.gitattributes`
- `.github/workflows/quality.yml`
- `.env.example`
- `README.md`
- `MIGRACAO.md`
- `docs/POSTGRES-SUPABASE.md`
- `plans/016-automate-postgresql-migrations-and-integration-verification.md`
  (execution reconciliation only)
- `plans/README.md` (status row only)

**Out of scope**:

- Editing migrations 001-004 or adding a domain migration.
- Running migrations automatically from `src/server.js`, `src/app.js`, or a
  Render start command.
- Connecting tests to Supabase, Render, development, staging, shared, or
  production databases.
- Introducing an ORM, generic SQL parser, migration framework, Docker Compose,
  or a new npm dependency.
- Destructive repair of partial schemas, checksum drift, or business data.
- Database-backed readiness; retain it as a separately reviewed operational
  follow-up.
- Deploying or rotating credentials.

## Git workflow

- Branch: `codex/016-postgresql-migration-runner`
- Suggested commits:
  - `feat(database): add transactional migration runner`
  - `test(database): add disposable PostgreSQL integration gate`
  - `docs: document guarded PostgreSQL migrations`
- Do not push, deploy, or open a PR unless instructed.

## Runner contract

Implement these rules directly; do not leave them as documentation-only
conventions:

1. Discover only files matching `NNN_lowercase_name.sql` under the configured
   migration directory.
2. Sort numerically and require a contiguous sequence beginning at 001.
3. Reject duplicate numbers, unknown `.sql` names, missing numbers, symlinks,
   and files outside the resolved migration root.
4. Compute SHA-256 over each file's exact bytes before decoding/execution.
5. Record `version`, `name`, `checksum`, and `applied_at` in
   `public.schema_migrations` with version and name uniqueness. Protect this
   post-004 table with RLS, zero policies, and revokes from `PUBLIC` plus
   every available Supabase Data API role.
6. Use one dedicated `pg.Client`/pool client for the whole run.
7. Start one explicit read-committed, read-write transaction, set transaction-
   local timeouts, acquire a transaction-scoped advisory lock with a fixed
   Agendai key, validate history/baseline, apply every pending migration,
   insert its history row, and commit once. Attempt to roll back every change
   on a known pre-commit failure; surface an unknown outcome if rollback cannot
   be confirmed.
8. Reject checksum/name drift and unknown history rows before applying pending
   SQL. Also reject top-level transaction control and known non-transactional
   statements before connecting; dollar-quoted PL/pgSQL bodies remain valid.
9. Never print the connection string, credentials, SQL contents, row data, or
   certificate material. Log only migration identity and outcome.
10. Release the client in `finally`, including connection, lock, SQL, and
    commit failures. A failed `COMMIT` has an unknown outcome: return a
    dedicated sanitized error, prohibit automatic retry, and require read-only
    inspection.

Use PostgreSQL transactional DDL. If a current or future migration requires a
non-transactional statement such as `CREATE INDEX CONCURRENTLY`, STOP and
design an explicit protocol; do not split or silently run it outside the
transaction.

## Steps

### Step 1: Write unit tests for discovery, history, and CLI parsing

Add `.gitattributes` rules that force LF for active PostgreSQL migrations and
SQL fixtures. Confirm `git ls-files --eol` reports `i/lf w/lf attr/text eol=lf`
before freezing checksums. Do not renormalize or edit migrations 001-004.

Create deterministic fixture directories under
`backend/test/fixtures/migrations/`. Test pure discovery/checksum/argument
helpers without a database:

- contiguous 001/002 ordering;
- exact-byte checksum stability and changed-byte drift;
- rejection of gaps, duplicate numbers, uppercase/invalid names, symlinks, and
  unknown SQL files;
- rejection of resolved paths outside the migration root;
- rejection of invalid UTF-8, known non-transactional statements, and
  top-level `BEGIN`/`COMMIT`/`ROLLBACK`/savepoint/2PC control while
  accepting the existing dollar-quoted PL/pgSQL bodies;
- recognized CLI flags only;
- every non-help invocation requires
  `--confirm-database=<exact-current-database>`;
- `--baseline-existing` is accepted only with that exact confirmation;
- unknown flags and missing values fail before any client is created;
- duplicate flags, positional arguments, control characters, and separated
  confirmation values are rejected;
- help exits successfully without importing database configuration, reading
  environment secrets, or creating a client.

Dependency-inject filesystem and client boundaries where needed. Do not mock
the behavior later claimed by integration tests.

**Verify**: the new unit tests fail for the expected missing implementation;
all existing unit tests still execute.

### Step 2: Implement the transactional runner

Create `backend/src/database/migrationRunner.js` as a small CommonJS facade and
orchestrator. Separate contracts, discovery/checksum, catalog reads, structural
schema validation, and database-state inspection into focused sibling modules.
Keep discovery/checksum helpers pure and inject a connected client into the
database portion so unit tests can assert ordering and cleanup.

Create `public.schema_migrations` only inside the runner transaction. Validate
its columns, types, nullability, primary/unique keys, and absence of unknown
rows before trusting it. Also validate its owner, exact constraints, RLS flag,
zero policies, absence of unexpected rules/triggers/columns, and lack of
privileges for `PUBLIC` or any available `anon`, `authenticated`, and
`service_role`. Require PostgreSQL 15 or newer. After
`BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE`, set bounded
transaction-local lock and statement timeouts, then acquire:

```sql
SELECT pg_advisory_xact_lock(
  hashtextextended('agendai:public:schema-migrations', 0)
)
```

before history or domain inspection. No catalog or domain read may occur before
the lock. Because the timeouts and lock are transaction-scoped, commit/rollback
releases them safely even through a transaction-pooling endpoint or checked-out
pool client.

Set a bounded connection timeout in the CLI. Inside the transaction, set the
local search path to `public, pg_temp` before executing migrations because
migration 001 intentionally uses unqualified application objects. Omitting
`pg_catalog` makes PostgreSQL search it implicitly before `public`; listing
`pg_temp` last prevents a reused pool session's temporary relations from
shadowing catalog relations while keeping `public` as the creation target.
Qualify runner-owned catalog functions explicitly. Confirm
`pg_catalog.current_database()` exactly matches the operator-supplied database
name on every run, not only during baseline.

For a fresh database with no application objects, apply all migrations and
insert their history rows in the same transaction. For a database with valid
history, compare every applied filename/checksum and apply only the pending
suffix. A second run must be a read-only no-op apart from transaction/lock
traffic.

Treat an otherwise empty database with `btree_gist` already installed as
fresh: migration 001 deliberately uses `CREATE EXTENSION IF NOT EXISTS` for
provider compatibility. Any other partial or out-of-order application object
remains a STOP condition.

Reject known non-transactional DDL and top-level transaction-control patterns
early with a clear migration name, then still rely on PostgreSQL to reject
unsupported statements. The scanner must ignore comments, quoted values, and
dollar-quoted bodies rather than rejecting migration 001/004's PL/pgSQL.
Never split executable SQL; send each complete UTF-8 file through
`client.query`.

**Verify**: unit tests prove query order `BEGIN -> transaction-local timeouts ->
advisory lock -> validation -> migrations/history -> COMMIT`, and prove
rollback/release on each injected failure.

### Step 3: Add a guarded existing-schema baseline

Without `schema_migrations`, any application table or known migration object
must make the default runner refuse. Baselining is allowed only when both flags
are supplied and `SELECT current_database()` exactly equals the confirmation.

The structural verifier must identify one contiguous applied prefix and reject
partial or ambiguous state. At minimum verify:

- Migration 001: all application tables; exact required columns, primary keys,
  unique/FK/check constraints, indexes, `btree_gist`, active-period exclusion
  constraint, update function, and five triggers.
- Migration 002: both branding columns with the expected types/nullability.
- Migration 003: token hash column and named unique constraint.
- Migration 004: RLS flags, zero application-table policies, and revoked
  `PUBLIC`/available browser-role privileges from plan 015.

If a signature for migration N is present while N-1 is absent, if only part of
a signature exists, or if an object has an incompatible definition, fail and
roll back without inserting history. Do not repair, drop, rename, or rewrite
anything.

When a valid prefix is confirmed, insert history rows using the current files'
checksums, then apply any pending suffix in the same locked transaction.

**Verify**: unit tests cover fresh, valid prefixes 001-004, partial objects,
out-of-order objects, incompatible definitions, wrong confirmation, and an
unknown pre-existing history schema.

### Step 4: Add the CLI without server-start coupling

Refactor database environment loading so importing the pure configuration
builder has no dotenv or connection side effect. Create
`backend/scripts/migrate.js` and add:

```json
"db:migrate": "node scripts/migrate.js",
"test": "node --test test/*.test.js",
"test:integration": "node --test test/integration/*.test.js"
```

The CLI must parse arguments before lazily importing `pg` or database
configuration. It must use the verified discrete database configuration from
plan 015, support only `--help`, `--baseline-existing`, and
`--confirm-database=<name>`, require confirmation for every non-help run,
return a nonzero exit on failure, and sanitize errors. No import from
server/app may start Express. No import from the runner may connect
automatically.

Do not put `npm run db:migrate` in `start`, Render build/start commands, or
application boot. Production invocation remains an explicit release step after
backup and operator confirmation.

**Verify**: unit tests remain isolated; `npm.cmd run db:migrate -- --unknown`
fails before connecting; `--help` exits 0 without `DATABASE_URL`.

### Step 5: Build a destructive-test guard and real PostgreSQL tests

Create `backend/test/integration/postgresTestHarness.js`. Any destructive setup
must require all of:

- `RUN_POSTGRES_INTEGRATION=1`;
- `NODE_ENV` is not `production`;
- `DATABASE_TEST_URL` parses successfully;
- host is loopback (`localhost`, `127.0.0.1`, or `::1`);
- the URL has no query string or fragment and the final client receives only
  discrete connection fields;
- database name contains the case-insensitive standalone token `test`, matched
  by `(^|[_-])test([_-]|$)`;
- `CONFIRM_POSTGRES_TEST_DB` exactly equals the parsed database name;
- TLS disable is accepted only because the confirmed target is local.

Fail closed rather than skip when integration execution was requested but a
guard is invalid. When the flag is absent, mark tests skipped without opening a
socket. Destructive identity decisions must use only `DATABASE_TEST_URL`.
Build a dedicated client directly from an explicit environment clone; never
mutate `process.env.DATABASE_URL`, import or reuse the application pool
singleton, or copy provider environment values.

After connecting, and before cleanup or migration SQL, query
`current_database()`, `session_user`, and `inet_server_addr()`. Require the
database to equal the confirmation and the session user to equal the parsed URL
user. Require the server address to be loopback except that the disposable
GitHub Actions service may report an RFC 1918 or IPv6 ULA container address
when both `CI=true` and `GITHUB_ACTIONS=true`. Close the client and fail closed
on any mismatch. Never accept a Supabase hostname, DNS/proxy ambiguity, or a
remote server hidden behind URL options.

Integration tests must prove against real PostgreSQL:

1. Fresh migrations 001-004 apply and record exact checksums.
2. A second run changes neither schema nor history.
3. A modified applied fixture is rejected as checksum drift.
4. A failing migration rolls back its DDL and every history change.
5. Two runners serialize on the advisory lock and record each migration once.
6. A valid manually built prefix baselines and completes.
7. Partial, out-of-order, incompatible, and wrongly confirmed schemas remain
   unchanged after refusal.
8. Plan 015's RLS/grant and appointment exclusion catalogs remain correct.
   Exercise migration 004 once with Supabase roles absent and once after
   fixture roles `anon`, `authenticated`, and `service_role` receive
   table, sequence, and trigger-function privileges. Prove the seeded
   privileges are revoked, no policies exist, and owner insert/update still
   succeeds with the update trigger.

Creating or dropping cluster-global role fixtures is allowed only when the
additional `RUN_POSTGRES_ROLE_FIXTURES=1` acknowledgement is present on the
already guarded disposable PostgreSQL cluster. CI must set it; ordinary local
integration runs must skip that single cluster-global scenario without
weakening the database-level suite.

Use isolated schemas/databases only within the confirmed disposable instance.
Query final catalog and history state; promise results alone are insufficient.
Keep the integration tests serialized and never touch the application pool or
ambient database environment.

**Verify**: guarded `npm.cmd run test:integration` passes repeatedly against a
local disposable PostgreSQL instance.

### Step 6: Replace the temporary PostgreSQL CI job with the full gate

Convert plan 015's fresh-schema job to `postgres-integration` in
`.github/workflows/quality.yml`. Use an official PostgreSQL service with a
conservatively supported major version, CI-only username/password/database,
health checks, and a timeout sized for PostgreSQL startup plus serialized
integration without masking hangs. Set every test guard explicitly, including
exact database confirmation and the CI-only role-fixture acknowledgement.

The job must:

1. install backend dependencies with `npm ci`;
2. preserve plan 020's full-tree `npm audit --audit-level=low` gate;
3. run `npm test`;
4. run `npm run test:integration` with the guarded local service URL;
5. preserve plan 015's absent-role, seeded-role revocation, zero-policy,
   exclusion-constraint, and owner-trigger coverage in the integration suite;
6. never reference GitHub environment secrets or production variables.

Retain the existing fast `backend-tests`, `frontend-quality`, and
`prototype-build` jobs. Do not hide failures with `continue-on-error` or make
the new gate conditional on fork secrets.

**Verify**: all jobs pass on the PR, and integration logs show real PostgreSQL
tests ran rather than skipped.

### Step 7: Document deployment, baseline, rollback, and recovery

Update scoped docs and `.env.example` with:

- exact migration discovery and immutability rules;
- LF normalization rules that make exact-byte checksums portable;
- fresh and existing-schema commands;
- the destructive integration guard contract;
- backup and maintenance-window requirements before an existing-environment
  baseline/application;
- read-only structural inspection before `--baseline-existing`;
- transaction rollback behavior;
- commit-outcome ambiguity: never retry automatically; inspect history and
  catalog read-only before deciding recovery;
- checksum/partial-schema response: stop, preserve evidence, restore/repair
  through a separately reviewed plan; never edit history or applied SQL;
- explicit separation between repository implementation, CI verification, and
  provider application state.

Do not include a real URL or imply that Supabase migrations were applied.

**Verify**: another maintainer can identify the database, command, guard,
expected output, rollback boundary, and STOP path without reading source.

### Step 8: Run the full gate and update the index

Run unit/integration tests, audit, whitespace check, and remote CI. Inspect the
diff for secrets, provider endpoints, unsafe drop behavior, automatic startup
migrations, migration edits, and out-of-scope files. Use `security-review`,
`deployment-readiness`, and `pre-commit-checklist` reviewers.

Only after all evidence is green, mark plan 016 `DONE` in `plans/README.md`.

## Done criteria

- [ ] Discovery accepts only contiguous immutable numbered migrations and
      records portable exact-byte SHA-256 checksums under enforced LF rules.
- [ ] One transaction and transaction-scoped advisory lock cover validation,
      baseline, every pending migration, and history writes.
- [ ] Fresh, repeat, checksum-drift, rollback, and concurrent-runner behavior is
      proven against real PostgreSQL.
- [ ] Existing schemas are refused by default and baselined only after exact
      identity confirmation plus full structural verification.
- [ ] Invalid/partial schemas remain unchanged and receive no history rows.
- [ ] Destructive tests cannot target remote, production, shared, or unnamed
      databases, and post-connect identity matches the guarded URL.
- [ ] `public.schema_migrations` has an exact validated shape, RLS, zero
      policies, and no Data API role privileges.
- [ ] Unit tests do not open a database connection; integration tests cannot
      run accidentally through `npm test`.
- [ ] The application never runs migrations during import or server startup.
- [ ] Existing and `postgres-integration` GitHub jobs pass without production
      secrets; full-tree audits and plan 015 boundary regressions remain gated.
- [ ] Documentation distinguishes tested code from live provider state.
- [ ] `git diff --check` exits 0 and only in-scope files changed.
- [ ] `plans/README.md` marks plan 016 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Plan 015 is not complete or migration 004/security catalogs differ from its
  documented contract.
- Any migration 001-004 checksum changed unexpectedly or an unknown migration
  or `schema_migrations` definition exists.
- The target fails any destructive-test identity guard.
- Existing schema signatures are partial, out of order, or incompatible.
- Baselining would require guessing, changing domain rows, editing history, or
  accepting a non-contiguous prefix.
- A migration requires non-transactional DDL.
- Advisory locks are unavailable on the supported PostgreSQL endpoint.
- A connection pooler cannot hold the transaction and advisory lock on one
  backend connection.
- Reliable verification would require shared or production data.
- A required gate fails twice after one reasonable evidence-based correction.

## Maintenance notes

- Applied SQL is immutable. Add the next numbered migration; never update a
  checksum to bless drift.
- Keep schema changes out of server startup. Release operations need an
  explicit, observable migration step.
- Extend baseline signatures for every future migration or deliberately retire
  baselining after all known deployments have history.
- Keep destructive guards redundant. Convenience is not worth a wrong-database
  incident.
- Real PostgreSQL integration becomes the prerequisite for future constraint,
  transaction, error-code, and concurrency claims.

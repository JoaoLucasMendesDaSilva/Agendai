# Plan 013: Automate Migrations And MySQL Integration Verification

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 5020d22..HEAD -- backend/database/migrations backend/src/config/database.js backend/src/database backend/scripts backend/package.json backend/test .github/workflows/ci.yml .env.example README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: `plans/012-establish-supported-runtime-and-ci-gates.md`
- **Category**: migration
- **Planned at**: commit `5020d22`, 2026-07-10

## Why this matters

Database changes are currently applied by hand, with no durable record of what
ran, no checksum protection, and no real-MySQL CI gate. That makes a fresh
installation, a Railway deploy, and a recovery after partial DDL depend on
operator memory. It also leaves plan 003 unable to prove the product's central
no-overlap rule under concurrent MySQL transactions. This plan introduces one
small migration runner, a guarded path for existing deployments, and a
disposable MySQL integration suite without changing the application schema's
business rules.

## Current state

- `backend/database/migrations/001_create_schema.sql` selects a hard-coded
  schema instead of the configured `DB_NAME`:

```sql
backend/database/migrations/001_create_schema.sql:4
CREATE DATABASE IF NOT EXISTS tcc_agendamento
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tcc_agendamento;
```

- Later migrations assume an operator has already selected the right schema:

```sql
backend/database/migrations/002_add_business_branding.sql:2
-- Selecione o schema configurado em DB_NAME e execute uma unica vez depois da migration 001.

backend/database/migrations/003_add_public_appointment_token.sql:2
-- Execute uma unica vez no mesmo schema configurado em DB_NAME.
```

- Runtime database configuration already targets `DB_NAME`, but its validated
  connection options are private to the pool factory:

```js
backend/src/config/database.js:25
function getDatabasePool() {
  validateDatabaseEnv();

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
```

- `backend/package.json` has no migration or real-database test command:

```json
backend/package.json:7
"scripts": {
  "dev": "node --watch src/server.js",
  "start": "node src/server.js",
  "test": "node --test"
}
```

- The setup documentation still instructs people to apply files manually:

```text
README.md:288
Execute as migrations do banco de dados:

# Execute os arquivos SQL da pasta migrations no seu banco MySQL
```

- At the planned commit there is no `schema_migrations` table, migration
  runner, integration-test directory, or GitHub Actions job backed by MySQL.
- Current migration order is exactly:
  `001_create_schema.sql`, `002_add_business_branding.sql`, then
  `003_add_public_appointment_token.sql`.
- Repo conventions to preserve:
  - Backend modules use CommonJS and `mysql2/promise`.
  - Unit tests use `node:test` and `node:assert/strict` under `backend/test/`.
  - Secrets remain in environment variables; logs must never print passwords
    or connection URLs containing credentials.
  - The configured database is MySQL. Do not replace it or add an ORM.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install backend dependencies | `npm.cmd install` from `backend/` | exit 0 |
| Unit tests | `npm.cmd test` from `backend/` | exit 0, all unit tests pass |
| Migration integration tests | `npm.cmd run test:integration` from `backend/` with the explicit disposable-test variables described below | exit 0, all real-MySQL tests pass |
| Migration command | `npm.cmd run db:migrate` from `backend/` with explicit `DB_*` variables | exit 0 and reports either applied migrations or "no pending migrations" |
| Backend dependency audit | `npm.cmd audit --audit-level=high --omit=dev` from `backend/` | exit 0, no high/critical advisories |
| Whitespace check | `git diff --check` from repo root | exit 0 |

## Suggested executor toolkit

- Use the repo-local `mysql-migration-generator` skill, if available, to
  review ordering, compatibility, and recovery behavior.
- Use the repo-local `security-review` skill, if available, to verify database
  identity guards and that logs do not expose credentials.
- Read `AGENTS.md` before implementation; migrations and concurrency are
  explicitly high-risk areas in this repository.

## Scope

**In scope** (the only files you should modify):

- `backend/database/migrations/001_create_schema.sql`
- `backend/src/config/database.js`
- `backend/src/database/migrationRunner.js` (create)
- `backend/scripts/migrate.js` (create)
- `backend/package.json`
- `backend/test/migrationRunner.test.js` (create)
- `backend/test/integration/mysqlTestHarness.js` (create)
- `backend/test/integration/migrationRunner.integration.test.js` (create)
- `.github/workflows/ci.yml`
- `.env.example`
- `README.md`
- `plans/README.md` (status row only)

**Out of scope** (do not touch):

- Changing tables, columns, indexes, or business constraints beyond removing
  schema creation/selection from migration 001.
- Rewriting migrations 002 or 003 to pretend they are transactional.
- Automatically repairing a failed or partially applied DDL migration.
- Running migrations automatically inside `backend/src/server.js`.
- Connecting tests to a developer, shared, Railway, staging, or production
  database.
- Adding an ORM, Docker Compose stack, queue, or external migration service.
- Implementing the appointment locking fix from plan 003.

## Git workflow

- Branch: `codex/013-migration-runner-mysql-ci`
- Use conventional commits, matching repository history.
- Suggested commits:
  - `feat(database): add guarded migration runner`
  - `test(database): verify migrations against mysql`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add failing unit tests for migration discovery and history rules

Create `backend/test/migrationRunner.test.js`. Design
`backend/src/database/migrationRunner.js` so filesystem access and the MySQL
connection can be injected in tests; do not make unit tests open a real
database. Cover these exact rules:

1. Only tracked migration files matching `NNN_lowercase_name.sql` in the fixed
   `backend/database/migrations/` directory are accepted. An optional companion
   named `NNN_lowercase_name.preflight.sql` belongs to that migration and is
   not counted as a second sequence number.
2. Files are ordered lexicographically, duplicate numeric prefixes fail, and
   a gap in numbering fails instead of silently changing execution order.
3. SHA-256 is calculated over the exact file bytes and stored as 64 lowercase
   hexadecimal characters.
4. An applied row with the same checksum is skipped.
5. An applied row with a different checksum fails before any migration SQL is
   executed.
6. A row in `applying` state fails closed; the runner never retries ambiguous
   MySQL DDL automatically.
7. SQL containing an executable `CREATE DATABASE` or `USE <schema>` statement
   is rejected. Comments containing those words must not trigger a false
   positive.
8. A companion preflight must be one parameter-free, read-only `SELECT` with
   no comments hiding a second statement. Zero returned rows means continue;
   one or more rows means refuse before creating an `applying` history row.

Expose only the small pure helpers needed by these tests. Do not make all
runner internals public.

**Verify**: `npm.cmd test` from `backend/` -> the new tests run and fail only
because the runner does not exist yet.

### Step 2: Reuse validated database configuration and implement the runner

Refactor `backend/src/config/database.js` to export a `getDatabaseConfig()`
function while keeping `getDatabasePool()` and `testDatabaseConnection()`
behavior unchanged. `getDatabaseConfig()` must run the existing environment
validation and return only `host`, numeric `port`, `user`, `password`, and
`database`. Do not log its result.

Create `backend/src/database/migrationRunner.js` with one public async entry
point that accepts optional injected connection options for integration tests.
The production path must use `getDatabaseConfig()` and must:

1. Open a dedicated `mysql2/promise` connection to the configured database.
   Enable `multipleStatements` only on this dedicated connection because the
   inputs are repository-owned migration files, never request data or a
   caller-supplied path.
2. Confirm `SELECT DATABASE()` exactly equals configured `DB_NAME`; otherwise
   close the connection and fail before any DDL.
3. Derive a lock name no longer than 64 characters from a SHA-256 digest of
   host, port, and database; acquire `GET_LOCK(lockName, 30)` and require the
   result to be `1`.
4. Always call `RELEASE_LOCK(lockName)` and close the same connection in a
   `finally` block, including on checksum or migration failure.
5. Create this history table in the selected schema once it is safe to do so:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
  checksum_sha256 CHAR(64) NOT NULL,
  status ENUM('applying', 'applied') NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

6. If an unapplied file has a same-basename `.preflight.sql` companion, execute
   that read-only query before writing migration history. Continue only when it
   returns zero rows. On any returned row, print only the migration name and
   result count, then fail without an `applying` row. Never log preflight row
   contents; plan 014 uses this facility to detect duplicate owner IDs.
7. Before executing the unapplied migration file, insert its checksum with
   status `applying`. Execute the complete file. Only after MySQL reports
   success, update that row to `applied` and set `applied_at`.
8. If execution fails, leave the row as `applying`, report only the migration
   name and a sanitized error category, and exit nonzero. Do not delete the
   marker or claim rollback: MySQL DDL can commit implicitly.
9. Reject changed checksums and `applying` rows on every later run before
   executing pending SQL.

The runner may print host, port, database name, migration names, and status.
It must never print the password, a credential-bearing URL, raw environment
objects, or full SQL error/statement text.

**Verify**: `npm.cmd test` from `backend/` -> all migration-runner unit tests
pass and all pre-existing backend tests remain green.

### Step 3: Make migration 001 target only the configured database

In `backend/database/migrations/001_create_schema.sql`, remove the
`CREATE DATABASE` and `USE tcc_agendamento` statements. Replace the header with
an explicit statement that the runner must already be connected to the schema
configured by `DB_NAME`. Keep `SET NAMES` and every current table, key, index,
constraint, collation, and comment unchanged.

Add a unit test that loads every migration and proves none can switch schemas.
Do not alter migrations 002 or 003 in this step.

**Verify**: `npm.cmd test` from `backend/` -> schema-targeting tests pass; then
`rg -n "^\s*(CREATE\s+DATABASE|USE\s+)" backend/database/migrations` from repo
root -> no matches.

### Step 4: Implement an explicit, structural baseline for existing schemas

An existing deployment has domain tables but no history table. The default
runner must detect that condition and exit without creating
`schema_migrations`. It must tell the operator to inspect the target and rerun
with both `--baseline-existing` and `--confirm-database=<DB_NAME>`; the
confirmation value must exactly match the configured database.

Implement baseline inspection inside the runner using `information_schema`,
not row counts or assumptions from a successful `SELECT`. Verify a contiguous
applied prefix:

- Migration 001 is considered present only when all five domain tables
  (`usuarios`, `negocios`, `servicos`, `profissionais`, `agendamentos`) and its
  named primary/unique/foreign/check/index structures are present. At minimum
  inspect the named constraints from the SQL file and the three appointment
  period indexes; do not accept tables by name alone.
- Migration 002 is present only when both `negocios.logo_url` and
  `negocios.banner_url` exist with the declared `VARCHAR(500) NULL` shape.
  Neither column means pending; exactly one or a mismatched shape means STOP.
- Migration 003 is present only when `agendamentos.token_publico_hash` has the
  declared `CHAR(64) NULL` shape and
  `uk_agendamentos_token_publico_hash` is a unique constraint. Neither means
  pending; a partial/mismatched shape means STOP.
- A later migration may never appear present when an earlier one is absent.

Only after all observed structures match and both confirmation arguments are
present may the runner create `schema_migrations` and insert `applied` rows
with the current file checksums for the verified prefix. It may then apply the
remaining files normally. Baseline mode must never create, delete, merge, or
rewrite domain data.

Reject baseline mode if a nonempty `schema_migrations` table already exists,
if the table has an unknown shape, or if any structure is partial. There is no
automatic `--repair` option in this plan.

**Verify**: `npm.cmd test` from `backend/` -> unit tests cover missing
confirmation, wrong database confirmation, valid contiguous prefixes,
out-of-order structures, and partial migrations.

### Step 5: Add a narrow CLI and document the operating procedure

Create `backend/scripts/migrate.js` as a thin CLI wrapper around the runner.
It must parse only:

- no flags: apply pending migrations;
- `--baseline-existing`;
- `--confirm-database=<name>`, valid only with baseline mode.

Unknown flags must exit nonzero. The CLI must set a nonzero process exit code
for lock timeout, checksum drift, an `applying` marker, baseline refusal, or
migration failure.

Add this script to `backend/package.json`:

```json
"db:migrate": "node scripts/migrate.js"
```

Update `.env.example` and `README.md` with:

- the exact migration order and `npm.cmd run db:migrate` command;
- the first-run baseline command, with a placeholder database name rather
  than any real credential;
- a warning that baseline is structural verification, not a repair;
- deployment order: back up the database, run migrations, verify success,
  then start/promote application code;
- recovery rule for `applying`: stop, inspect actual DDL state and backup,
  and obtain human approval before changing history;
- a statement that migrations are intentionally not run from `server.js`.

Do not add a production password, URL, token, or copied environment value to
documentation.

**Verify**: `npm.cmd run db:migrate -- --unknown-flag` from `backend/` -> exits
nonzero without opening a database connection; `npm.cmd test` -> all unit
tests pass.

### Step 6: Add a destructive-test guard and real MySQL integration tests

Create `backend/test/integration/mysqlTestHarness.js`. Before it drops tables
or otherwise resets state, it must require all of these conditions:

- `RUN_MYSQL_INTEGRATION=1`;
- `NODE_ENV` is not `production`;
- every `DB_TEST_HOST`, `DB_TEST_PORT`, `DB_TEST_USER`, and `DB_TEST_NAME`
  variable is present;
- `DB_TEST_NAME` visibly contains `test`;
- `CONFIRM_MYSQL_TEST_DB` exactly equals `DB_TEST_NAME`.

Use `DB_TEST_PASSWORD` only for the dedicated connection and never print it.
The harness must operate only inside `DB_TEST_NAME`; do not drop or create a
database server-wide. Reset tables with foreign-key checks disabled only for
the shortest necessary block and always restore them in `finally`.

Add `backend/test/integration/migrationRunner.integration.test.js` using the
same `node:test` runner. Cover:

1. A fresh confirmed test schema applies migrations 001 through 003 in order.
2. A second run is a no-op and preserves exactly three `applied` rows.
3. The created domain tables are in `DB_TEST_NAME`, not the hard-coded
   `tcc_agendamento` schema.
4. A changed migration checksum aborts before SQL execution.
5. A second runner cannot pass while the advisory lock is held.
6. A matching legacy schema baselines a contiguous prefix and applies the
   rest.
7. A one-column migration 002 state and a column-without-unique migration 003
   state both refuse baseline.
8. A deliberately failing DDL file leaves an `applying` marker and a rerun
   refuses to execute it again.
9. A fixture migration whose companion preflight returns a row is not executed
   and has no history row; the same fixture proceeds when the preflight returns
   zero rows.

Add a separate package script so ordinary unit tests never touch MySQL:

```json
"test:integration": "node --test test/integration/*.test.js"
```

**Verify**: with only `RUN_MYSQL_INTEGRATION=1` set,
`npm.cmd run test:integration` -> exits nonzero before destructive SQL. With all
explicit variables pointed at a disposable schema,
`npm.cmd run test:integration` -> all integration cases pass.

### Step 7: Add the disposable MySQL CI gate

Plan 012 establishes `.github/workflows/ci.yml`; extend that file rather than
creating a second overlapping workflow. Add a `mysql-integration` job with:

- the same supported Node version chosen by plan 012;
- an official MySQL 8.4 service container;
- a job-local database whose name visibly contains `test`;
- a job-local CI-only password declared once and reused by the service and
  `DB_TEST_PASSWORD` (never use repository or deployment database secrets);
- a health check that waits for MySQL before `npm.cmd run test:integration`;
- `RUN_MYSQL_INTEGRATION=1` and an exact
  `CONFIRM_MYSQL_TEST_DB=DB_TEST_NAME` pair.

Use `npm.cmd ci` from `backend/` before the test. The job must run on pull
requests and pushes under the workflow triggers created by plan 012.

**Verify**: validate the workflow syntax locally if an approved validator is
available; then the PR's `mysql-integration` job -> service becomes healthy and
all integration tests pass. Do not waive or mark the check optional to make
the PR green.

### Step 8: Run the complete gate and update the plan index

Run unit tests first, then the guarded integration suite against a disposable
schema, then the audit and whitespace checks. Inspect `git status` and confirm
only files listed in Scope changed. Update only plan 013's row in
`plans/README.md` to `DONE`; plan 003 can then move from `BLOCKED` to `TODO`.

**Verify**: all commands in "Commands you will need" exit 0 and
`git diff --name-only` contains no out-of-scope path.

## Test plan

- Unit tests in `backend/test/migrationRunner.test.js`:
  discovery/order, exact checksums, history state machine, lock cleanup,
  schema-switch rejection, CLI flag validation, and baseline decisions.
- Integration tests in
  `backend/test/integration/migrationRunner.integration.test.js`:
  fresh apply, idempotent rerun, configured-schema targeting, lock contention,
  checksum drift, valid baseline, partial baseline refusal, and failed-DDL
  recovery marker.
- CI must run both existing backend unit tests and the separate real-MySQL
  suite. Mock-only coverage is not sufficient for this plan.
- Never copy a real `.env` into CI or test fixtures.

## Done criteria

- [ ] Migration 001 contains no executable `CREATE DATABASE` or `USE` command.
- [ ] `npm.cmd run db:migrate` applies ordered repository migrations only to
      configured `DB_NAME`.
- [ ] Optional read-only companion preflights run before migration history is
      mutated and block on any returned row.
- [ ] `schema_migrations` records exact SHA-256 checksums and explicit
      `applying`/`applied` state.
- [ ] Changed checksums, ambiguous `applying` state, and lock contention fail
      closed.
- [ ] Existing deployments require a confirmed structural baseline; partial
      schemas are never marked applied.
- [ ] Destructive integration tests refuse to run without all disposable-DB
      guards.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd run test:integration` exits 0 against disposable MySQL 8.4.
- [ ] The GitHub Actions MySQL integration job passes without deployment
      credentials.
- [ ] `npm.cmd audit --audit-level=high --omit=dev` from `backend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No files outside Scope are modified.
- [ ] `plans/README.md` marks plan 013 `DONE` and unblocks plan 003.

## STOP conditions

Stop and report; do not improvise if:

- Plan 012 has not landed or its CI workflow path/job structure differs from
  this plan's dependency.
- A test database cannot satisfy every explicit identity guard, or anyone asks
  to use development, shared, Railway, staging, or production data for tests.
- The configured database selected by MySQL differs from `DB_NAME`.
- An existing `schema_migrations` table has an unknown schema, a checksum
  mismatch, or an `applying` row.
- Existing domain structures are partial, out of order, or do not exactly
  match the known migration signatures.
- Baseline would require modifying domain data or guessing whether DDL ran.
- A migration uses stored procedures, custom delimiters, or another construct
  the complete-file `mysql2` execution path cannot safely run.
- MySQL advisory locks are unavailable or cannot be released on the same
  connection.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Never edit an applied migration after this lands; add the next numbered file.
  Checksum drift is an incident, not an invitation to update history.
- MySQL DDL is not transactionally rolled back. The `applying` marker exists to
  force human inspection after interruption; do not add automatic repair
  without a separate reviewed design.
- Any future baseline signature must inspect structural metadata and preserve
  contiguous ordering.
- Reviewers should scrutinize selected-database verification, lock lifetime,
  log redaction, and every destructive-test guard.
- This plan deliberately provides the infrastructure required by plan 003; it
  does not claim the scheduling race is fixed.

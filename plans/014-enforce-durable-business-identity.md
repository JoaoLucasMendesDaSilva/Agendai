# Plan 014: Enforce Durable Business Identity

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 5020d22..HEAD -- backend/database/migrations backend/src/services/negocioService.js backend/test/negocioService.test.js backend/test/integration README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: `plans/013-automate-migrations-and-mysql-integration.md`
- **Category**: migration
- **Planned at**: commit `5020d22`, 2026-07-10

## Why this matters

The product behaves as if one entrepreneur owns one business, but the database
does not enforce that rule. Two concurrent create requests can both pass the
current check and insert two rows, while concurrent businesses with the same
name can both select the same public slug and make one request fail as an
internal database error. Renaming a business also regenerates its slug, which
silently breaks previously shared links and QR codes. This plan makes those
identity rules durable at the database boundary and gives every expected race
a stable, public-safe outcome.

## Current state

- `negocios.usuario_id` has only a non-unique index:

```sql
backend/database/migrations/001_create_schema.sql:31
CREATE TABLE IF NOT EXISTS negocios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  slug_publico VARCHAR(160) NOT NULL,

backend/database/migrations/001_create_schema.sql:48
CONSTRAINT uk_negocios_slug_publico UNIQUE (slug_publico),
...
INDEX idx_negocios_usuario_id (usuario_id),
```

- Business creation uses a check-then-insert sequence with no database
  constraint covering the owner:

```js
backend/src/services/negocioService.js:344
async function criarNegocio(usuarioId, dados) {
  const pool = getDatabasePool();
  const [negociosExistentes] = await pool.execute(
    'SELECT id FROM negocios WHERE usuario_id = ? LIMIT 1',
    [usuarioId]
  );

  if (negociosExistentes.length > 0) {
    throw criarErro(409, 'Usuario ja possui negocio cadastrado.');
  }
```

- Public slug generation also checks before the insert, so the unique index is
  the only authority during a race:

```js
backend/src/services/negocioService.js:189
async function gerarSlugPublico(nome, idIgnorado = null) {
  const pool = getDatabasePool();
  const base = criarSlugBase(nome);
  let sufixo = 1;

  while (sufixo <= 100) {
    const candidato = sufixo === 1 ? base : `${base}-${sufixo}`;
    ...
    const [linhas] = await pool.execute(sql, params);

    if (linhas.length === 0) {
      return candidato;
    }
```

- Renaming a business changes its public address:

```js
backend/src/services/negocioService.js:420
if (atualizacao.nome !== undefined) {
  campos.push('nome = ?');
  valores.push(atualizacao.nome);
  campos.push('slug_publico = ?');
  valores.push(await gerarSlugPublico(atualizacao.nome, id));
}
```

- `buscarNegocioDoUsuario` and the other tenant lookups use `LIMIT 1`, which
  masks duplicate owner rows rather than defining which row is canonical.
- `backend/test/negocioService.test.js` covers valid creation, numeric slug
  normalization, and sequential slug suffixing with a mocked pool, but it does
  not cover `ER_DUP_ENTRY`, simultaneous requests, or slug stability on rename.
- Plan 013 introduces ordered checksummed migrations, an optional read-only
  companion preflight executed before the `applying` marker, and a guarded
  disposable-MySQL integration harness. This plan must use those facilities;
  do not create a second runner.
- Product constraint: the current Agendai model is exactly one business per
  authenticated entrepreneur. Supporting multiple businesses is an
  architectural/product change and is not part of this plan.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit tests | `npm.cmd test` from `backend/` | exit 0, all unit tests pass |
| MySQL integration tests | `npm.cmd run test:integration` from `backend/` with plan 013's disposable-test guards | exit 0, all real-MySQL tests pass |
| Migration preflight/apply | `npm.cmd run db:migrate` from `backend/` against an explicitly confirmed disposable schema | exit 0 and migration 004 becomes `applied` |
| Backend dependency audit | `npm.cmd audit --audit-level=high --omit=dev` from `backend/` | exit 0, no high/critical advisories |
| Whitespace check | `git diff --check` from repo root | exit 0 |

## Suggested executor toolkit

- Use the repo-local `mysql-migration-generator` skill, if available, for the
  unique-constraint migration, duplicate-data preflight, and recovery review.
- Use the repo-local `security-review` skill, if available, to verify tenant
  isolation and public-safe duplicate handling.
- Use the repo-local `api-design-review` skill only to confirm that the
  existing `409` response contract remains unchanged; do not redesign routes.

## Scope

**In scope** (the only files you should modify):

- `backend/database/migrations/004_enforce_business_identity.preflight.sql`
  (create)
- `backend/database/migrations/004_enforce_business_identity.sql` (create)
- `backend/src/services/negocioService.js`
- `backend/test/negocioService.test.js`
- `backend/test/integration/businessIdentity.integration.test.js` (create)
- `README.md`
- `plans/README.md` (status row only)

**Out of scope** (do not touch):

- Automatically deleting, merging, reassigning, or choosing between duplicate
  production businesses.
- Adding multiple businesses per user or a business-switching UI.
- Changing public route paths, response shapes, or slug format for existing
  rows.
- Regenerating any existing `slug_publico` value, including on rename.
- Editing migrations 001 through 003 after plan 013 has checksummed them.
- Adding redirects or a slug-history table.
- Modifying frontend files.

## Git workflow

- Branch: `codex/014-durable-business-identity`
- Use conventional commits, matching repository history.
- Suggested commits:
  - `feat(database): enforce one business per owner`
  - `fix(negocio): make public identity race-safe`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add failing service tests for authoritative duplicate handling

Extend `backend/test/negocioService.test.js` using its existing mocked-pool
helpers. Add these cases before changing the service:

1. An `ER_DUP_ENTRY` from business insert followed by a requery that finds the
   same `usuario_id` becomes the existing public-safe `409` with message
   `Usuario ja possui negocio cadastrado.`
2. An `ER_DUP_ENTRY` followed by no owner row but a row for the attempted
   `slug_publico` retries the next suffix and succeeds.
3. An `ER_DUP_ENTRY` followed by neither an owner nor candidate-slug row is
   rethrown; an unknown database invariant must not be mislabeled as a slug
   collision.
4. Slug retries stop after exactly 100 candidates and return the existing
   public-safe `409` `Nao foi possivel gerar um link publico unico.`
5. Updating only `nome` does not query for a new slug, does not include
   `slug_publico = ?` in the update, and returns the original public slug.

Keep the fast initial owner lookup for a friendly sequential response, but the
tests must prove it is not treated as the concurrency guarantee.

**Verify**: `npm.cmd test` from `backend/` -> the new tests fail against the
current check-then-insert implementation; all unrelated tests still run.

### Step 2: Add a read-only duplicate preflight and the unique migration

Create
`backend/database/migrations/004_enforce_business_identity.preflight.sql` with
one parameter-free, read-only query:

```sql
SELECT usuario_id, COUNT(*) AS total_negocios
FROM negocios
GROUP BY usuario_id
HAVING COUNT(*) > 1
ORDER BY usuario_id;
```

Under plan 013's contract, any returned row must stop migration 004 before the
runner inserts an `applying` history marker. The runner may report the number
of duplicate owner groups, but must not print names, descriptions, phone
numbers, addresses, or other business data.

Create `backend/database/migrations/004_enforce_business_identity.sql` with one
additive operation:

```sql
ALTER TABLE negocios
  ADD CONSTRAINT uk_negocios_usuario_id UNIQUE (usuario_id);
```

Do not add the constraint retroactively to migration 001: after plan 013,
applied migrations are immutable and fresh installs will run 001 through 004
in order. Do not add a redundant non-unique index; MySQL can use the new unique
index for owner lookups.

Add integration tests proving:

- a duplicate-free schema passes the preflight and applies migration 004;
- a schema with two businesses for one owner fails before any `applying` row
  for migration 004 exists and leaves both rows untouched;
- after applying 004, a direct second insert for the same `usuario_id` fails
  with `ER_DUP_ENTRY`;
- the migration remains a no-op on the runner's second execution.

**Verify**: `npm.cmd run test:integration` from `backend/` against disposable
MySQL -> all new migration/preflight tests pass.

### Step 3: Replace slug preselection with bounded insert attempts

In `backend/src/services/negocioService.js`, retain `criarSlugBase(nome)` and
replace the async `gerarSlugPublico` preselection loop with a pure candidate
function. Its contract is:

```js
gerarCandidatoSlug(nome, tentativa)
// tentativa 1 -> base
// tentativa 2 -> `${base}-2`
// ...
// tentativa 100 -> `${base}-100`
```

In `criarNegocio`:

1. Validate the payload once.
2. Keep the current initial owner query as a fast path.
3. Attempt the parameterized `INSERT` with candidates 1 through 100. The
   database unique constraints, not a prior slug query, decide the winner.
4. On any error other than `ER_DUP_ENTRY`, rethrow immediately.
5. After `ER_DUP_ENTRY`, requery by `usuario_id`. If a row now exists, return
   the stable owner-conflict `409`.
6. If no owner row exists, query the exact candidate `slug_publico`. Retry only
   when that candidate now exists.
7. If neither query explains the duplicate, rethrow the original database
   error. Do not parse `sqlMessage` or depend on localized MySQL error text.
8. If all 100 candidates are occupied, return the existing public-safe slug
   exhaustion `409`.

Fetch and format the created business exactly as the current function does.
Do not expose constraint names or raw MySQL errors through controllers.

**Verify**: `npm.cmd test` from `backend/` -> all new duplicate/slug unit tests
pass, including the unknown-constraint case.

### Step 4: Make the public slug immutable on business rename

In `atualizarNegocio`, when `atualizacao.nome` is present, update only `nome`.
Remove the `slug_publico = ?` assignment and the call that derives a slug from
the new name. Keep `slug_publico` forbidden in request payloads and preserve
the existing response field.

Add a unit regression test that starts with slug `studio-antigo`, renames the
business to `Studio Novo`, and proves:

- SQL changes `nome` but not `slug_publico`;
- the returned business still has `slug_publico: 'studio-antigo'`;
- no slug lookup was issued.

This is intentionally one-way. Do not build slug editing, redirects, or slug
history in this plan.

**Verify**: `npm.cmd test` from `backend/` -> the rename regression passes and
all existing business tests remain green.

### Step 5: Prove both creation races against real MySQL

Create `backend/test/integration/businessIdentity.integration.test.js` using
plan 013's guarded harness. Seed synthetic users and call the real
`criarNegocio` service concurrently; do not mock `mysql2` or reduce the test to
direct SQL.

Cover:

1. Two simultaneous creates for the same user with different names: exactly
   one promise fulfills, exactly one rejects with status `409`, and the
   database contains exactly one business for that `usuario_id`.
2. Two simultaneous creates for different users with the same business name:
   both fulfill, the slugs are distinct (`base` and `base-2`, regardless of
   which user wins the base), and each owner has exactly one row.
3. Renaming the winning business leaves its slug unchanged and a public lookup
   by that slug still resolves the same business.

Run each case in isolated fixture data. Cleanup must remain confined to the
confirmed disposable schema.

**Verify**: `npm.cmd run test:integration` from `backend/` -> all identity
concurrency tests pass repeatedly without retrying the test itself.

### Step 6: Document preflight, deployment, and recovery

Update `README.md` migration documentation after plan 013's section. Add:

- migration 004 to the ordered list;
- the exact read-only duplicate query from Step 2;
- an instruction that zero rows is required before applying migration 004 to
  an existing deployment;
- a warning that duplicates require a human data decision and backup before
  migration; never delete or merge them automatically;
- the new invariant: one `negocios` row per `usuarios` row;
- the public-link contract: changing the business display name does not change
  `slug_publico`.

Do not claim the migration has run in Railway unless there is direct evidence
from that deployment. Implementation and deployment are separate states.

**Verify**: `rg -n "004_enforce_business_identity|uk_negocios_usuario_id|slug_publico" README.md backend/database/migrations` from repo root -> documents and SQL are discoverable; `git diff --check` -> exits 0.

### Step 7: Run the full gate and update the plan index

Run unit tests, guarded real-MySQL tests, the backend dependency audit, and the
whitespace check. Inspect the final diff for raw SQL errors, secrets, unrelated
refactors, and out-of-scope paths. Update only plan 014's row in
`plans/README.md` after every done criterion holds.

**Verify**: all commands in "Commands you will need" exit 0 and
`git diff --name-only` contains no out-of-scope path.

## Test plan

- Unit tests in `backend/test/negocioService.test.js`:
  owner duplicate requery, slug duplicate requery/retry, unexplained duplicate
  rethrow, 100-attempt bound, and slug stability on rename.
- Migration/integration tests in
  `backend/test/integration/businessIdentity.integration.test.js`:
  clean preflight, duplicate refusal before history mutation, unique constraint,
  idempotent runner, same-owner create race, same-name/different-owner race,
  and rename/public-link stability.
- Use only synthetic IDs, names, and contact data. Never copy production rows
  into a fixture.
- Mock-only tests are not sufficient for either unique-index or race behavior.

## Done criteria

- [ ] Migration preflight returns zero rows on clean data and blocks duplicate
      owner groups before migration history enters `applying`.
- [ ] `uk_negocios_usuario_id` exists and enforces one business per owner.
- [ ] Concurrent creates for one owner produce one success, one stable `409`,
      and exactly one row.
- [ ] Concurrent same-name creates for different owners both succeed with
      distinct bounded slugs.
- [ ] `ER_DUP_ENTRY` is classified by authoritative requeries, never by parsing
      MySQL message text.
- [ ] Renaming a business preserves its existing `slug_publico`.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd run test:integration` exits 0 against confirmed disposable MySQL.
- [ ] `npm.cmd audit --audit-level=high --omit=dev` from `backend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No frontend file or migration 001-003 is modified.
- [ ] `plans/README.md` marks plan 014 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Plan 013 is not `DONE`, its migration runner lacks preflight-before-marker
  semantics, or its real-MySQL guard cannot be satisfied.
- The duplicate preflight returns any row on a non-disposable database. Do not
  choose a winner, delete data, or apply migration 004.
- `uk_negocios_usuario_id` already exists with a different definition or an
  unknown migration 004 is present.
- Product requirements now allow multiple businesses per user.
- `negocios` has another unique constraint that cannot be deterministically
  distinguished by the owner and candidate-slug requeries.
- The service's public `409` contract or current slug-routing behavior has
  changed since commit `5020d22`.
- A reliable concurrency test would require using shared or production data.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The unique index is the authority. Keep the initial owner lookup only as a
  fast, readable response path; never rely on it for concurrency safety.
- If another unique field is added to `negocios`, extend the post-duplicate
  requery classification before deploying that constraint.
- Public slugs are durable identifiers after this plan. A future user-editable
  slug requires a separate redirect/history design and migration.
- If multiple businesses per owner becomes a product requirement, do not drop
  this constraint ad hoc; design tenant selection, authorization, routing, and
  migration together.
- Reviewers should scrutinize duplicate-data handling, migration order,
  maximum retry count, raw-error containment, and real-MySQL evidence.

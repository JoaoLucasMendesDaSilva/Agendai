# Plan 001: Establish Backend Verification Baseline

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3072a78..HEAD -- backend/package.json backend/src backend/database`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `3072a78`, 2026-06-25

## Why this matters

The project has critical backend rules for authentication, tenant isolation, public appointment tokens, and conflict blocking, but no automated backend test command today. That makes every future bug fix depend on manual testing and increases risk for the TCC demo. This plan adds a small, explainable verification baseline before more behavioral changes land.

## Current state

- `backend/package.json` defines only runtime scripts:

```json
backend/package.json:7
"scripts": {
  "dev": "node --watch src/server.js",
  "start": "node src/server.js"
}
```

- `backend/src/services/authService.js` contains pure service logic worth testing first:

```js
backend/src/services/authService.js:62
async function cadastrarUsuario(dados) {
  const nome = String(dados.nome || '').trim();
  const email = normalizarEmail(dados.email);
  const senha = String(dados.senha || '');
```

- `backend/src/services/publicoService.js` contains core scheduling helpers and database-backed flows:

```js
backend/src/services/publicoService.js:833
async function criarAgendamentoPublico(slugOuId, dados) {
  const dadosValidados = montarDadosAgendamento(dados);
  const negocio = await buscarNegocioPublico(slugOuId);
```

- Repo conventions:
  - Backend uses CommonJS (`require`, `module.exports`).
  - Errors are `Error` objects with `status` and `publicMessage`; match `criarErro` helpers already present in services.
  - Do not introduce TypeScript or a large framework migration.
  - Keep the TCC preference: simple, readable, explainable code.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install backend deps | `npm.cmd install` from `backend/` | exit 0 |
| Run backend tests | `npm.cmd test` from `backend/` | exit 0, all tests pass |
| Dependency audit | `npm.cmd audit --audit-level=high --omit=dev` from `backend/` | exit 0, no high/critical vulnerabilities |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `backend/package.json`
- `backend/package-lock.json`
- `backend/test/**` or `backend/tests/**` (create one consistent test directory)
- Minimal test-only seams in backend modules only if strictly needed for testability

**Out of scope**:
- Frontend test setup
- Backend route rewrites
- Database schema changes
- Business rule changes
- Changing production error messages unless a test exposes an existing bug and a separate plan covers it

## Git workflow

- Branch suggestion: `codex/001-backend-verification-baseline`
- Commit style: conventional commits, matching history such as `fix(frontend): ...` and `feat(agendamentos): ...`
- Suggested commit message: `test(backend): add verification baseline`
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add a backend test runner

Use Node's built-in test runner to keep dependencies low. Add a `test` script to `backend/package.json`, for example:

```json
"test": "node --test"
```

If Node's built-in runner cannot handle the needed mocking cleanly, STOP and report before adding Jest/Vitest.

**Verify**: `npm.cmd test` from `backend/` -> exits 0, even if it initially reports zero tests.

### Step 2: Add tests for authentication validation

Create a backend test file under the chosen test directory. Cover at least:

- `cadastrarUsuario` rejects missing name/email/password.
- `cadastrarUsuario` rejects invalid email.
- `cadastrarUsuario` rejects password shorter than 8 characters.
- `autenticarUsuario` rejects missing email/password.

Use a mocked database pool instead of a real MySQL connection. If mocking `getDatabasePool` requires a small module seam, keep it narrowly scoped and do not change production behavior.

**Verify**: `npm.cmd test` from `backend/` -> exits 0 and reports the new auth tests passing.

### Step 3: Add tests around public appointment token/status helpers

Add tests that can be written without a real database first. If helper functions are private, prefer testing through public service functions with a mocked pool. Cover:

- Invalid token format returns a 404-style error.
- Public appointment lookup never exposes `token_publico_hash`.
- Error objects preserve `status` and `publicMessage` conventions.

**Verify**: `npm.cmd test` from `backend/` -> exits 0 and includes the public appointment tests.

### Step 4: Document the verification baseline in package scripts only

Do not edit README in this plan unless the operator asks. The baseline is established by `backend/package.json` and tests.

**Verify**: `git diff --check` from repo root -> exits 0.

## Test plan

- New backend tests should live in the same test directory and use Node's `node:test` plus `node:assert/strict`.
- Avoid real network and real MySQL in this baseline.
- Use test data that does not contain real credentials, tokens, phone numbers, or private user data.

## Done criteria

- [ ] `backend/package.json` has a `test` script.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] Auth validation tests exist and pass.
- [ ] Public appointment/token convention tests exist and pass.
- [ ] `npm.cmd audit --audit-level=high --omit=dev` from `backend/` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No frontend files are modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The current `backend/package.json` scripts no longer match the excerpt.
- Adding tests appears to require a real MySQL database in CI/local verification.
- A testability seam would require broad rewrites of service modules.
- You find a real behavior bug while writing tests that is not covered by this plan; record it and stop instead of bundling a fix.

## Maintenance notes

Future backend changes should add or update tests in the same runner. Reviewers should reject business-rule changes that land without extending this baseline, especially scheduling, token, auth, and tenant isolation logic.

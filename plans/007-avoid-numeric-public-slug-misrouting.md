# Plan 007: Avoid Numeric Public Slug Misrouting

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2fe0e87..HEAD -- backend/src/services/negocioService.js backend/src/services/publicoService.js frontend/src/pages/Negocio.jsx backend/test`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-establish-backend-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `2fe0e87`, 2026-06-26

## Why this matters

Public links use `slug_publico`, but the public lookup treats a numeric path as
a database ID. A business named `123` can therefore publish `/agendar/123` and
have the backend resolve it as `id = 123`, causing a 404 or, worse, the wrong
business if that ID exists. This is a small API-boundary bug with a clean fix.

## Current state

- Slug generation can return numeric-only slugs:

```js
backend/src/services/negocioService.js:170
function criarSlugBase(nome) {
  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'negocio';
}
```

- Public lookup chooses ID lookup whenever the path is numeric:

```js
backend/src/services/publicoService.js:584
if (/^[1-9]\d*$/.test(valor)) {
  sql += 'id = ?';
  params.push(Number(valor));
} else {
  sql += 'slug_publico = ?';
  params.push(valor);
}
```

- The frontend publishes the slug in the public link:

```js
frontend/src/pages/Negocio.jsx:76
return `${window.location.origin}/agendar/${slug}`;
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Backend tests | `npm.cmd test` from `backend/` | exit 0, all tests pass |
| Frontend build | `npm.cmd run build` from `frontend/` | exit 0 |
| Git whitespace check | `git diff --check` from repo root | exit 0 |

## Scope

**In scope**:
- `backend/src/services/negocioService.js`
- `backend/src/services/publicoService.js` only if resolving by slug first is
  selected
- Backend tests under `backend/test/**`
- `frontend/src/pages/Negocio.jsx` only if link display needs a defensive
  encode tweak

**Out of scope**:
- Changing the public route shape `/agendar/:slugOuId`
- Adding multiple businesses per user
- Database migrations unless absolutely required
- Frontend redesigns

## Git workflow

- Branch suggestion: `codex/007-numeric-public-slugs`
- Suggested commit message: `fix(negocio): avoid numeric public slug routing ambiguity`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add tests for numeric names and lookup

Add backend tests proving:

- `criarSlugBase` or the public creation flow does not produce bare `123` for a
  business named `123`.
- `buscarNegocioPublico('123')` cannot accidentally return a different business
  by ID when a slug exists.

If private helpers are not exported, test through `criarNegocio` and
`obterNegocio`/public lookup with mocked database responses. Keep test seams
small.

**Verify**: `npm.cmd test` from `backend/` -> the new tests fail before the fix.

### Step 2: Pick the smallest canonical rule

Prefer preventing numeric-only slugs at generation time:

- If `criarSlugBase(nome)` returns only digits, prefix it with `negocio-`.
- Existing slugs that are already non-numeric must remain unchanged.
- Existing suffix behavior should still produce `negocio-123-2` or equivalent
  when needed.

If you discover live data may already contain numeric slugs, STOP and report a
small migration/data-cleanup plan instead of silently changing lookup semantics.

**Verify**: `npm.cmd test` from `backend/` -> slug-generation tests pass.

### Step 3: Make public lookup safe for future drift

Either keep the current ID-or-slug lookup after numeric slugs are prevented, or
make lookup prefer `slug_publico = ?` first and fall back to ID only if no slug
matches. Choose the simpler implementation that keeps tests clear.

Do not concatenate untrusted values into SQL.

**Verify**: `npm.cmd test` from `backend/` -> public lookup tests pass.

### Step 4: Confirm frontend link generation still builds

If no frontend change is needed, leave `frontend/src/pages/Negocio.jsx` alone.
If you touch it, only encode the slug defensively and keep the visual output the
same.

**Verify**: `npm.cmd run build` from `frontend/` -> exits 0.

## Test plan

- Backend tests:
  - numeric-only business name creates a non-numeric slug
  - normal names keep readable slugs
  - collisions still append suffixes
  - numeric public path cannot misroute to another business
- Manual check:
  - create a business named `123` locally and confirm the displayed public link
    uses the non-numeric slug

## Done criteria

- [ ] New numeric-only slugs are prevented or safely resolved.
- [ ] Existing non-numeric slug behavior remains unchanged.
- [ ] `npm.cmd test` from `backend/` exits 0.
- [ ] `npm.cmd run build` from `frontend/` exits 0 if frontend changed.
- [ ] `git diff --check` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Existing production data already includes numeric-only `slug_publico` values.
- The fix appears to require changing the public URL contract.
- Testing the slug generator requires exporting a broad internal API.

## Maintenance notes

Keep the public URL user-friendly. Do not replace slugs with opaque IDs just to
avoid this bug; the TCC product direction favors simple, shareable links for
small businesses.

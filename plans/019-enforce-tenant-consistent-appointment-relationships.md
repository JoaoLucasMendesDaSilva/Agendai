# Plan 019: Enforce Tenant-Consistent Appointment Relationships

> **Executor instructions**: Follow every step and STOP condition. This plan
> adds defense-in-depth constraints; it does not replace service authorization.
> Never repair inconsistent real data automatically. Use only plan 016's runner
> and guarded PostgreSQL harness. Update only this plan's index row when done.
>
> **Drift check (run first)**:
> `git diff --stat f7e455b..HEAD -- backend/database/postgres-migrations backend/src/database/migrationContracts.js backend/src/database/migrationSchema.js backend/src/services/publicoService.js backend/test backend/package.json README.md MIGRACAO.md docs`
> Confirm plans 015, 016, and 018 are complete, migration 006 is the latest
> migration, and migration 007 is absent. Reinspect every appointment
> insert/update path and live constraint name before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**:
  `plans/018-enforce-durable-business-identity-on-postgresql.md`
- **Category**: migration
- **Planned at**: commit `f7e455b`, 2026-08-17

## Why this matters

`agendamentos.negocio_id`, `servico_id`, and `profissional_id` each reference a
valid row, but PostgreSQL does not require those rows to belong to the same
business. A service bug, manual operation, or compromised credential could
create an appointment owned by business A that points to business B's service
or professional. Joins and reports would then cross tenant boundaries even
though each individual foreign key is valid.

Services already perform tenant-scoped lookups. Composite foreign keys must make
that rule durable at the data boundary and reject every inconsistent write.

## Current state

- `servicos(id)` and `profissionais(id)` are globally unique primary keys and
  each row has non-null `negocio_id`.
- `agendamentos` has independent foreign keys to `negocios(id)`, `servicos(id)`,
  and `profissionais(id)`.
- No constraint covers `(servico_id, negocio_id)` or
  `(profissional_id, negocio_id)`.
- `criarAgendamentoPublico` validates service and professional using the
  selected business before insert, but database correctness must not depend on
  that one code path.
- Existing live data consistency is unknown. No production query was run.

## Commands you will need

From `backend/`:

- `npm.cmd test`
- guarded `npm.cmd run test:integration`
- guarded disposable migration run: `npm.cmd run db:migrate`
- `npm.cmd audit --audit-level=high --omit=dev`

From root: `git diff --check`. GitHub backend and PostgreSQL integration jobs
must pass.

## Scope

**In scope**:

- `backend/database/postgres-migrations/007_enforce_appointment_tenant_relationships.sql`
  (create)
- `backend/src/database/migrationContracts.js` (official migration set)
- `backend/src/database/migrationSchema.js` (migration 007 baseline signature)
- `backend/test/migrationRunner.test.js`
- `backend/test/publicoService.test.js` (tenant/error regressions only)
- `backend/test/integration/appointmentTenantRelationships.integration.test.js`
  (create)
- `backend/src/services/publicoService.js` only if a failing regression proves
  tenant constraint errors escape unsanitized
- `README.md`
- `MIGRACAO.md`
- `docs/POSTGRES-SUPABASE.md`
- `plans/README.md` (status row only)

**Out of scope**:

- Editing migrations 001-006 or applied history.
- Moving, merging, deleting, or guessing ownership of inconsistent rows.
- Cross-business service/professional sharing, multi-unit architecture, or
  permission redesign.
- Changing public API routes, successful response shapes, appointment statuses,
  availability rules, or frontend behavior.
- Adding redundant child indexes without query/constraint evidence.
- Removing tenant predicates because the database now has constraints.
- Provider deployment or production data inspection.

## Git workflow

- Branch: `codex/019-appointment-tenant-constraints`
- Suggested commits:
  - `feat(database): enforce appointment tenant relationships`
  - `test(agendamentos): cover cross-tenant relationship rejection`
- Do not push, deploy, or open a PR unless instructed.

## Steps

### Step 1: Add failing real PostgreSQL characterization

Create the integration file with plan 016's guarded harness and migrate through
migration 006. Seed two synthetic businesses, each with one service and
professional.

Prove current PostgreSQL incorrectly accepts direct inserts where:

1. appointment business A references service B and professional A;
2. appointment business A references service A and professional B;
3. appointment business A references both service B and professional B.

Keep times non-overlapping so the appointment exclusion constraint does not
mask the tenant finding. Query joined owner IDs to prove the bad relationship,
then roll back/clean the isolated fixture.

Also assert a same-business appointment succeeds. If current schema already
rejects every bad insert through an equivalent constraint, STOP and report the
catalog evidence; do not add duplicate constraints.

**Verify**: characterization fails the desired invariant only in the guarded
disposable database.

### Step 2: Add migration 007 with a read-only mismatch guard

Create `007_enforce_appointment_tenant_relationships.sql`. Begin with one
sanitized `DO` guard that counts, without returning row data:

- appointments whose service is missing or has a different `negocio_id`;
- appointments whose professional is missing or has a different `negocio_id`.

Existing single-column foreign keys should make missing parents impossible,
but the guard must not assume that deployed constraints are healthy. If either
count is nonzero, raise an exception containing counts only. Do not print IDs,
customer fields, business names, or contact data.

Plan 016's transaction must ensure the guard failure creates no migration
history or schema mutation.

**Verify**: integration fixture with bad rows fails migration 007 and retains
the exact original rows/constraints/history state.

### Step 3: Add exact composite parent keys and foreign keys

After the guard passes, migration 007 must:

1. Add `uk_servicos_id_negocio_id` on `servicos(id, negocio_id)`.
2. Add `uk_profissionais_id_negocio_id` on
   `profissionais(id, negocio_id)`.
3. Add `fk_agendamentos_servico_negocio` from
   `agendamentos(servico_id, negocio_id)` to
   `servicos(id, negocio_id)` as `NOT VALID`.
4. Add `fk_agendamentos_profissional_negocio` from
   `agendamentos(profissional_id, negocio_id)` to
   `profissionais(id, negocio_id)` as `NOT VALID`.
5. Validate both new foreign keys.
6. Only after validation, drop old single-column
   `fk_agendamentos_servico` and `fk_agendamentos_profissional`.
7. Preserve `fk_agendamentos_negocio`, delete restrictions, and the established
   update behavior unless catalog/testing proves a cascade conflict. Do not
   silently weaken referential actions.

Use explicit names and schema qualification. Do not use `IF NOT EXISTS` to
accept an unknown same-named object. The outer runner transaction makes the
whole transition atomic.

The parent composite unique indexes are structurally required even though `id`
is already a primary key. Do not add new appointment indexes: existing indexes
starting with `servico_id`/`profissional_id` are sufficient for the FK lookup
because those IDs are globally unique. Confirm with catalog and query plans.

**Verify**: on clean real PostgreSQL, migration 007 applies once and its second
runner invocation is a no-op.

### Step 4: Extend structural baseline verification

Update plan 016's baseline verifier and unit tests for migration 007. Exact
signature requires:

- both named parent composite unique constraints with ordered columns;
- both named composite appointment FKs with ordered local/referenced columns
  and expected referential actions;
- both new FKs validated;
- old single-column service/professional FKs absent;
- business FK and appointment exclusion constraint still present;
- no unexpected duplicate parent/child index introduced by this migration.

A mix of old and new foreign keys, unvalidated constraint, reversed column
order, wrong referential action, or only one relationship must be rejected as
partial state without inserting history.

**Verify**: runner unit/integration baseline fixtures cover exact, partial,
reversed, unvalidated, and incompatible definitions.

### Step 5: Prove direct database enforcement and preserved behavior

After migration 007, repeat Step 1. Assert cross-tenant inserts fail with
PostgreSQL `23503` and the exact corresponding composite constraint name.

Also test:

- same-business insert succeeds;
- adjacent/non-overlapping scheduling behavior remains unchanged;
- appointment exclusion constraint still rejects active overlap;
- deleting a referenced service/professional remains restricted;
- valid updates retain relationships;
- a failed cross-tenant insert leaves no appointment or partial side effect.

Query final rows and catalogs. Do not accept only thrown promises as evidence.

**Verify**: guarded real PostgreSQL suite passes repeatedly.

### Step 6: Preserve application-level tenant isolation and safe errors

Add service regressions proving public creation with business A plus service or
professional from business B returns the existing not-found/public-safe
contract and inserts no row. The error must not reveal that the foreign object
exists under another business.

Keep all current tenant-scoped service queries. The new composite FKs are a
last boundary, not a reason to remove validation.

If a real, already tenant-validated write can race into a composite `23503`,
verify centralized error middleware returns a sanitized internal response. Make
the smallest scoped service change only if a raw database error/detail reaches
the public contract. Never translate all `23503` errors to not-found without
matching the exact constraint and understanding the race.

**Verify**: unit plus integration tests show cross-tenant object existence and
constraint names are absent from public errors/log fixtures.

### Step 7: Document invariant, preflight, and operator response

Update active PostgreSQL docs with:

- migration 007 and its two mismatch counts;
- a read-only diagnostic query that returns counts before deployment;
- zero mismatches as the apply prerequisite;
- backup and human investigation when mismatches exist;
- prohibition on automatic reassignment/deletion;
- durable invariant: appointment, service, professional, and business share one
  `negocio_id`;
- continued requirement for Express authorization and tenant predicates;
- no claim that migration 007 is live until directly verified.

Keep examples synthetic and free of customer data.

**Verify**:
`rg -n "007_enforce_appointment_tenant_relationships|fk_agendamentos_servico_negocio|fk_agendamentos_profissional_negocio" README.md MIGRACAO.md docs backend/database/postgres-migrations`
and review every match.

### Step 8: Run the complete gate and update the index

Run unit/integration tests, audit, whitespace check, and remote CI. Use
`security-review`, `scheduling-rules`, and `pre-commit-checklist` review. Inspect
for PII in diagnostics, automatic repair, lost delete restrictions, constraint
order errors, redundant indexes, removed tenant predicates, or unrelated code.

Mark plan 019 `DONE` only when clean/dirty migrations, baseline, direct SQL,
service behavior, and remote CI all satisfy the criteria.

## Done criteria

- [ ] Dirty-data guard reports counts only and rolls back without schema,
      history, or row mutation.
- [ ] Exact composite unique keys support exact validated composite foreign
      keys for service/business and professional/business.
- [ ] Old single-column service/professional FKs are removed only after the new
      constraints validate; business FK/referential actions remain correct.
- [ ] Direct cross-tenant writes fail with exact `23503` constraints; valid
      same-tenant writes succeed.
- [ ] Scheduling exclusion, delete restrictions, and valid update behavior are
      preserved.
- [ ] Runner baseline recognizes only the complete migration 007 signature.
- [ ] Service tenant predicates and non-enumerating public errors remain intact.
- [ ] Unit and guarded PostgreSQL integration tests pass locally and in CI.
- [ ] No real data, applied migration, frontend file, or provider state changed.
- [ ] `git diff --check` exits 0 and only in-scope files changed.
- [ ] `plans/README.md` marks plan 019 `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Plans 015, 016, or 018 are incomplete; migration 007 already exists; or an
  applied migration/history checksum drifted.
- Any cross-tenant/missing-parent row exists outside the confirmed disposable
  test database.
- Product requirements intentionally allow cross-business service or
  professional sharing.
- Equivalent constraints/indexes already exist with unknown definitions.
- Composite cascades create conflicting update paths that cannot preserve all
  tenant relationships safely.
- Migration would require choosing ownership, deleting rows, disabling a
  constraint, or logging customer/business data.
- Correct public handling requires hiding an unrelated referential error.
- Reliable verification would require shared/production data.
- A gate fails twice after one reasonable evidence-based correction.

## Maintenance notes

- Every future appointment foreign relationship must include the tenant key or
  an equivalently strong database invariant.
- Keep service authorization even when constraints make corruption impossible;
  constraints do not decide who may act.
- Review ownership transfer, multi-unit, shared-resource, or service-catalog
  features against these constraints before implementation.
- Extend real PostgreSQL tests whenever appointment relationships or referential
  actions change.

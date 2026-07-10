# Agendai Deep Code Quality Audit

Audited on 2026-07-10 at commit `5020d22d241d93390b69605fa9a4763efdc242db`.
This report combines the thermo-nuclear maintainability review with security,
scheduling, data-model, frontend, operational, test, documentation, and product
direction reviews. It is evidence for the implementation plans; it does not
claim that the findings have already been fixed.

## Verdict

**Not approved as production-quality yet.**

The repository has a solid small-product foundation: tenant-aware service
queries are common, SQL is parameterized, passwords are hashed, public
appointment tokens are stored as hashes, conflict checks use transactions in
the critical public paths, and both applications build under the inspected
runtime. The code is also considerably better than a disposable prototype.

The production bar is missed because one dashboard control invokes a function
that does not exist, several frontend flows can display state that contradicts
the server, core business invariants are not enforced by the database, and no
CI or repeatable migration process proves the system against a real MySQL
instance. Large page, service, and CSS files then make these defects easier to
introduce and harder to isolate.

## Scope and method

- Read all tracked application, migration, test, deployment, and planning files.
- Traced authentication, tenant ownership, CRUD, public booking, public
  management, status changes, availability, uploads, and error handling.
- Reviewed git history and churn around current hotspots.
- Ran backend and frontend tests and production builds.
- Compared validation rules with MySQL column and constraint definitions.
- Counted large files and repeated CSS selectors/definitions.
- Checked runtime manifests, lockfiles, deployment documentation, and CI setup.
- Did not read the ignored local `.env` file or reproduce any secret.

## Repository shape

| Area | Evidence | Consequence |
|---|---|---|
| Frontend CSS | Six main CSS files total 7,858 lines; `styles.css` alone has 3,433 | Ownership and cascade order are difficult to reason about |
| Frontend pages | `Dashboard.jsx` 934 lines, `AgendamentoPublico.jsx` 799, `Negocio.jsx` 708 | Data loading, mutations, derived data, and presentation are coupled |
| Backend scheduling | `publicoService.js` 962 lines | Token management, availability, validation, SQL, and transactions share one module |
| Verification | Backend has 30 passing tests; frontend has a Vitest baseline but no lint gate | Runtime identifier and interaction regressions can escape |
| Delivery | No `.github/workflows`, migration runner, root runtime pin, or Railway readiness contract | Local success is not reproduced automatically |
| Recent churn | In the last 30 commits, `landing-page.css` changed 10 times, `professional-public.css` 8, and `LandingPage.jsx` 7 | Visual layers are both large and frequently edited |

## Ranked findings

| ID | Priority | Area | Evidence and impact | Planned response |
|---|---|---|---|---|
| F-01 | P1 | Frontend correctness | `Dashboard.jsx:897,905` calls `atualizarPeriodo`, but no definition exists. Changing either report date throws a `ReferenceError`; the production build cannot detect an unresolved runtime identifier. History shows the helper was removed while its callers remained. | Plan 010 |
| F-02 | P1 | Public booking correctness | `AgendamentoPublico.jsx:234-268` performs the booking POST, commits success state, then refreshes slots inside the same `try/catch`. If the refresh fails after a successful insert, the page tells the client booking failed and invites a duplicate attempt. | Plan 011 |
| F-03 | P1 | Public management correctness | `GerenciarAgendamento.jsx:289-365` hides actions only for `cancelado`. A `concluido` appointment still renders confirm, reschedule, and cancel controls even though backend terminal-state rules reject them. | Plan 011 |
| F-04 | P1 | Async state | Date/slot requests in public booking and management have no latest-request guard. A slower response for an older selection can overwrite the current selection; this is especially dangerous before rescheduling. | Plan 011 |
| F-05 | P1 | Data invariant | `criarNegocio` uses SELECT-then-INSERT, while migration 001 has only an index on `negocios.usuario_id`. Concurrent requests can create more than one business for a user even though services assume one row with `LIMIT 1`. | Plans 013 and 014 |
| F-06 | P1 | Database lifecycle | Migration 001 creates and selects a fixed database; migrations are manual, untracked, and untested against a disposable MySQL service. Plan 003 cannot safely prove concurrency behavior without that foundation. | Plan 013 |
| F-07 | P1 | Appointment concurrency | Admin status activation checks for an overlap and then updates without one shared transaction/lock strategy with public cancel, reschedule, and create flows. Two writers can validate stale state and violate the active-slot invariant. | Plans 013 then 003 |
| F-08 | P1 | Delivery | There are no GitHub Actions workflows or lint command. The missing dashboard identifier therefore passed existing builds and tests. | Plan 012 |
| F-09 | P2 | Public identity | `negocioService.js:420-425` regenerates `slug_publico` whenever the business name changes. Previously shared links and QR codes silently break for a cosmetic rename. | Plan 014 |
| F-10 | P2 | Slug concurrency | Slug generation checks availability before insert. Concurrent equal names can race into the unique constraint without a bounded retry and deterministic public error. | Plan 014 |
| F-11 | P2 | Password boundary | Registration enforces only a minimum. bcrypt compares only the first 72 bytes, so distinct long UTF-8 inputs with an identical 72-byte prefix can authenticate as the same password. Validate the UTF-8 byte limit consistently at registration and login. | Security follow-up |
| F-12 | P2 | Abuse protection | `app.js:68-78` provides one global 100-request/15-minute limiter. Login, registration, public mutation, and token-management routes have no tighter policies or explicit trust-proxy validation. | Security follow-up |
| F-13 | P2 | Capability logging | In non-production, the error logger records `req.originalUrl`. Public management tokens live in the path and can enter logs when an error occurs. Redact capability-bearing segments before logging. | Security follow-up |
| F-14 | P2 | Tenant/data integrity | Appointment foreign keys independently reference business, service, and professional IDs. The database cannot prove that all three belong to the same business; current services validate it, but an alternate write path or migration could create cross-business rows. | Data-model follow-up after plan 013 |
| F-15 | P2 | Validation/schema alignment | Several string, integer, decimal, and text validators do not systematically derive or test the MySQL column bounds. Oversized inputs can become database errors instead of stable 400 responses. | Backend validation follow-up |
| F-16 | P2 | Business availability | Nullable/legacy `dias_funcionamento` values still require an explicit product contract. Public behavior must never infer "open every day" merely because schedule data is missing. | Extend scheduling regression coverage |
| F-17 | P2 | Auth state | `AuthContext.jsx:26-37` clears a valid token for any startup `/me` failure, including transient network/5xx failures, while later 401 responses do not centrally invalidate the in-memory user. | Auth lifecycle follow-up |
| F-18 | P2 | Async admin state | Dashboard, Agenda, Clientes, and public management loads do not consistently cancel or sequence overlapping requests. Old results can replace newer filters or dates. | Start with plan 011, then shared query-state follow-up |
| F-19 | P2 | Business form state | The business page conflates "no business exists" with "the request failed"; a failed fetch can expose a create path and produce a confusing conflict. | Frontend state-model follow-up |
| F-20 | P2 | Customer identity | Dashboard customer metrics use trim/lowercase matching while Clientes removes diacritics through a separate helper. The same records can be grouped differently in two product surfaces. | Canonical customer identity helper |
| F-21 | P2 | API/tenant tests | Service tests cover important rules, but there is no HTTP-boundary suite systematically proving auth middleware, status mapping, payload limits, and cross-tenant denial for every private route. | Integration-test wave after plan 013 |
| F-22 | P2 | Operations | The health endpoint does not provide a distinct readiness guarantee backed by a database check; deploys can accept traffic before dependencies are usable. | Runtime/operations follow-up |
| F-23 | P2 | Upload durability | Local upload behavior is implemented and signature-checked, but production persistence depends on host storage configuration that is not enforced at startup or exercised in deploy verification. | Deployment follow-up |
| F-24 | P3 | Maintainability | The CSS audit found 135 selector names repeated across files and 327 repeated definitions in broad global layers. Adding another override is now cheaper locally but more expensive globally. | CSS ownership/decomposition wave |
| F-25 | P3 | Maintainability | `publicoService.js` is a 962-line god module. Repeated booking/rescheduling branches mix pure scheduling rules with SQL execution and token state. | Extract pure scheduling kernel, then repository executor |
| F-26 | P3 | Maintainability | Protected shell/business loading and CRUD lifecycle logic are repeated across pages; service/professional pages duplicate mutation and pending-state behavior. | Persistent admin layout and narrow CRUD lifecycle hook |
| F-27 | P3 | PWA correctness | Service-worker registration also occurs in development, uses a fixed cache strategy, and does not consistently tie cache writes to the worker lifetime. | Focused PWA plan |
| F-28 | P3 | Visual contract | Styles declare Poppins-oriented typography, but the production frontend does not establish a reliable font-loading contract. | Include in CSS/design-system wave |
| F-29 | P2 | Documentation/runtime | README setup and deploy instructions drifted after plan 009, backend lock metadata still permits Node 18, and the tracked prototype `.npmrc` contains a machine-specific cache path plus `audit=false`. | Plan 012; plan 009 marked stale |

## Thermo-nuclear maintainability review

### Repetition

- CSS repeats ownership of the same shells, cards, messages, buttons, responsive
  rules, and reduced-motion behavior across global files.
- Service/professional CRUD pages repeat fetch, form, mutation, status-message,
  and active/inactive lifecycle code.
- Customer identity, async request state, and business-presence state are
  implemented differently by each page.
- Scheduling validation and active-conflict behavior span public create,
  reschedule, and admin activation paths without one executable invariant.

### Wrong or missing abstractions

- The backend needs a small pure scheduling kernel for time arithmetic, allowed
  status transitions, slot alignment, and overlap predicates. SQL/transaction
  orchestration should call it; it should not own database access.
- The frontend needs canonical helpers for customer identity and latest-request
  sequencing. A general state-management framework is not justified.
- Admin routes need a persistent layout/business boundary so every page does not
  rediscover the same authenticated business.
- CSS needs explicit layer/feature ownership before any component extraction.

### Conditional growth

- Public appointment management checks individual disallowed statuses in view
  branches. Use one capability predicate derived from server-supported terminal
  states.
- Authentication branches treat transport, authorization, and server failure as
  the same event.
- Business load state represents absent, loading, and failed with overlapping
  null/boolean combinations.

### Giant-file risk

Large files are not defects by line count alone. These are defects because each
file owns unrelated reasons to change: `Dashboard.jsx` mixes queries, metrics,
exports, filters, and presentation; `publicoService.js` mixes public lookup,
tokens, availability, writes, and transactions; global CSS mixes legacy and
professional shells. New behavior should first create tested seams, then move
one responsibility at a time.

## Recommended execution order

1. Plan 010: restore dashboard report-period controls and add a regression test.
2. Plan 011: make public booking/management UI authoritative after mutations.
3. Plan 012: pin Node 24, add lint and CI, and repair runtime documentation.
4. Plan 013: automate migrations and add disposable-MySQL verification.
5. Plan 003: prove and fix appointment conflict concurrency on that database.
6. Plan 014: enforce one business per user and make public slugs durable.
7. Follow with route-specific abuse protection, token redaction, password byte
   bounds, HTTP tenant-isolation tests, and database ownership invariants.
8. Only then perform CSS and `publicoService` decomposition behind tests.

## Product directions worth considering

- Availability exceptions and manual blocks before more advanced calendar UI.
- First-class customer identity/history only after canonical grouping rules and
  privacy/retention decisions are explicit.
- Reliable reminders through adapters and idempotent jobs before two-way
  calendar integrations.
- Operational dashboards only after stable readiness, migrations, and event
  definitions exist.

Payments, marketplace, multi-unit support, native apps, and advanced permission
models remain plausible long-term work, but none outranks correctness,
isolation, migration safety, and recoverable operations.

## Findings checked and rejected

- No tracked `.env` or plaintext password was found. The ignored local env file
  was intentionally not opened.
- Upload validation is not "MIME only": the code also validates image signatures.
- Express 4 is old but not, by itself, the cause of the current defects; a
  framework migration would add risk without closing the top findings.
- A monorepo/workspace conversion is not required to add CI and runtime pins.
- Route lazy loading and XLSX dependency changes may help performance/tooling,
  but current evidence does not rank them above correctness and delivery gates.
- Dependency vulnerability status is **unknown**, not clean: registry access was
  unavailable during this run, so npm audit could not produce trustworthy
  results.

## Verification evidence

- `backend: npm.cmd test` - passed, 30/30 tests.
- `frontend: npm.cmd test -- --run --configLoader runner` - passed, 11 files
  and 28/28 tests.
- `frontend: npm.cmd run build -- --configLoader runner` - passed, 2,008
  modules transformed and production output written.
- `design-prototype: npm.cmd run build -- --configLoader runner` - passed,
  1,800 modules transformed and production output written.
- The default Vite config loader could not traverse a protected parent directory
  in this managed Windows workspace; the supported runner loader avoided that
  environment-specific traversal.
- npm audits were inconclusive because registry/network access was unavailable.
- `git diff --check -- plans` had no audit-generated whitespace error; the only
  pre-existing worktree change was `.codex/config.toml`.

## Audit boundary

This review proves repository behavior and static design at the audited commit.
It does not prove the deployed Vercel/Railway configuration, production
environment variables, backup restoration, upload-volume persistence, current
database contents, provider quotas, or real concurrent behavior. Plans 012 and
013 create the minimum repeatable evidence needed for those claims.

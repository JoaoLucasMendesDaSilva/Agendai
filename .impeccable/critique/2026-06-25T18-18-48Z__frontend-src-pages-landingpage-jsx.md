---
target: frontend/src/pages/LandingPage.jsx
total_score: 29
p0_count: 0
p1_count: 1
timestamp: 2026-06-25T18-18-48Z
slug: frontend-src-pages-landingpage-jsx
---
## Landing Page Critique

### Design Health Score
Total: 29/40. Good foundation, but the page is longer and more templated than the brand promise asks for.

### Anti-Patterns Verdict
LLM assessment: does not look cheaply generated, but it still has AI-scaffold tells: repeated uppercase kickers, a large identical feature-card grid, and a pricing block that feels broader than the MVP.
Deterministic scan: clean. `detect.mjs --json frontend/src/pages/LandingPage.jsx` returned `[]`.
Visual evidence: desktop and mobile rendered without horizontal overflow. Overlay injection failed after mutable preflight with `ERR_CONNECTION_REFUSED`, so no reliable visible overlay was available.

### Priority Issues
- P1: Scope mismatch in pricing/plans. Paid tiers, annual prices, multiple units, support priority, and plan limits imply product/business capabilities beyond the TCC MVP. Fix by making the section explicitly demonstrative or moving it out of the main conversion path.
- P2: Repeated uppercase section kickers create an AI-scaffold cadence. Fix by keeping only one or two intentional labels and letting section titles carry the rhythm.
- P2: Feature grid is too catalog-like. Fix by grouping resources around the booking workflow instead of nine same-pattern icon cards.
- P2: Trust proof is mostly asserted, not evidenced. Fix by replacing the illustration/mockup blend with real product screenshots or a more grounded product journey.

### Persona Red Flags
Jordan, first-timer: understands the value quickly, but may read the long resource/pricing list as more complex than expected.
Riley, stress tester: will notice the plan claims that are outside MVP and question reliability.
Casey, distracted mobile user: primary hero works well on mobile, but the full page becomes a long scroll before enough proof accumulates.

### Minor Observations
CTA wording is clear. Navigation is simple. The first viewport is strong and responsive.

### Questions to Consider
Should the landing sell the MVP as a simple operational tool, or present a larger SaaS roadmap? Should pricing stay visible now, or become a demonstrative academic section lower on the page?

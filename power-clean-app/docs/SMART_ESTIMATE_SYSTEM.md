# Power Clean Smart Estimate System

Current release candidate: `feature/smart-estimate-automatic-costing` (PR #8); base: `power-clean-app-foundation`.
Entry: Estimate Builder → Open Smart Estimator, or customer → Create smart estimate.

## Implemented behavior

- Multiple rectangular, stair and memorial areas; every length accepts separate feet and inches.
- Organic growth / SH, Mud May-Day clay, Amazon rust product placeholder, Super Seal Siloxane, Wood Wizard, and conservation-compatible memorial cleaner.
- Specialty add-ons have independent affected percentages and severity. Duplicate treatments are rejected.
- Eight stair materials: concrete, brick, pavers, natural stone, wood, composite, tile, metal. Geometry includes treads, risers, stepped side profiles, and multiple landings. Unusual shapes should be split into separate areas.
- Memorial faces are selectable; bases/blocks use separate areas. Labor includes area productivity, dwell, lettering/detail and access/protection. Unknown stone and missing permission/condition/label/test patch checks block finalization. SH, acids, sealer and pressure washing are not offered for memorials.
- Light, moderate and heavy severity estimate 1, 2 and 3 application passes, respectively. An editable $30/hour baseline maps to $25/$30/$35 per person-hour. Severity-based passes multiply application quantities and time; product coats are additional. Verify this conservative model against the actual job to avoid double-counting coats/passes.
- All application coverage, ratios, SH targets, material productivity factors, coats, dwell, waste and labor rates are editable operator assumptions. None are represented as manufacturer directions. Current product labels and site-specific testing must be reviewed before finalization.
- Rust treatment has an operator-provided **$85 provisional purchase price**, but the exact product identity, listing, shipping, container size, compatibility, and application inputs still require verification. The price alone does not authorize finalization.
- Applied solution, concentrate, water and surfactant volumes; tank batch guidance and SH inventory shortfall warnings. Downstream draw ratios are not assumed.
- Landed chemical cost amortizes container shipping by consumed concentrate. Labor is person-hours; equipment/overhead use clock-hours. Setup, cleanup, travel and fuel are allocated once per job. Overhead should exclude costs already entered separately.
- Target operating margin uses `price = cost / (1 - margin)`, distinct from markup. A 30% target is the initial preference. The job minimum applies once; largest-remainder cent allocation preserves nonnegative item amounts and exact totals.
- Shared costs are allocated proportionally to direct service costs. Conservative dwell time is charged per application, without overlapping separate applications or claiming productivity gains.
- Customer and service-address ownership checks, server-side recalculation, versioned snapshots, cloud draft save/restore, customer profile draft links, finalized estimate history, status/approval/job scheduling through existing workflows.
- Atomic database transaction creates snapshot, estimate and items. Retries against the saved draft return the original estimate. Finalized snapshots are locked; create a new estimate with the same settings to revise. Existing estimate records are not replaced.
- Customer-facing services, optional dimensions, total, logo, notes, PDF download and browser print. Internal chemical/cost/profit data are excluded from the customer PDF.
- No estimate discounts or taxes are introduced by Smart Estimator; it saves zero discount/tax. Applicability of taxes should be resolved before using it for taxable services.

## Database compatibility and safety

Two additive migrations create `smart_estimate_drafts`, scoped RLS policies, indexes and a SECURITY INVOKER finalization function. Existing tables, customer data, agreements, signatures, photos and estimates are not migrated or deleted. Existing estimate/status/job workflows remain available. Direct legacy editing of smart estimate prices is blocked in the application to keep PDFs consistent with snapshots.

Applied and tested on the Power Clean database. `tests/smart-estimate-database.sql` creates disposable customers/addresses, switches to the authenticated role, tests persistence/finalization/retry/rollback/address ownership/business isolation, and rolls back every row.

## Verification

Run from `power-clean-app`:

```
npm ci
npm run test:regression
npm run typecheck
npm run lint
npm run build
```

Database test: run `tests/smart-estimate-database.sql` with an administrative test connection; it simulates authenticated RLS access and rolls back.

Existing GitHub quality workflow runs regression tests, types, lint and build on the draft PR. Production merge and promotion require the owner's approval after private preview review. Do not merge automatically.

## Remaining acceptance checks

- Verify exact rust-product identity (provisional $85), all current purchase prices, shipping, labels, and application assumptions.
- Enter and review equipment hourly cost, travel fuel, overhead hourly cost, and any other missing operating costs; do not use invented zeroes merely to bypass the finalization gate.
- Validate that severity passes and product coats do not double-count the same real-world applications.
- Complete authenticated browser save/reload/finalize/PDF/customer-history checks on mobile and desktop. This session initially had no active application login.
- Review the private Vercel preview and required GitHub quality checks before approving production.

Supabase security advisor found no new smart-estimator security-definer warnings; pre-existing public token-based signing/estimate RPC warnings and leaked-password protection warning remain outside this change. See https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

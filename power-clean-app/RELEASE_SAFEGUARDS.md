# Power Clean release safeguards

## Non-negotiable rules
1. Make changes on a feature branch. Never use real customer images or signing tokens as test fixtures.
2. Run `npm ci && npm run test:regression && npm run typecheck && npm run lint && npm run build` in `power-clean-app`.
3. Confirm customer profile, photo gallery, photo upload/delete, job photo gallery, agreements, estimates, jobs, and invoices still work. Automated source guards are not substitutes for browser and authenticated end-to-end tests.
4. Open a pull request and review the changed files. Require the Power Clean quality-gates check to pass before merging. Configure GitHub branch protection/rulesets to enforce the check; adding a workflow alone does not enforce branch protection.
5. Verify preview deployment with a test account and disposable photos. Verify both storage deletion and gallery refresh. Never test destructive operations on customer data.
6. Deploy one reviewed release, then verify production with the same checklist. A Vercel READY status proves build completion, not user-flow correctness.
7. If verification fails, stop release and restore the last known-good production deployment using Vercel rollback/promotion after checking target and environment. Preserve database state and investigate separately; code rollback does not restore deleted storage objects.

## Release evidence
Record commit SHA, CI run, preview URL, environment, test results, production deployment ID, and rollback target in the pull request.

## Current limitations
These regression tests check critical source invariants; they do not execute authenticated browser flows. Supabase Storage access and role permissions must be tested against an isolated test customer with disposable files. GitHub rulesets and Vercel deployment checks must be configured separately to enforce promotion gates.

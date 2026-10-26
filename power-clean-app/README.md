# Power Clean — Business Operations App

Mobile-first business management platform for pressure washing and soft washing.

## Development status
Planning and repository foundation. No production application is deployed yet.

## Phase 1 scope
- Customer and lead CRM with job and contact history
- Service price book and estimates
- Job scheduling and status tracking
- Invoices, payments, and expense tracking
- Inspection forms, job photos, and before/after documentation
- Customer contracts and releases sent via email or SMS links
- Customer electronic signatures, signed PDF storage, document versions, timestamps, and audit trail

## Core workflow
Lead → property details → estimate → approval → contract/release signing → scheduling → job documentation → invoice/payment → review request.

## Architecture proposal
Next.js / TypeScript / Tailwind CSS; PostgreSQL with Supabase authentication and storage; Stripe payments; transactional email and SMS providers. All integrations require configuration and credentials before use.

## Safety and implementation notes
- Do not put credentials in GitHub or client-side source.
- Enforce account-level permissions and tenant isolation on every record.
- Validate electronic signature consent, audit events, and retention requirements before production.
- Customer messaging must follow applicable consent and opt-out requirements.
- Photo-based surface measurements are estimates requiring human confirmation.

See docs/PHASE_1_REQUIREMENTS.md and docs/ARCHITECTURE.md.

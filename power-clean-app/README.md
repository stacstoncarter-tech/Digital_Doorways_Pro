# Power Clean — Business Operations App

Mobile-first business management platform for pressure washing and soft washing.

## Development status
Responsive Next.js development preview scaffolded. Customer creation/search works only in temporary in-memory state; refreshing clears entries. Supabase authentication and database-backed customer routes are coded but require project credentials and migrations. Messaging, payment processing, and production deployment do not exist yet.

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

## Run locally

```bash
cd power-clean-app
npm install
npm run dev
```

Open http://localhost:3000. To check code, run `npm run typecheck`, `npm run lint`, and `npm run build`. These checks have not yet been executed in CI.

**Privacy:** The current customer form is a UI prototype only. Do not enter real customer personal information until secure authentication, database policies, and data retention controls are implemented.

## Backend setup

See [Supabase setup](docs/SUPABASE_SETUP.md) for database migration, account provisioning, and row-level security validation. The root dashboard remains a nonpersistent UI preview; use `/login` and `/customers` for the new backend-connected flow after configuring Supabase. Do not enter real customer information before security tests.

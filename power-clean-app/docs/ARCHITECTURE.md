# Proposed architecture (pending implementation)

- Frontend: Next.js App Router, TypeScript, Tailwind CSS; responsive web UI.
- API: authenticated server-side route handlers or server actions.
- Data: PostgreSQL; tenant-scoped tables for users, customers, properties, leads, estimates, estimate_items, jobs, job_photos, invoices, payments, expenses, document_templates, documents, signature_events, and message_deliveries.
- Auth and object storage: Supabase with row-level security and private buckets.
- Integrations: email/SMS transactional providers, e-sign provider or legally reviewed custom signing workflow, Stripe for payments.
- Deploy: Vercel with separate staging and production environments.

## Initial implementation order
1. Bootstrap app and CI, environment example, lint/typecheck/test.
2. Authentication, roles and tenant-scoped schema.
3. Customer CRUD and property records.
4. Services, estimates and approval.
5. Document template and signing integration.
6. Scheduling and jobs.
7. Invoices, expenses and photos.

This document describes a plan, not completed integrations.

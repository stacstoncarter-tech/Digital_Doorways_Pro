# Phase 1 requirements

## Customers
Customer records, leads, service/billing addresses, notes, contact preferences, lead sources, and history.

## Estimating
Services and configurable price book, square-foot measurements entered by staff, minimum charges, travel adjustments, material/labor costs, PDF estimates, and approval status. No unverified image measurement should automatically become a final quote.

## Scheduling and jobs
Calendar, job statuses, assigned staff, job checklist, photo upload, before/after labels, and customer history.

## Contracts and releases
Reusable versioned templates; associate a document with a customer, estimate and job; send secure signing link by email or SMS; record delivery attempts and status (draft, sent, viewed, signed, declined, expired); capture explicit electronic signature consent; record signer identity method, timestamp and audit events; create tamper-evident signed PDF; allow customer and staff to download copies. Restrict access and set retention rules. Permit an authorized override to scheduling gates with recorded reason.

## Billing and expenses
Invoice creation, payment status, partial payments, expense categories, and basic job profitability. Payment card details should be handled by a compliant processor, not stored directly in this app.

## Definition of done
Authentication, per-role authorization, input validation, database migrations, automated tests, accessibility checks, and secure storage must be implemented before production release.

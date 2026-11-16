# Repeatable QA authentication

Run `npm run test:qa-auth` with Node 22 or newer after loading the four variables below from Vercel's encrypted preview environment for project `power-clean-operations`, branch `feature/awning-canopy-geometry`.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `POWER_CLEAN_QA_EMAIL`
- `POWER_CLEAN_QA_PASSWORD`

List branch-specific environment IDs, then use the connected Vercel get-project-environment tool for each ID to retrieve its decrypted value. The list response may contain ciphertext even when decryption is requested. Keep values inside tool execution or a temporary file with mode 0600. Never print them, commit them, put them in reports, or use a `NEXT_PUBLIC_` prefix for the password. Remove temporary credential files after the run. The account is `power-clean-automation@example.invalid`, provisioned only in QA project `snsnhnovinjqpiwrqspe`, with staff membership in the separate `Power Clean Automation QA` business.

The runner checks the target before authenticating, signs in with a password, refreshes the session, verifies business membership, reads customers within its QA business, checks business isolation, and signs out. Each run obtains a fresh session. It requires no interactive sign-in once the encrypted variables are loaded. Credentials are usable across future test runs even after a local workspace reset.

Example with a securely prepared environment file outside the repository:

```sh
node --env-file=/path/to/private-qa.env scripts/qa-auth.mjs
```

Run failures report the failed step without including authentication responses.

This is an on-demand API authentication test. Browser session persistence, browser credential entry, and the complete estimate-to-PDF browser test require separate verification. Vercel deployment protection also has its own authentication. Production release remains subject to the user's explicit approval.

## Canopy integration check

Start the production build on 127.0.0.1 port 3015 with the QA environment, then run `npm run test:qa-canopy` in the same network environment. This writes disposable QA customers and estimates and retains them for inspection. It verifies dimensions, discounts, draft save/reopen, finalization retries, customer acceptance/denial, and authenticated PDF responses. Product review flags and costs in these snapshots are synthetic test inputs.

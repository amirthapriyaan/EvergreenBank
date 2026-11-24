# Evergreen Bank — Project setup

The React + Vite Evergreen customer/admin application is added under `src/evergreen/`. The original Banking Switch portal implementation remains in its original source modules (`src/LiveBank.jsx`, `src/live-api.js`, `src/amount.js`, `src/bank-config.js`, `src/cloudflare-config.js`, `src/live.css`, `src/style.css`). The app entry is routed through `src/evergreen-entry.jsx`.

## Included

- Sign in and customer registration using Firebase Authentication REST.
- Customer overview, accounts, transfers, beneficiary management, basic loan applications and portfolio summary.
- Admin overview, customer directory, KYC review, account overview and transfer-limit management.
- KYC approve / hold / reject. Approval creates an account, one-time ₹1,000 demo opening credit (100000 paise), ledger entry and portfolio record.
- Same-bank and interbank requests sent through the existing SharedBank switch. Only successful switch responses are mirrored to Evergreen `transfers`.
- Firestore REST data access; no Firebase SDK, Express, Cloud Functions or new hosting service.

## Setup steps

1. Use Node.js 20+ (22 recommended).
2. In Firebase Console, enable **Authentication → Email/Password**.
3. Create `.env` from `.env.example`; set `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID`. The project ID defaults to `evergreen-2b12e` but confirm it in your Firebase Console.
4. Deploy `firestore.rules` to the Evergreen Firestore database.
5. Ensure the pre-created admin has a Firebase Auth account and a matching `users/{uid}` Firestore document with `uid`, `bankId: P675`, `email`, `role: ADMIN`, and `status: ACTIVE`.
6. Customer registration creates Firebase Auth + `users/{uid}` + `kyc_requests/{requestId}` records. A pending customer can sign in to see application status; banking account actions become usable after approval.
7. Run `npm ci`, then `npm run dev`. Build with `npm run build`.

## Existing 18 Firestore collections

The included Postman pack has REST templates for all 18 names, which are preserved: `users`, `sessions`, `kyc_requests`, `accounts`, `beneficiaries`, `transfers`, `ledger_entries`, `transfer_limits`, `daily_usage`, `idempotency_keys`, `interbank_inbox`, `loans`, `portfolios`, `notification_outbox`, `audit_logs`, `bank_settings`, `request_nonces`, and `relationship_managers`. Existing records are not seeded, reset, or overwritten by setup. The Postman environment intentionally uses placeholders for the Web API key and project ID.

## Important limitations

- The uploaded original portal signs into the shared switch at `/api/v1/banks/P675/sign-in` and submits to `/api/v1/banks/P675/transfers`. Evergreen attempts switch sign-in using the same email/password as Firebase. The switch must contain a matching bank login. The original switch modules are preserved.
- The assignment PDF (pages 5–7) specifies a trusted backend, deny-all browser rules, server-side sessions, HMAC bank-to-bank authentication, atomic Firestore transactions and protected X42 mutations. Your no-server/no-Express/no-Cloud-Functions constraints make those requirements impossible to enforce securely in a browser-only app. This deliverable is a demo integration only, not production banking software. Never use it for real funds or sensitive customer information.
- KYC file upload is omitted per the simplified instruction; `documentPaths` is an empty array.
- Email delivery is not implemented because no mail backend or credentials were supplied. KYC decisions and admin actions are recorded in `audit_logs`.
- The demo Firestore rules are scoped by Firebase UID and admin role, but browser-side financial writes are not equivalent to trusted backend X42 operations. Transfer execution remains dependent on the existing switch service.

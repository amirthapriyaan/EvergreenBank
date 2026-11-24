# Evergreen Bank - Firebase REST Postman Pack

## Included
- Firebase Authentication REST requests: sign-in, optional customer Auth sign-up, refresh token, password reset.
- Cloud Firestore REST templates for all 15 mandatory assignment collections and 3 agreed Evergreen additions.
- A Postman environment with placeholders only.
- No Firebase SDK, no Realtime Database, no credentials, and no demo customer/financial records.

## Before importing
1. In Firebase Console, create Firestore Database in **Native mode**.
2. Enable **Authentication > Email/Password**.
3. Keep your existing `admin@evergreen.com` Auth user.
4. In Project settings > General > Your apps, register a Web app if you have not already. Copy the Web API Key and Project ID.
5. Import the collection JSON and environment JSON into Postman.
6. Select the `Evergreen Firebase - Local` environment and fill `apiKey`, `projectId`, and your admin password locally. Do not send tokens/passwords to anyone.
7. Update `firestoreBaseUrl` so it contains your actual project ID.

## Important security / architecture notes
- The assignment's Firestore rules deny all direct client reads/writes. With those rules published, a direct Firestore REST request using a Firebase user ID token will be denied. That is expected.
- These Firestore requests are REST format templates, not a replacement for the trusted bank API. A trusted backend must authenticate the caller, enforce role/ownership, and perform privileged Firestore REST operations using server-side credentials. Never put service-account credentials or privileged OAuth tokens in browser code or this Postman environment.
- Firebase Authentication REST sign-in is suitable for testing the Auth identity. It does not automatically create a matching `users/{uid}` Firestore profile or KYC request.
- Firestore collections are created automatically on the first document write. There is no need to create empty collections. Do not execute placeholder writes; replace values only when creating legitimate records through the agreed backend workflow.
- `passwordHash` appears in the assignment's `users` schema. Firebase Authentication manages passwords and does not return a reusable password hash through its client REST sign-in response. Do not store the user's plaintext password or invent a hash in Firestore. Confirm the mentor's intended handling of this field before implementing user profiles.
- The PDF's transfer table uses `fromAccountId` and `toAccountId` / `destinationIfsc`, while its sample document uses `sourceAccountId` and `destinationAccountId`. Both sets are represented in the template to preserve the source. Do not use both as competing canonical fields in production; confirm the canonical shape before transfer implementation.
- The three additional collections (`bank_settings`, `request_nonces`, `relationship_managers`) are Evergreen project additions, not part of the PDF's original 15 mandatory collections. Their starter fields are proposed templates and may be refined during API implementation.

## Firestore REST base URL
`https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/documents`

## Auth REST endpoints
- Sign in: `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=API_KEY`
- Sign up: `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=API_KEY`
- Refresh: `POST https://securetoken.googleapis.com/v1/token?key=API_KEY`
- Password reset: `POST https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=API_KEY`

## Suggested first test
Run **Sign in with email and password** using the existing admin identity. Confirm that Firebase returns `localId`, `idToken`, and `refreshToken`. Do not run Firestore create templates yet. The next step is to build the trusted bank API and connect it to Firestore REST securely.

# Security Specification — Site Requests

## 1. Data Invariants
1. **Verified Admin Identity**: Admin privileges are granted solely when `request.auth != null`, `request.auth.token.email == 'abubakarkhuzaifa001@gmail.com'`, and `request.auth.token.email_verified == true`.
2. **Role & Status Immutability for Workers**: Workers cannot create their `/users/{uid}` document with `role: 'admin'`, `active: true`, or `removed: true`, and cannot modify `role`, `active` (except via valid first-time activation), or `removed` on updates.
3. **Zero Client Access to Access Code**: `/appConfig/security` is strictly `allow read: if isAdmin();`. Workers can never read or list the access code.
4. **Atomic Code Activation**: A worker can transition `active` from `false` to `true` only if `!existing().removed` and only in an atomic batch write alongside `/codeVerifications/{uid}` whose `code` equals `get(/databases/$(database)/documents/appConfig/security).data.accessCode`. `/codeVerifications/{uid}` has `allow read: if false;`.
5. **Removed Worker Lockout**: Any user with `removed == true` is blocked by Firestore rules from activating, updating heartbeats, or creating requests.
6. **Request Ownership & Immutability**: Workers can `get`/`list` only requests where `resource.data.workerId == request.auth.uid`, can `create` only with `workerId == request.auth.uid` and `status == 'pending'`, and can never `update` or `delete` requests.
7. **Race-Safe Sequential Numbering**: Creating `/requests/{requestId}` requires an atomic transaction with `/counters/requests` where `counter.count` increments by `+1` and `request.requestNumberNum == counter.count`.
8. **Admin-Only Logs & Settings**: Only the verified admin can read `/signInLogs/{logId}`, read `/users` list, update request statuses/prices, update worker access, or write `/appConfig/*`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Admin Spoof (Unverified Email)**: User signs in with `email: 'abubakarkhuzaifa001@gmail.com'`, `email_verified: false` -> `PERMISSION_DENIED` on admin reads/writes.
2. **Self-Assigned Admin on Signup**: Worker creates `/users/{uid}` with `{ role: 'admin', active: true }` -> `PERMISSION_DENIED`.
3. **Self-Activation Without Code**: Worker updates `/users/{uid}` setting `{ active: true }` without atomic `/codeVerifications/{uid}` matching `/appConfig/security.accessCode` -> `PERMISSION_DENIED`.
4. **Wrong Access Code Attempt**: Worker writes `/codeVerifications/{uid}` with `code: 'WRONG123'` -> `PERMISSION_DENIED`.
5. **Removed Worker Re-Entry**: Removed worker (`removed: true`) tries to reset `removed: false` or activate with valid code -> `PERMISSION_DENIED`.
6. **Worker Reading Access Code**: Worker attempts `getDoc('/appConfig/security')` -> `PERMISSION_DENIED`.
7. **Worker Listing All Users (PII Scrape)**: Worker attempts `getDocs('/users')` -> `PERMISSION_DENIED`.
8. **Worker Reading Another Worker's Request**: Worker A queries `/requests` with `where('workerId', '==', workerB)` or `getDocs('/requests')` without `where('workerId', '==', uid)` -> `PERMISSION_DENIED`.
9. **Worker Editing / Approving Own Request**: Worker attempts `updateDoc('/requests/req1', { status: 'approved' })` -> `PERMISSION_DENIED`.
10. **Inactive / Removed Worker Submitting Request**: Worker with `active: false` or `removed: true` attempts `create` on `/requests/{id}` -> `PERMISSION_DENIED`.
11. **Skipped / Forged Request Number**: Worker creates `/requests/{id}` with `requestNumberNum: 999` without atomic `+1` bump on `/counters/requests` -> `PERMISSION_DENIED`.
12. **Shadow Ghost Field / Oversized Payload**: Worker creates `/requests/{id}` with extra field `isApproved: true` or `site` > 160 chars or `id` > 128 chars -> `PERMISSION_DENIED`.

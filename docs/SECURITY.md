# AICTE FDR Vault - Comprehensive Security Architecture

## 1. Executive Summary & Security Model
The **AICTE FDR Vault** ("Transparent. Tracked. Timely.") is designed for high-assurance public sector financial compliance, managing institutional security deposits and Fixed Deposit Receipts (FDRs) across India's higher education ecosystem. The security model adheres to Indian e-Governance standards, OWASP Top 10 guidelines, and strict separation-of-duty controls.

---

## 2. Authentication & Credential Security

### 2.1 Dual Token JWT with Rotation & Reuse Detection
- **Access Tokens**: Short-lived (15 minutes), signed with `JWT_SECRET` (HMAC-SHA256). Contains minimal payload (`sub`, `role`, `institutionId`).
- **Refresh Tokens**: Long-lived (7 days), stored in the database as **SHA-256 cryptographic hashes** (the raw token is never persisted).
- **Single-Use Rotation**: Every `/auth/refresh` invocation issues a new access token AND a new rotated refresh token, while revoking the old token.
- **Compromise Containment (Reuse Detection)**: If an already-used or revoked refresh token is presented to `/auth/refresh`, the system detects token theft, immediately flags the event as an anomaly in `AuditLog`, and **revokes all active refresh tokens for that user**, forcing re-authentication.

### 2.2 Password Security
- Passwords are salted and hashed using **bcrypt** with a cost factor of 10.
- Password complexity: Minimum 8 characters.
- Password changes require verification of the existing password (`currentPassword`) before updating.

### 2.3 Rate Limiting
- **Authentication Routes (`/auth/login`, `/auth/forgot-password`)**: Protected by `express-rate-limit` capped at 15 requests per 15-minute window per IP.
- **Global API Routes**: Protected by a 1,000 requests per 15-minute window limiter to prevent denial-of-service and brute-force scraping.

---

## 3. Role-Based Access Control (RBAC) & Multi-Tenancy

### 3.1 6 Granular System Roles
1. **SUPER_ADMIN**: Full system oversight, user management, bank master directory, near-maturity threshold configuration, and manual cron job triggering.
2. **FINANCE_OFFICER (Maker)**: Registers FDRs, initiates renewals, calculates compound interest, and drafts/submits deposit release orders. Cannot verify documents or approve releases.
3. **VERIFIER (Checker)**: Validates uploaded bank instruments and lien letters, performs document verification (Pending/Verified/Rejected), and reviews submitted release requests.
4. **APPROVING_AUTHORITY**: Executive tier. Reviews verified release requests, inspects premature release justifications, and grants final digital approval for release orders.
5. **INSTITUTION_USER**: Bound strictly to their institution's `institutionId`. Submits FDR documents, views institution status, and tracks maturity schedules.
6. **AUDITOR**: System-wide read-only access, including immutable audit trails and regulatory export reports.

### 3.2 Maker-Checker Segregation of Duties
- **FDR Document Verification**: The user who created or last modified an FDR is blocked by policy from verifying its documents (`createdById !== verifierId`).
- **Deposit Release Gate**: The user who verified a release request is blocked from approving it (`verifiedById !== approvedById`).

### 3.3 Strict Institution Data Isolation
- Enforced at the **database service layer**, not merely via UI hiding.
- When an `INSTITUTION_USER` attempts to access an FDR, document, or release request belonging to another institution, the API returns **HTTP 404 (Not Found)** rather than 403. This prevents institution enumeration and ID guessing attacks.

---

## 4. File Upload & Binary Inspection Security

### 4.1 Magic Bytes MIME Validation
Unlike standard portals that trust user-provided `Content-Type` headers or file extensions, AICTE FDR Vault inspects binary file headers (*magic bytes*):
- **PDF**: Begins with `%PDF-` (`0x25 0x50 0x44 0x46`)
- **JPEG**: Begins with `\xFF\xD8\xFF` (`0xFF 0xD8 0xFF`)
- **PNG**: Begins with `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`)

Any file failing magic-byte inspection is rejected immediately with **HTTP 400 Bad Request**.

### 4.2 Storage & Path Traversal Prevention
- User-supplied filenames are **never trusted** or written to disk.
- Files are saved as `<uploadsDir>/<institutionId>/<uuid>.<ext>` using cryptographically secure UUIDv4.
- Path traversal sequences (`../`, `..\\`) are stripped and neutralized.
- Direct static file serving is disabled; all file downloads pass through an authenticated, authorization-checked streaming endpoint (`GET /api/v1/documents/:id/download`).

---

## 5. Financial Accuracy & Monetary Protection

### 5.1 BigInt Paise Architecture
- To prevent IEEE 754 floating-point rounding errors common in financial systems, all monetary values (principals, payouts, deductions, released amounts) are stored as **integer paise** (`1 INR = 100 paise`) using `BigInt`.
- Serialized as strings over the JSON API to prevent JavaScript 64-bit float precision truncation.
- Frontend renders values using Indian numbering notation (`₹12,50,000.00` and compact `₹12.5 L`).

### 5.2 Deterministic Compound Interest
Cumulative interest formula:
$$\text{maturityAmount} = P \times \left(1 + \frac{r}{400}\right)^{4 \times \frac{m}{12}}$$
Implemented in pure integer arithmetic with exact quarterly compounding and month-end date clamping (e.g., Jan 31 + 1 month = Feb 28/29).

---

## 6. Audit Logging & Non-Repudiation

### 6.1 Append-Only Audit Trail
- The `AuditLog` table records:
  - `userId` (Actor ID)
  - `action` (e.g. `LOGIN`, `CREATE`, `UPDATE`, `VERIFY_DOC`, `APPROVE_RELEASE`)
  - `entity` & `entityId`
  - `oldValue` & `newValue` (JSON snapshots)
  - `ipAddress` & `userAgent`
  - `createdAt` (UTC timestamp)
- **Immutable Guarantee**: There are **zero** update or delete endpoints for `AuditLog` in the API, and no cascading delete relations to audit logs in Prisma.

### 6.2 Public Verification of Releases
- Authorized release orders produce a verifiable reference number: `AICTE/FDR/REL/<year>/<6-digit seq>`.
- Each release order PDF contains a dynamic QR code pointing to `/verify-release/:ref`.
- The public verification endpoint (`GET /api/v1/public/verify-release/:ref`) returns minimal non-sensitive confirmation details (institution name, FDR number, release date, amount) without exposing bank accounts or personal data.

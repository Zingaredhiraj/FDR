# AICTE FDR Vault - Comprehensive Verification & Compliance Checklist

## 1. Technical Stack & Environment Verification
- [x] **Backend**: Node.js 20, Express, TypeScript (strict mode enabled), Prisma ORM, SQLite (`file:./dev.db`)
- [x] **Validation & Security**: Zod schemas, JWT dual-token rotation (15m access / 7d hashed refresh), bcrypt (10 rounds), helmet, strict CORS, express-rate-limit
- [x] **Document & Financial Generation**: Multer, pure-buffer magic bytes inspection, PDFKit, QRCode, ExcelJS
- [x] **Background Worker**: Node-cron, automated status evaluation job, automated alert reminder job
- [x] **Frontend**: Next.js 14 / React 18, JavaScript / JSX, Tailwind CSS, TanStack Query, Recharts, Lucide-react, react-hot-toast
- [x] **Design Tokens**: AICTE Navy (`#0B1F4B`), Saffron (`#FF9933`), Green (`#138808`), full Dark Mode via CSS variables, Inter font, responsive down to 360px

---

## 2. Data Model & Architecture (13 Models)
- [x] `User`: All 6 roles, password hash, status flag, institution foreign key
- [x] `RefreshToken`: Stored as SHA-256 hash, rotation tracking, revoked timestamp
- [x] `Institution`: AICTE ID unique, state, city, type, pending dues flag & note
- [x] `Bank`: 12 schedule commercial banks, short code, active status
- [x] `Fdr`: BigInt paise for `principal` & `maturityAmount`, `parentFdrId` for renewal lineage, status, academic year, purpose
- [x] `Document`: File path, type (7 enum types), version number, verification status, verifier ID, rejection remarks
- [x] `ReleaseRequest`: Workflow status (DRAFT -> SUBMITTED -> VERIFIED -> APPROVED -> RELEASED), premature release flag & justification
- [x] `ReleaseStep`: Immutable audit steps for each transition in the release pipeline
- [x] `Notification`: In-app notification queue with read flags and channel tracking
- [x] `NotificationPreference`: User preferences for EMAIL and IN_APP channels per alert category
- [x] `AlertLog`: Unique constraint `(fdrId, alertType, targetDate)` ensuring strict dispatch idempotence
- [x] `AuditLog`: Append-only, zero update/delete routes, capturing before/after JSON states
- [x] `SystemSetting`: Key-value configuration for `nearMaturityDays` and system thresholds

---

## 3. Business Rules & Financial Precision
- [x] **Pure Integer Arithmetic**: All monetary fields stored in paise (`1 INR = 100 paise`) using `BigInt` — zero IEEE 754 float precision loss
- [x] **Indian Currency Display**: `formatINR()` formats currency with Indian commas (`₹12,50,000.00` and compact `₹12.5 L`)
- [x] **Compound Interest**: $P \times (1 + r/400)^{4 \times m/12}$ with month-end date clamping (e.g. Jan 31 + 1 month = Feb 28/29)
- [x] **Leap-Year Safe**: Verified via unit test suite
- [x] **Calculation Preview**: `POST /api/v1/fdrs/calculate` powers the live form preview identically to backend service logic
- [x] **Computed Overdue Flag**: Status `MATURED`, `maturityDate < today`, no open release request, and no renewal child

---

## 4. Multi-Tenant Isolation & Maker-Checker RBAC
- [x] **SUPER_ADMIN**: Manages users, bank masters, thresholds, manual cron triggers
- [x] **FINANCE_OFFICER (Maker)**: Creates FDRs, initiates renewals, drafts release requests
- [x] **VERIFIER (Checker)**: Inspects documents, validates release requests
- [x] **APPROVING_AUTHORITY**: Reviews premature banners, grants final digital release sign-off
- [x] **INSTITUTION_USER**: Bound strictly to single institution; requests to foreign institution records return HTTP 404 (not 403)
- [x] **AUDITOR**: Global read-only access with immutable audit trail and report exports
- [x] **Maker-Checker Enforced**:
  - FDR creator cannot verify FDR documents (`createdById !== verifierId`)
  - Release request verifier cannot approve the release (`verifiedById !== approvedById`)

---

## 5. Document Security & Verification Pipeline
- [x] **Magic Bytes Binary Validation**: Inspects `%PDF-`, `\xFF\xD8\xFF` (JPEG), and `\x89PNG` before accepting files
- [x] **Secure Storage**: Filenames replaced with UUIDv4, stored in `/backend/uploads/<institutionId>/<uuid>.<ext>`
- [x] **Document-Complete Gate**: FDR Scan + Bank Confirmation + Lien Letter all VERIFIED
- [x] **Re-Upload Versioning**: Re-uploading a rejected document increments `version` and maintains file history
- [x] **Split-Screen Verification Queue**: Fast-action keyboard shortcuts (`V`, `R`, `J`, `K`)

---

## 6. Release Workflow & Cryptographic Public Verification
- [x] **4 Release Validation Gates**:
  1. FDR must be Document-Complete
  2. FDR must be Matured OR have `prematureRelease = true` with mandatory justification
  3. No other open release requests on the FDR
  4. Institution must have zero pending dues (`hasPendingDues = false`)
- [x] **Release Order PDF**: Auto-generated upon release completion with official reference `AICTE/FDR/REL/<year>/<seq>`
- [x] **Embedded QR Code**: Scannable QR code directing to public verification portal
- [x] **Public Verification Endpoint**: `GET /api/v1/public/verify-release/:ref` renders official green seal and details without login

---

## 7. Automated Cron Jobs & Deduplication
- [x] **Status Evaluation Job**: Runs daily at 06:00 IST + on-demand (`POST /jobs/status`). Transitions `ACTIVE` -> `NEAR_MATURITY` -> `MATURED`
- [x] **Alert Dispatch Job**: Sweeps 90, 60, 30, 15, 7, 1 days before maturity and every 7 days overdue
- [x] **Idempotence**: `AlertLog` unique index guarantees duplicate runs within the same day produce zero redundant notifications

---

## 8. Frontend Interface & Feature Pages
- [x] `/login`: Split-screen animated login with 6 one-click demo role chips
- [x] `/`: Role-aware Dashboard with 7 KPI cards, 12-month forecast, status donut, recent activity feed
- [x] `/institutions`: Searchable institution directory with state/type filters and CSV bulk import
- [x] `/institutions/:id`: Institution detail with FDR breakdown, document history, and pending dues note
- [x] `/fdrs`: FDR records table with status chips, search, and Indian currency formatting
- [x] `/fdrs/new`: FDR registration wizard with live interest calculation preview
- [x] `/fdrs/:id`: Comprehensive FDR detail, document checklist, file upload, and release trigger
- [x] `/calendar`: Interactive maturity calendar with color-coded alert horizons
- [x] `/renewals`: Renewal due list, renewal wizard, and 3-tier renewal chain tree visualizer
- [x] `/documents`: Split-pane document verification queue with keyboard shortcuts
- [x] `/releases`: Release requests table with filter by workflow stage
- [x] `/releases/:id`: 4-tier timeline, premature warning banner, and PDF release order download
- [x] `/reports`: 5 official reports with XLSX, CSV, and PDF export
- [x] `/notifications`: In-app notification center and multi-channel preferences
- [x] `/audit`: Append-only audit trail with JSON before/after state diff modal
- [x] `/users`: User management and role assignment for Super Admin
- [x] `/settings`: System settings (`nearMaturityDays`), Bank Master directory, and Job Triggers
- [x] `/profile`: Profile details and change password form
- [x] `/verify-release/:ref`: Public certificate verification page with AICTE seal
- [x] Global `Ctrl+K` search modal across institutions, FDRs, and documents
- [x] Real-time 60-second notification polling with topbar unread count badge

# AICTE FDR Vault — LOCKED SPEC

> **Product**: AICTE FDR Vault  
> **Tagline**: Transparent. Tracked. Timely.  
> **Problem**: SIH 2026, Problem ID SIH26265, AICTE: "Streamline of Security Deposit / FDR Portal"

---

## STACK (fixed)

- **Backend**: Node 20, Express, TypeScript (strict), Prisma, SQLite, Zod, JWT access (15 min) + refresh (7 d, rotated, stored hashed, reuse detection revokes all the user's tokens), bcrypt, helmet, cors (frontend origin only), express-rate-limit, multer, node-cron, nodemailer (if SMTP env is empty, log the email to console and store it in the Notification table), pdfkit, qrcode, exceljs, swagger-ui-express (/api/docs), pino, Vitest + Supertest.
- **Frontend**: React 18, Vite, TypeScript, Tailwind, TanStack Query, React Router, React Hook Form + Zod, Recharts, Framer Motion, lucide-react, react-hot-toast. Font: Inter.
- **Monorepo**: /backend, /frontend, /docs. Root scripts: `npm run setup` (install all, prisma migrate, seed) and `npm run dev` (both via concurrently). Backend :4000, frontend :5173. Provide .env.example files.

---

## DATA RULES (SQLite-safe, PostgreSQL-portable)

- NO Prisma enums: store statuses and types as String, validated by Zod enums defined once in /backend/src/constants.
- Money = BigInt PAISE; serialized as string in the API; formatted on the frontend in Indian grouping (₹12,50,000.00; compact mode ₹12.5 L / ₹1.2 Cr). Never use floats for money.
- Dates stored UTC; "today" is computed in Asia/Kolkata.
- Soft delete (deletedAt) on Institution, Fdr, Document. AuditLog is append-only (no update or delete path anywhere).
- Models: User, RefreshToken, Institution, Bank, Fdr, Document, ReleaseRequest, ReleaseStep, Notification, NotificationPreference, AlertLog, AuditLog, SystemSetting. Indexes: Fdr.fdrNumber unique, Fdr.maturityDate, Fdr.status, Fdr.institutionId, Institution.aicteId unique, AlertLog unique (fdrId, alertType, targetDate). Fdr.parentFdrId nullable (renewal chain).
- Institution fields: aicteId, name, type (Engineering, Management, Pharmacy, Architecture, etc.), state, city, head name, email, phone, approvalStatus, hasPendingDues (bool) + pendingDuesNote.
- Fdr fields: fdrNumber, institutionId, bankId, branch, ifsc, principal, interestRate, interestType (CUMULATIVE | QUARTERLY_PAYOUT), issueDate, tenureMonths, maturityDate, maturityAmount, lienMarked (bool), purpose (APPROVAL_PROCESS_FEE | SECURITY_DEPOSIT | PERFORMANCE_GUARANTEE | OTHER), academicYear, remarks, status, createdById.

---

## ROLES

- **SUPER_ADMIN**: users, masters, settings, jobs
- **FINANCE_OFFICER**: maker: FDRs, renewals, release initiation, mark released, pending-dues flag
- **VERIFIER**: checker: documents and release verification
- **APPROVING_AUTHORITY**: final release approval
- **INSTITUTION_USER**: bound to ONE institutionId, sees only that institution's data, enforced in the service layer; other institutions' records return 404
- **AUDITOR**: read-only everywhere including the audit log

Maker-checker: the user who creates or edits an FDR cannot verify its documents; the user who verifies a release request cannot approve it.

---

## BUSINESS RULES (authoritative)

1. Cumulative interest: `maturityAmount = P × (1 + r/400)^(4 × months/12)` (quarterly compounding), rounded to the nearest paisa. Quarterly payout: `maturityAmount = P` and `quarterlyPayout = P × r / 400`. Implement as one pure function `calculateMaturity()` with unit tests (recompute expected values independently; include a leap-year case and a ₹10,00,000 @ 7% for 12 months case). Expose `POST /fdrs/calculate` so the UI preview uses the same logic.

2. `maturityDate = issueDate + tenureMonths` calendar months, clamping the day to month end (31 Jan + 1 month = 28/29 Feb).

3. FDR statuses: ACTIVE, NEAR_MATURITY, MATURED, RENEWED, RELEASE_REQUESTED, RELEASED, CLOSED, ENCASHED.

4. Status job (daily 06:00 IST + on demand): for ACTIVE/NEAR_MATURITY FDRs, maturityDate within nearMaturityDays (SystemSetting, default 90) → NEAR_MATURITY; maturityDate < today → MATURED. Other transitions are manual or workflow-driven.

5. OVERDUE is a computed flag, not a status: status = MATURED AND maturityDate < today AND no open release request AND no renewal child. `overdueDays = today − maturityDate`.

6. Alerts at 90, 60, 30, 15, 7, 1 days before maturity, on maturity day, and every 7 days while overdue. Recipients: all FINANCE_OFFICER users + that FDR's INSTITUTION_USER users. In-app + email (per user preferences). Dedupe via AlertLog; running the job twice in a day creates zero duplicates. Also alert: a document pending verification for more than 2 days (to VERIFIER), and every release-request state change (to the relevant parties).

7. Documents: types FDR_SCAN, BANK_CONFIRMATION, LIEN_LETTER, UNDERTAKING, NOC, ID_PROOF, OTHER. PDF/JPG/PNG only, max 5 MB, MIME verified by magic bytes, stored at `/backend/uploads/<institutionId>/<uuid>.<ext>`, original filename never trusted, path traversal safe, download is authenticated and authorization-checked. Verification: PENDING, VERIFIED, REJECTED (remarks mandatory on reject). Re-upload creates version+1 and keeps history.

8. "Document-complete" FDR = FDR_SCAN, BANK_CONFIRMATION and LIEN_LETTER all VERIFIED (latest versions).

9. Release workflow: DRAFT → SUBMITTED → VERIFIED → APPROVED → RELEASED; rejection at verify or approve returns to DRAFT with remarks. Gates enforced in the API (HTTP 422, clear message):
   - a. FDR is document-complete.
   - b. FDR is MATURED, or the request carries `prematureRelease=true` with a mandatory reason (shown in red to the Approving Authority).
   - c. No other open release request on the same FDR.
   - d. Institution has `hasPendingDues = false`.
   
   On RELEASED capture releaseDate, UTR, releasedAmount, deductions + reason; set FDR status RELEASED; generate a Release Order PDF with reference `AICTE/FDR/REL/<year>/<6-digit seq>` and a QR code to a public verification URL. Public endpoint `GET /api/v1/public/verify-release/:ref` returns minimal non-sensitive validity info. Every step is recorded as a ReleaseStep (actor, role, action, remarks, timestamp).

10. Renewal: creates a NEW Fdr with `parentFdrId = old.id`; the old FDR becomes RENEWED. Confirmed once the new FDR's FDR_SCAN is VERIFIED. Chain queryable end to end. Renewal-due list = NEAR_MATURITY or MATURED FDRs with no child.

11. Audit every create, update, delete, login (success and failure), logout, verification, approval: userId, action, entity, entityId, oldValue, newValue, IP, timestamp.

12. API: REST /api/v1, envelope `{success, data, message, meta}`, central error handler, pagination (max pageSize 100), sort/filter/search, Swagger for every endpoint, auth rate limiting.

13. Reports (filters: institution, bank, state, status, date range; export xlsx, csv, pdf with INR formatting): maturity report, bank-wise, institution ledger, release register, audit report.

14. Dashboard (role-aware, institution-isolated): KPIs (total deposit value, active FDRs, maturing in 30 days, overdue, pending verifications, pending releases, released this financial year Apr–Mar), 12-month maturity forecast, bank-wise, state-wise, status distribution, deposit trend, recent activity, calendar data.

15. Global search (Ctrl+K) across institutions, FDR numbers, documents, respecting RBAC.

---

## SEED (deterministic, realistic, relative to the current date)

- Users (password `Demo@1234`): admin@aicte.demo, finance@aicte.demo, verifier@aicte.demo, authority@aicte.demo, institution@aicte.demo (bound to institution #1), auditor@aicte.demo.
- 12 banks (SBI, PNB, Canara, BoB, Union, HDFC, ICICI, Axis, Kotak, IDBI, Indian Bank, Bank of India); 40 institutions across 15+ states and varied types; 120+ FDRs including at least 8 maturing within 7 days, 15 within 30 days, 20 within 90 days, 10 overdue, 15 RENEWED (with chains), 10 RELEASED, plus ACTIVE and CLOSED; documents in mixed verification states (small valid placeholder PDFs); 10 release requests across every workflow state; notifications and audit entries.

---

## UI/UX DIRECTION

- Government-grade yet modern. Palette: navy #0B1F4B (primary), saffron #FF9933 (accent), green #138808 (success), clean white/soft-gray surfaces, full dark mode via CSS variables.
- Rounded-2xl cards, layered soft shadows, glassmorphism on hero/KPI areas, gradient KPI cards with animated counters, Framer Motion page transitions and micro-interactions, skeleton loaders, illustrated empty states.
- Layout: collapsible icon sidebar (role-based items), top bar (Ctrl+K search, notification bell with unread count, theme toggle, profile menu), breadcrumbs, responsive to 360 px (sidebar becomes a drawer, tables scroll horizontally).
- Components to build: Button, Input, Select, DatePicker, Modal, Drawer, Tabs, StatusChip (color-coded for every status), GlassCard, KpiCard, DataTable (sticky header, sort, pagination, filters, skeleton, empty state), Timeline, FileDropzone (drag-drop with progress), PreviewModal (PDF/image), ConfirmDialog, CommandPalette, NotificationBell, ThemeToggle.
- Login: split-screen with an animated gradient background, branding, validation, show/hide password, and "Demo Logins" chips for all 6 roles that auto-fill credentials.
- Pages: Login, Dashboard, Institutions (list/detail with tabs), FDRs (list/detail/create/edit with LIVE maturity preview and gated release button showing the block reason), Maturity Calendar (month grid, dots: ≤7d red, ≤30d orange, ≤90d yellow, else green, day drawer, list view with 7/15/30/60/90 chips + Overdue tab), Renewals (due list, renewal wizard, chain view), Document Verification Queue (table + split-pane preview, Verify/Reject, shortcuts V/R/J/K), Release Requests (list, create wizard, detail with Timeline, role-specific action panel, red premature banner, PDF + QR), Reports, Notifications (+ preferences; bell polls every 60 s), Audit Log (filters + JSON diff viewer), Users & Roles, Settings (thresholds, bank master, "Run jobs now" with result summary), Profile, public /verify-release/:ref, 404, error boundary.
- Accessibility: keyboard navigable, aria-labels on icon buttons, WCAG AA contrast in both themes.

---

## PHASES

### PHASE 1: Backend Foundation
Monorepo, Prisma schema + migration, config/env validation, pino, error handler, envelope, auth (login, refresh rotation + reuse detection, logout, me, change password, forgot-password token logged in dev), RBAC, audit service, rate limiting, CRUD/list/search/CSV import for Users, Banks, Institutions, FDRs (with calculateMaturity and maturity-date logic), full seed script, Swagger.

**DoD**: `npm run setup` works from clean; server runs; tests green (calculateMaturity ≥5 cases, auth + refresh rotation, RBAC 403, institution isolation 404, maker-checker); all 6 logins work; seed counts printed.

### PHASE 2: Workflows and Automation
Documents module, renewals, release workflow with all gates and PDF + QR, public verify endpoint, notifications + preferences, schedulers (status and alert jobs with AlertLog dedupe, admin run-now endpoints returning `{fdrsUpdated, alertsCreated, emailsLogged}`), dashboard endpoints, reports and exports (xlsx/csv/pdf), global search, audit viewer, settings.

**DoD**: tests green, including alert job idempotence, the status job at date boundaries, each of the 4 gates blocking with 422, the full release happy path creating a PDF, same-user verify+approve blocked, uploads rejected as per rules, cross-institution document download blocked, exports valid.

### PHASE 3: Frontend Shell and Design System
Vite app, typed API client with single-flight token refresh, AuthContext, route guards, role-based sidebar, all design-system components, theme system, formatINR, Login page, role-aware Dashboard fully wired, 404, error boundary.

### PHASE 4: All Feature Pages
All feature pages wired to the real API, with loading/empty/error/permission states.

### PHASE 5: Security and Performance Hardening
Route auth guards, upload safety, security headers, performance optimizations.

### PHASE 6: Fresh-Clone Verification
Delete and re-setup from zero.

### PHASE 7: Documentation and Final Audit
README, DEMO_SCRIPT, FUTURE_SCOPE, SIH_PPT_OUTLINE, FINAL_CHECKLIST.

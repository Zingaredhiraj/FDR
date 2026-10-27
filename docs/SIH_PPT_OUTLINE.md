# SIH 2026 Presentation Deck Outline
**Problem Statement**: SIH26265 - "Streamline of Security Deposit / FDR Portal"  
**Organization**: All India Council for Technical Education (AICTE), Ministry of Education  
**Product**: AICTE FDR Vault ("Transparent. Tracked. Timely.")  

---

## Slide 1: Title & Executive Vision
- **Header**: AICTE FDR Vault
- **Tagline**: Transparent. Tracked. Timely.
- **Problem ID**: SIH26265 | Category: Higher Education Governance & Financial Compliance
- **Vision**: A secure, automated national vault for institution-wise fixed deposit management, real-time maturity tracking, automated alerts, and transparent digitally signed releases.

---

## Slide 2: The Pain Points in Today's System
1. **Decentralized & Paper-Bound**: Security deposits submitted across physical branches with no unified national ledger.
2. **Missed Maturities & Revenue Leakage**: Institutes and AICTE lose interest accruals or hold dormant funds due to lack of proactive reminder cadences.
3. **Lien-Marking Fraud**: Difficult to independently verify if a bank has truly marked a lien in favor of AICTE without physical confirmation letters.
4. **Bureaucratic Release Bottlenecks**: Release approvals taking weeks with multiple physical handoffs, lost physical FDR copies, and opaque tracking.

---

## Slide 3: The Architecture - "AICTE FDR Vault"
- **Modern Monorepo Stack**:
  - **Backend**: Node.js 20, Express, TypeScript (strict), Prisma ORM, SQLite / PostgreSQL, Zod validation, JWT dual-token rotation, PDFKit, ExcelJS.
  - **Frontend**: Next.js 14 / React 18, JavaScript, Tailwind CSS, Recharts, Framer Motion, TanStack Query.
- **Security-First Tenet**:
  - BigInt Paise Precision (integer math; zero IEEE 754 floating point errors).
  - Magic byte binary inspection for scanned bank instruments.
  - Multi-tenant institution isolation enforced at the service layer.
  - Append-only immutable Audit Trail.

---

## Slide 4: Core Innovation & Business Rules
1. **Deterministic Interest Calculation Engine**:
   - Quarterly compounding formula: $\text{maturityAmount} = P \times (1 + r/400)^{4 \times m/12}$
   - Handles calendar month-end clamping (Jan 31 + 1 month = Feb 28/29) and leap-year cases.
2. **Maker-Checker Segregation**:
   - Maker (Finance Officer) drafts FDRs and releases; Checker (Verifier) independently inspects documents.
   - The creator of an FDR cannot verify its documents; the verifier of a release cannot approve it.
3. **Automated Alert Sequence with Guaranteed Idempotence**:
   - Background cron sweeps at 90, 60, 30, 15, 7, 1 days before maturity and every 7 days overdue.
   - Deduplicated via `AlertLog` table — zero spam or duplicate dispatches.

---

## Slide 5: End-to-End Workflow & Release Gates
- **Gated Release Flow**:
  1. *FDR is Document-Complete* (FDR Scan + Bank Confirmation + Lien Letter all VERIFIED).
  2. *Matured or Justified Premature Release* (with mandatory red warning banner).
  3. *Zero Pending Dues Check* (enforced against institution status).
  4. *No Concurrent Release Requests*.
- **Cryptographic Release Order**:
  - Digitally generated PDF containing official reference: `AICTE/FDR/REL/<year>/<seq>`.
  - Embedded scannable QR code linking to public verification endpoint (`/verify-release/:ref`).

---

## Slide 6: Multi-Persona Role Matrix (6 Roles)
| Role | Primary Responsibility | Key Feature in Portal |
|---|---|---|
| **SUPER_ADMIN** | System Oversight & Governance | User Management, Bank Master, Job Execution |
| **FINANCE_OFFICER** | Maker: Operations & Ledger | FDR Creation Wizard, Calculation Preview, Renewal Chain |
| **VERIFIER** | Checker: Document Compliance | Split-Screen Reviewer, V/R/J/K Keyboard Shortcuts |
| **APPROVING_AUTHORITY** | Final Executive Release Signoff | 4-Tier Timeline, Premature Warning Banner, PDF Order |
| **INSTITUTION_USER** | College/University Portal | Isolated Institution View, 404 Guard, Document Upload |
| **AUDITOR** | Compliance & Transparency | Immutable Audit Log, JSON Diff Viewer, Excel/PDF Reports |

---

## Slide 7: Measurable Impact & Key Benefits
- **100% Visibility**: Centralized real-time dashboard of all deposits across all Indian states and institutions.
- **Zero Missed Deadlines**: Proactive automated alerts to finance officers and institutions.
- **80% Reduction in Release Turnaround**: Digitized 4-tier approval pipeline replaces physical mail transfers.
- **Bank-Grade Compliance**: Append-only audit trail and instant public QR verification.

---

## Slide 8: Future Roadmap
- Phase 2: DigiLocker document ingestion & Aadhaar OTP e-Sign.
- Phase 3: Core Banking System (CBS) APIs & RBI SFMS electronic lien-marking.
- Phase 4: Programmable e-RUPI / CBDC escrow release orders.

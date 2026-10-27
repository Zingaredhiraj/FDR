# AICTE FDR Vault - SIH 2026 Jury Demonstration Script
**Product**: AICTE FDR Vault  
**Tagline**: Transparent. Tracked. Timely.  
**Problem ID**: SIH26265 (AICTE)  
**Standard Demo Password for All Accounts**: `Demo@1234`

---

## 1. Demo Setup & Environment Verification
- **Frontend URL**: `http://localhost:5173`
- **Backend API & Swagger Docs**: `http://localhost:4000/api/docs`
- **Database**: SQLite pre-seeded with 12 banks, 40 institutions across 15+ states, 128+ FDRs, 10 release workflows, and 6 role accounts.

---

## 2. Walkthrough by Persona & Workflow

### Act 1: Executive Overview & System Controls (Super Admin)
**Login**: `admin@aicte.demo` | `Demo@1234`

1. **Dashboard Command Center (`/`)**:
   - Highlight the **7 real-time KPI cards** (Total Security Deposits in ₹ Cr, Active FDRs, Maturing in 30 Days, Overdue FDRs, Pending Document Verifications, Pending Releases, Released in Current FY Apr–Mar).
   - Point out **12-Month Maturity Forecast** interactive bar chart showing projected cash flows.
   - Point out **Status Distribution Donut** (Active, Near Maturity, Matured, Renewed, Released, Encashed, Closed).
   - Point out **Recent Audit Activity** feed displaying real-time system actions.
2. **Global Search (`Ctrl + K`)**:
   - Press `Ctrl + K` or click the search bar in the top navigation.
   - Type `"IIT"` or `"SBI"`: observe instantaneous categorized grouping across Institutions, FDRs, and Documents.
3. **System Settings & Job Triggers (`/settings`)**:
   - Navigate to **System Settings**.
   - Review `nearMaturityDays` (default 90). Explain how this parameter drives the automated transition from `ACTIVE` to `NEAR_MATURITY`.
   - Switch to **Bank Master**: view 12 recognized public and commercial banks. Show the "Add Bank" modal.
   - Switch to **Job Triggers**:
     - Click **"Execute Status Job Now"**: observe live toast notification with exact count of updated FDRs.
     - Click **"Execute Alert Job Now"**: observe idempotence (second run creates 0 duplicate alerts, guaranteed by `AlertLog`).
4. **User & RBAC Directory (`/users`)**:
   - Demonstrate the complete directory of users across all 6 roles.
   - Show active/inactive toggle and create user modal.

---

### Act 2: Institution Isolation & Document Upload (Institution User)
**Login**: `institution@aicte.demo` | `Demo@1234`

1. **Multi-Tenant Isolation Proof**:
   - Note the top profile badge: bound strictly to **Institution #1**.
   - Navigate to `/fdrs`: only FDRs belonging to this institution are visible.
   - Attempting to access an FDR belonging to another institution directly by URL returns **HTTP 404 (Not Found)**, completely preventing unauthorized institution discovery.
2. **FDR Detail & Document Submission (`/fdrs/:id`)**:
   - Click on an FDR with status `ACTIVE`.
   - Inspect the **Document Compliance Checklist** (FDR Scan, Bank Confirmation, Lien Letter).
   - Click **"Upload Document"**: select Document Type (`BANK_CONFIRMATION`), pick a PDF/PNG file.
   - Highlight the **Magic Byte Security Filter**: invalid binary files are rejected at the server buffer level.
   - Observe document created with version 1 in `PENDING` verification status.

---

### Act 3: Verification Queue & Checker Segregation (Verifier)
**Login**: `verifier@aicte.demo` | `Demo@1234`

1. **Document Verification Queue (`/documents`)**:
   - Verifier sees pending documents uploaded across institutions.
   - Click on a document row to open the **Split-Pane Reviewer**.
   - Show high-speed keyboard shortcuts:
     - `V`: Mark Verified
     - `R`: Reject (opens mandatory reason prompt)
     - `J` / `K`: Navigate Next / Previous
   - Mark the required documents as **VERIFIED**.
2. **Document-Complete Gate**:
   - Once FDR Scan, Bank Confirmation, and Lien Letter are verified, the FDR badge updates to **"Document Complete"**, unlocking the deposit release gate.
3. **Maker-Checker Segregation Proof**:
   - Notice that if the verifier was the user who created the FDR, the system blocks them from verifying their own document.

---

### Act 4: Maker Renewal & Release Initiation (Finance Officer)
**Login**: `finance@aicte.demo` | `Demo@1234`

1. **Live Calculation Engine (`/fdrs/new`)**:
   - Click **"Create FDR"**.
   - Enter Principal: `₹10,00,000`, Interest Rate: `7%`, Tenure: `12 months`, Type: `CUMULATIVE`.
   - Show the **Live Calculation Preview Box** (`POST /api/v1/fdrs/calculate`): accurately computes quarterly compounding with leap-year and month-end date clamping.
2. **Renewal Chain Visualizer (`/renewals`)**:
   - View the **Renewal Due List** (FDRs nearing maturity without an active child).
   - Click an existing renewed FDR: inspect the **3-Tier Renewal Chain Tree** displaying parent-child lineage from original deposit to current active instrument.
3. **Deposit Release Initiation**:
   - Navigate to an eligible FDR.
   - Click **"Initiate Release Request"**:
     - System automatically verifies that Institution has **no pending dues** (`hasPendingDues = false`).
     - If FDR is not yet matured, the modal requires selecting **Premature Release** and entering a mandatory justification note.
     - Submit request: status moves to `SUBMITTED`.

---

### Act 5: Executive Approval & QR Release Order (Approving Authority)
**Login**: `authority@aicte.demo` | `Demo@1234`

1. **Pending Release Approvals (`/releases`)**:
   - Approving Authority reviews the submitted request.
   - Click into `/releases/:id` to view the **4-Tier Interactive Workflow Timeline**:
     - Step 1: Draft Created
     - Step 2: Verification Review
     - Step 3: Executive Approval
     - Step 4: Bank Execution & UTR
   - If the request is premature, highlight the prominent **Red Warning Banner** displaying the officer's justification.
2. **Grant Digital Approval**:
   - Click **"Approve Release"** and add approval remarks.
   - Observe request moves to `APPROVED`.
3. **Bank Execution & Order Generation**:
   - Enter bank UTR number and release date.
   - Click **"Complete Release"**:
     - FDR status transitions to `RELEASED`.
     - System generates official reference number: `AICTE/FDR/REL/2026/00000X`.
     - System automatically renders the **Official Release Order PDF** with an embedded scannable cryptographic QR code.
     - Click **"Download Order PDF"** to inspect the generated document.

---

### Act 6: Public Cryptographic Verification
**URL**: `http://localhost:5173/verify-release/AICTE/FDR/REL/2026/000001`
*(No Login Required - Open in an Incognito Tab or External Browser)*

1. **Public Verification Seal**:
   - Page verifies reference against AICTE backend repository.
   - Displays authentic **Green Verification Seal**:
     - Institution Name & AICTE ID
     - Bank Name & Branch
     - FDR Number
     - Official Release Date & UTR
     - Total Released Amount in formatted Indian Rupees (`₹XX,XX,XXX.00`)
   - Type a bogus reference (e.g. `INVALID-REF-999`): observe the clear **Red Rejection Warning**.

---

### Act 7: Regulatory Audit & Compliance Reports (Auditor)
**Login**: `auditor@aicte.demo` | `Demo@1234`

1. **Immutable Audit Trail (`/audit`)**:
   - Auditor has system-wide read-only access.
   - Filter by Action (`CREATE`, `VERIFY_DOC`, `APPROVE_RELEASE`, `STATUS_JOB_RUN`).
   - Click **"View Diff"** on any record to open the **JSON State Diff Modal**, contrasting `oldValue` against `newValue`.
2. **Reports & Exports (`/reports`)**:
   - Select from 5 official report types:
     1. Maturity Schedule Report
     2. Bank-Wise Exposure Register
     3. Institution Deposit Ledger
     4. Release Audit Register
     5. Complete System Audit Log
   - Filter by date range and status.
   - Export with one click in **Excel (.xlsx)**, **CSV**, or **PDF** format with full Indian rupee formatting.

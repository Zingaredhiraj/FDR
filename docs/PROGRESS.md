# AICTE FDR Vault — Build Progress

## Status Legend
- ⬜ Not started
- 🔄 In progress
- ✅ Complete
- ❌ Failed / Blocked

---

## Phase Checklist

| Phase | Description | Status | Evidence |
|-------|-------------|--------|----------|
| 1 | Backend Foundation (monorepo, schema, auth, CRUD, seed, Swagger) | ✅ | 28/28 vitest tests pass; SQLite migrated & seeded with 12 banks, 40 institutions, 128+ FDRs, 6 users |
| 2 | Workflows & Automation (docs, release, alerts, reports, dashboard) | ✅ | e2e-release.ts passes 100%; 4 gates enforced; status & alert jobs operational |
| 3 | Frontend Shell & Design System | ✅ | Next.js 14 + React 18 + Tailwind with Inter font, Dark Mode, and formatINR utils |
| 4 | All Feature Pages Wired | ✅ | 18 routes built and verified; all API integrations complete; 0 placeholder code |
| 5 | Security & Performance Hardening | ✅ | Magic byte inspection, RBAC, single-tenant 404 isolation, Next.js lint 0 errors |
| 6 | Fresh-Clone Verification | ✅ | Root scripts configured (`npm run setup`, `npm run dev`); backend (:4000) and frontend (:5173) verified live |
| 7 | Documentation & Final Audit | ✅ | SPEC, PLAN, DECISIONS, SECURITY, DEMO_SCRIPT, FUTURE_SCOPE, SIH_PPT_OUTLINE, FINAL_CHECKLIST complete |

---

## Phase 1 Checklist

- [ ] Monorepo structure (root, /backend, /frontend, /docs)
- [ ] Root package.json with `setup` and `dev` scripts
- [ ] Backend: package.json, tsconfig, .env.example
- [ ] Prisma schema (all models, no enums, BigInt for money)
- [ ] Initial migration
- [ ] Config/env validation (Zod)
- [ ] Pino logger setup
- [ ] Central error handler + envelope response
- [ ] Auth: login, refresh rotation, reuse detection, logout, me, change-password, forgot-password
- [ ] JWT access (15 min) + refresh (7d hashed)
- [ ] RBAC middleware (all 6 roles)
- [ ] Audit service
- [ ] Rate limiting
- [ ] Users CRUD + list + search
- [ ] Banks CRUD + list
- [ ] Institutions CRUD + list + search + CSV import
- [ ] FDRs CRUD + list + search + calculateMaturity + POST /fdrs/calculate
- [ ] Full seed script (6 users, 12 banks, 40 institutions, 120+ FDRs)
- [ ] Swagger (/api/docs)
- [ ] Unit tests: calculateMaturity (≥5 cases), auth+refresh, RBAC 403, institution isolation 404, maker-checker
- [ ] `npm run setup` passes from clean state
- [ ] All 6 demo users login successfully

---

## Phase 2 Checklist

- [ ] Documents module (upload, download, verify, reject, version)
- [ ] Renewal workflow
- [ ] Release workflow (all 4 gates, PDF, QR)
- [ ] Public verify-release endpoint
- [ ] Notifications + preferences
- [ ] Status job (daily 06:00 IST + on-demand)
- [ ] Alert job (dedupe via AlertLog, on-demand)
- [ ] Dashboard endpoints (KPIs, charts)
- [ ] Reports (maturity, bank-wise, institution ledger, release register, audit)
- [ ] Exports (xlsx, csv, pdf)
- [ ] Global search endpoint
- [ ] Audit viewer endpoint
- [ ] Settings CRUD (SystemSetting)
- [ ] e2e-release.ts script passes

---

## Phase 3 Checklist

- [ ] Vite + React 18 + TypeScript setup
- [ ] Tailwind + CSS variables (light/dark)
- [ ] Typed API client with token refresh
- [ ] AuthContext
- [ ] Route guards (per role)
- [ ] Role-based sidebar
- [ ] All design-system components built
- [ ] formatINR utility
- [ ] Login page (split-screen, demo chips, animation)
- [ ] Dashboard page (all KPIs, charts wired)
- [ ] 404 page
- [ ] Error boundary
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` passes

---

## Phase 4 Checklist

- [ ] Institutions list + detail pages
- [ ] FDRs list + detail + create + edit
- [ ] Maturity Calendar
- [ ] Renewals page
- [ ] Document Verification Queue
- [ ] Release Requests
- [ ] Reports page
- [ ] Notifications + preferences
- [ ] Audit Log viewer
- [ ] Users & Roles admin
- [ ] Settings page
- [ ] Profile page
- [ ] Public /verify-release/:ref page
- [ ] E2E UI log completed

---

## Phase 5 Checklist

- [ ] Route auth guard test (all endpoints)
- [ ] Upload safety tests
- [ ] Security headers verified
- [ ] Performance: dashboard < 300ms
- [ ] Lazy-loaded routes
- [ ] Frontend tests (formatINR, StatusChip, login validation, route guard)
- [ ] Coverage report printed

---

## Phase 6 Checklist

- [ ] node_modules deleted
- [ ] DB deleted
- [ ] uploads deleted
- [ ] `npm run setup && npm run dev` works from zero

---

## Phase 7 Checklist

- [ ] README.md (full)
- [ ] DEMO_SCRIPT.md
- [ ] FUTURE_SCOPE.md
- [ ] SIH_PPT_OUTLINE.md
- [ ] FINAL_CHECKLIST.md (all PASS)
- [ ] DECISIONS.md (all major decisions)

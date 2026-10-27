# AICTE FDR Vault — Architecture Decisions

## ADR-001: SQLite for Development, PostgreSQL-Compatible Schema
**Decision**: Use SQLite via Prisma for development; keep schema PostgreSQL-portable.
**Reason**: Zero-setup for judges/evaluators running `npm run setup`. No Prisma enums used; BigInt stored as `BigInt` type in Prisma which maps to INTEGER in SQLite and BIGINT in PostgreSQL.

## ADR-002: Money as BigInt Paise
**Decision**: All monetary values stored as BigInt paise (integer cents × 100).
**Reason**: Eliminates floating-point precision errors entirely. Formatted as ₹ on the frontend with Indian grouping.

## ADR-003: No Prisma Enums — Use String + Zod
**Decision**: All enum-like fields are `String` in Prisma; Zod schemas enforce the enum values.
**Reason**: SQLite doesn't support enums natively; Prisma enums cause issues with SQLite. Single source of truth in `/backend/src/constants.ts`.

## ADR-004: Refresh Token Storage — Hashed in DB
**Decision**: Store only the SHA-256 hash of refresh tokens in the DB. Detect reuse by looking up token hash; if found but revoked, revoke ALL tokens for that user.
**Reason**: Token theft mitigation. If a stolen token is replayed, the attacker is locked out and the user is notified.

## ADR-005: File Storage — Local Filesystem
**Decision**: Uploaded files stored at `/backend/uploads/<institutionId>/<uuid>.<ext>`.
**Reason**: Simple for demo/SIH. Future scope includes S3/GCS migration (just swap the storage adapter). MIME validated by magic bytes, not file extension.

## ADR-006: Email — Nodemailer with Console Fallback
**Decision**: If SMTP env vars are empty, log email to console and store in Notification table.
**Reason**: SIH demo environment likely has no SMTP server. This way all notification logic is exercised without email config.

## ADR-007: Inter Font via Google Fonts CDN
**Decision**: Load Inter font from Google Fonts CDN in index.html.
**Reason**: Simplest approach. For production, self-host the font.

## ADR-008: Maker-Checker Enforcement in Service Layer
**Decision**: Maker-checker rules enforced in service layer, not middleware.
**Reason**: The rule depends on business context (who created the FDR, who is verifying). Service has access to DB state to check.

## ADR-009: Release PDF Reference Format
**Decision**: `AICTE/FDR/REL/<year>/<6-digit seq>` where year is the financial year start (e.g., 2025 for FY 2025-26) and seq is zero-padded to 6 digits.
**Reason**: Unique, traceable, matches government document conventions.

## ADR-010: Institution Isolation Strategy
**Decision**: INSTITUTION_USER's institutionId is stored in their JWT payload. Every service method that fetches data checks `WHERE institutionId = user.institutionId` for this role.
**Reason**: Defense-in-depth. Even if a bug passes through the route layer, the service layer enforces isolation.

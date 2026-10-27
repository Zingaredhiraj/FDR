import { z } from 'zod';

// ============================================================
// USER ROLES
// ============================================================
export const UserRole = z.enum([
  'SUPER_ADMIN',
  'FINANCE_OFFICER',
  'VERIFIER',
  'APPROVING_AUTHORITY',
  'INSTITUTION_USER',
  'AUDITOR',
]);
export type UserRole = z.infer<typeof UserRole>;
export const USER_ROLES = UserRole.options;

// ============================================================
// INSTITUTION TYPES
// ============================================================
export const InstitutionType = z.enum([
  'Engineering',
  'Management',
  'Pharmacy',
  'Architecture',
  'MCA',
  'MBA',
  'Hotel Management',
  'Applied Arts',
  'Town Planning',
  'Other',
]);
export type InstitutionType = z.infer<typeof InstitutionType>;

// ============================================================
// INSTITUTION APPROVAL STATUS
// ============================================================
export const InstitutionApprovalStatus = z.enum([
  'APPROVED',
  'PENDING',
  'SUSPENDED',
]);
export type InstitutionApprovalStatus = z.infer<typeof InstitutionApprovalStatus>;

// ============================================================
// FDR STATUS
// ============================================================
export const FdrStatus = z.enum([
  'ACTIVE',
  'NEAR_MATURITY',
  'MATURED',
  'RENEWED',
  'RELEASE_REQUESTED',
  'RELEASED',
  'CLOSED',
  'ENCASHED',
]);
export type FdrStatus = z.infer<typeof FdrStatus>;
export const FDR_STATUSES = FdrStatus.options;

// ============================================================
// FDR INTEREST TYPE
// ============================================================
export const InterestType = z.enum(['CUMULATIVE', 'QUARTERLY_PAYOUT']);
export type InterestType = z.infer<typeof InterestType>;

// ============================================================
// FDR PURPOSE
// ============================================================
export const FdrPurpose = z.enum([
  'APPROVAL_PROCESS_FEE',
  'SECURITY_DEPOSIT',
  'PERFORMANCE_GUARANTEE',
  'OTHER',
]);
export type FdrPurpose = z.infer<typeof FdrPurpose>;

// ============================================================
// DOCUMENT TYPES
// ============================================================
export const DocumentType = z.enum([
  'FDR_SCAN',
  'BANK_CONFIRMATION',
  'LIEN_LETTER',
  'UNDERTAKING',
  'NOC',
  'ID_PROOF',
  'OTHER',
]);
export type DocumentType = z.infer<typeof DocumentType>;

// Required document types for "document-complete"
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  'FDR_SCAN',
  'BANK_CONFIRMATION',
  'LIEN_LETTER',
];

// ============================================================
// DOCUMENT VERIFICATION STATUS
// ============================================================
export const DocumentVerificationStatus = z.enum([
  'PENDING',
  'VERIFIED',
  'REJECTED',
]);
export type DocumentVerificationStatus = z.infer<typeof DocumentVerificationStatus>;

// ============================================================
// RELEASE REQUEST STATUS
// ============================================================
export const ReleaseRequestStatus = z.enum([
  'DRAFT',
  'SUBMITTED',
  'VERIFIED',
  'APPROVED',
  'RELEASED',
]);
export type ReleaseRequestStatus = z.infer<typeof ReleaseRequestStatus>;

// ============================================================
// RELEASE STEP ACTIONS
// ============================================================
export const ReleaseStepAction = z.enum([
  'CREATED',
  'SUBMITTED',
  'VERIFIED',
  'REJECTED',
  'APPROVED',
  'RELEASED',
]);
export type ReleaseStepAction = z.infer<typeof ReleaseStepAction>;

// ============================================================
// NOTIFICATION TYPES
// ============================================================
export const NotificationType = z.enum([
  'MATURITY_ALERT',
  'DOCUMENT_PENDING',
  'RELEASE_STATUS',
  'SYSTEM',
]);
export type NotificationType = z.infer<typeof NotificationType>;

// ============================================================
// ALERT TYPES
// ============================================================
export const AlertType = z.enum([
  'DAYS_90',
  'DAYS_60',
  'DAYS_30',
  'DAYS_15',
  'DAYS_7',
  'DAYS_1',
  'MATURITY_DAY',
  'OVERDUE_7',
]);
export type AlertType = z.infer<typeof AlertType>;

// Alert thresholds mapping (days before maturity → AlertType)
export const ALERT_THRESHOLDS: Record<number, AlertType> = {
  90: 'DAYS_90',
  60: 'DAYS_60',
  30: 'DAYS_30',
  15: 'DAYS_15',
  7:  'DAYS_7',
  1:  'DAYS_1',
  0:  'MATURITY_DAY',
};

// ============================================================
// AUDIT ACTIONS
// ============================================================
export const AuditAction = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'VERIFY',
  'APPROVE',
  'REJECT',
  'RELEASE',
  'REVOKE_TOKENS',
]);
export type AuditAction = z.infer<typeof AuditAction>;

// ============================================================
// SYSTEM SETTING KEYS
// ============================================================
export const SYSTEM_SETTING_KEYS = {
  NEAR_MATURITY_DAYS: 'nearMaturityDays',
  ALERT_EMAIL_ENABLED: 'alertEmailEnabled',
  MAX_FILE_SIZE_MB: 'maxFileSizeMB',
} as const;

export const DEFAULT_NEAR_MATURITY_DAYS = 90;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// ============================================================
// PAGINATION
// ============================================================
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/crypto';
import { sendError } from '../utils/response';
import { UserRole } from '../constants';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      sendError(res, `Access denied. Required roles: ${roles.join(', ')}`, 403);
      return;
    }
    next();
  };
}

export function authorizeAll(req: Request, res: Response, next: NextFunction): void {
  authenticate(req, res, next);
}

// Shorthand helpers
export const requireSuperAdmin = authorize('SUPER_ADMIN');
export const requireFinanceOfficer = authorize('SUPER_ADMIN', 'FINANCE_OFFICER');
export const requireVerifier = authorize('SUPER_ADMIN', 'VERIFIER');
export const requireApprovingAuthority = authorize('SUPER_ADMIN', 'APPROVING_AUTHORITY');
export const requireAuditor = authorize('SUPER_ADMIN', 'AUDITOR');

// Institution isolation: enforced in service layer based on user.institutionId
export function getInstitutionFilter(user: AccessTokenPayload): string | undefined {
  if (user.role === 'INSTITUTION_USER') {
    return user.institutionId;
  }
  return undefined;
}

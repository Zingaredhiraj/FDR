import { prisma } from '../prisma';
import { AppError, NotFoundError, UnprocessableError } from '../middleware/errorHandler';
import {
  comparePassword,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  generateForgotPasswordToken,
  AccessTokenPayload,
} from '../utils/crypto';
import { appendAuditLog } from '../utils/audit';
import { UserRole } from '../constants';
import { logger } from '../logger';

const REFRESH_EXPIRES_DAYS = 7;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    institutionId?: string;
  };
}

export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  if (!user || !user.isActive) {
    await appendAuditLog({
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: user?.id,
      newValue: { email },
      ipAddress,
      userAgent,
    });
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    await appendAuditLog({
      userId: user.id,
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: user.id,
      newValue: { email },
      ipAddress,
      userAgent,
    });
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = generateAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
    institutionId: user.institutionId || undefined,
    name: user.name,
  });

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  await appendAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId || undefined,
    },
  };
}

export async function refresh(
  rawToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = hashToken(rawToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Reuse detection: if token is already revoked, revoke ALL tokens for this user
  if (existing.isRevoked) {
    logger.warn({ userId: existing.userId }, 'Refresh token reuse detected — revoking all tokens');
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, isRevoked: false },
      data: { isRevoked: true },
    });
    await appendAuditLog({
      userId: existing.userId,
      action: 'REVOKE_TOKENS',
      entity: 'User',
      entityId: existing.userId,
      ipAddress,
      userAgent,
    });
    throw new AppError('Token reuse detected. All sessions revoked. Please login again.', 401);
  }

  if (existing.expiresAt < new Date()) {
    throw new AppError('Refresh token expired', 401);
  }

  if (!existing.user.isActive) {
    throw new AppError('Account deactivated', 401);
  }

  // Rotate: revoke old, issue new
  const newRaw = generateRefreshToken();
  const newHash = hashToken(newRaw);
  const newExpiry = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { isRevoked: true, replacedByTokenHash: newHash },
  });

  await prisma.refreshToken.create({
    data: {
      userId: existing.userId,
      tokenHash: newHash,
      expiresAt: newExpiry,
      ipAddress,
      userAgent,
    },
  });

  const accessToken = generateAccessToken({
    sub: existing.user.id,
    email: existing.user.email,
    role: existing.user.role as UserRole,
    institutionId: existing.user.institutionId || undefined,
    name: existing.user.name,
  });

  return { accessToken, refreshToken: newRaw };
}

export async function logout(
  rawToken: string,
  userId: string,
  ipAddress?: string
): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, userId },
    data: { isRevoked: true },
  });
  await appendAuditLog({
    userId,
    action: 'LOGOUT',
    entity: 'User',
    entityId: userId,
    ipAddress,
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  // Never reveal whether email exists or not
  if (!user) return;

  const token = generateForgotPasswordToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  logger.info(
    { userId: user.id, email: user.email, token, expiresAt },
    '🔑 [DEV] Forgot password token (use this to reset)'
  );
}

export async function getMe(userId: string): Promise<AccessTokenPayload & { institutionName?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { institution: { select: { name: true } } },
  });
  if (!user) throw new NotFoundError('User');

  return {
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
    institutionId: user.institutionId || undefined,
    name: user.name,
    institutionName: user.institution?.name,
  };
}

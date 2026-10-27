import { prisma } from '../prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/crypto';
import { appendAuditLog } from '../utils/audit';
import { UserRole } from '../constants';
import { parsePagination, parseSort } from '../utils/pagination';
import { paginationMeta } from '../utils/response';

export async function listUsers(query: Record<string, unknown>) {
  const { skip, take, page, pageSize } = parsePagination(query);
  const search = String(query.search || '').trim();
  const role = query.role ? String(query.role) : undefined;

  const where = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    }),
    ...(role && { role }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: parseSort(query, ['name', 'email', 'role', 'createdAt']),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        institutionId: true,
        isActive: true,
        createdAt: true,
        institution: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: paginationMeta(total, page, pageSize) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      institutionId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      institution: { select: { id: true, name: true } },
    },
  });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  institutionId?: string;
}, actorId: string, ipAddress?: string) {
  const existing = await prisma.user.findFirst({
    where: { email: data.email.toLowerCase(), deletedAt: null },
  });
  if (existing) throw new ConflictError('Email already in use');

  if (data.role === 'INSTITUTION_USER' && !data.institutionId) {
    throw new ConflictError('institutionId is required for INSTITUTION_USER role');
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone,
      institutionId: data.institutionId,
    },
    select: {
      id: true, email: true, name: true, role: true, phone: true, institutionId: true, isActive: true, createdAt: true,
    },
  });

  await appendAuditLog({
    userId: actorId,
    action: 'CREATE',
    entity: 'User',
    entityId: user.id,
    newValue: { email: user.email, role: user.role },
    ipAddress,
  });

  return user;
}

export async function updateUser(
  id: string,
  data: { name?: string; phone?: string; role?: UserRole; isActive?: boolean; institutionId?: string },
  actorId: string,
  ipAddress?: string
) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new NotFoundError('User');

  // Cannot deactivate yourself
  if (id === actorId && data.isActive === false) {
    throw new ForbiddenError('Cannot deactivate your own account');
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, email: true, name: true, role: true, phone: true, institutionId: true, isActive: true, updatedAt: true,
    },
  });

  await appendAuditLog({
    userId: actorId,
    action: 'UPDATE',
    entity: 'User',
    entityId: id,
    oldValue: { name: user.name, role: user.role, isActive: user.isActive },
    newValue: data,
    ipAddress,
  });

  return updated;
}

export async function deleteUser(id: string, actorId: string, ipAddress?: string) {
  if (id === actorId) throw new ForbiddenError('Cannot delete your own account');
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new NotFoundError('User');

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await appendAuditLog({
    userId: actorId,
    action: 'DELETE',
    entity: 'User',
    entityId: id,
    oldValue: { email: user.email },
    ipAddress,
  });
}

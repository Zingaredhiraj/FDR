import { prisma } from '../prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorHandler';
import { appendAuditLog } from '../utils/audit';
import { InstitutionType, InstitutionApprovalStatus } from '../constants';
import { parsePagination, parseSort } from '../utils/pagination';
import { paginationMeta } from '../utils/response';
import { AccessTokenPayload } from '../utils/crypto';

export async function listInstitutions(query: Record<string, unknown>, actor: AccessTokenPayload) {
  const { skip, take, page, pageSize } = parsePagination(query);
  const search = String(query.search || '').trim();

  // INSTITUTION_USER can only see their own institution
  if (actor.role === 'INSTITUTION_USER') {
    const inst = await prisma.institution.findFirst({
      where: { id: actor.institutionId, deletedAt: null },
    });
    return { institutions: inst ? [inst] : [], meta: paginationMeta(inst ? 1 : 0, 1, 1) };
  }

  const where: any = {
    deletedAt: null,
  };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { aicteId: { contains: search } },
      { city: { contains: search } },
      { state: { contains: search } },
    ];
  }
  if (query.state) where.state = String(query.state);
  if (query.type) where.type = String(query.type);
  if (query.approvalStatus) where.approvalStatus = String(query.approvalStatus);

  const [institutions, total] = await Promise.all([
    prisma.institution.findMany({
      where,
      skip,
      take,
      orderBy: parseSort(query, ['name', 'aicteId', 'state', 'city', 'createdAt']),
    }),
    prisma.institution.count({ where }),
  ]);

  return { institutions, meta: paginationMeta(total, page, pageSize) };
}

export async function getInstitutionById(id: string, actor: AccessTokenPayload) {
  // Institution isolation
  if (actor.role === 'INSTITUTION_USER' && actor.institutionId !== id) {
    throw new NotFoundError('Institution');
  }

  const inst = await prisma.institution.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: { fdrs: { where: { deletedAt: null } }, users: { where: { deletedAt: null } } },
      },
    },
  });
  if (!inst) throw new NotFoundError('Institution');
  return inst;
}

export async function createInstitution(
  data: {
    aicteId: string;
    name: string;
    type: InstitutionType;
    state: string;
    city: string;
    headName: string;
    headEmail: string;
    phone: string;
    approvalStatus?: InstitutionApprovalStatus;
  },
  actorId: string,
  ipAddress?: string
) {
  const existing = await prisma.institution.findUnique({ where: { aicteId: data.aicteId } });
  if (existing) throw new ConflictError('AICTE ID already exists');

  const inst = await prisma.institution.create({ data });

  await appendAuditLog({
    userId: actorId,
    action: 'CREATE',
    entity: 'Institution',
    entityId: inst.id,
    newValue: { name: inst.name, aicteId: inst.aicteId },
    ipAddress,
  });

  return inst;
}

export async function updateInstitution(
  id: string,
  data: Partial<{
    name: string;
    type: InstitutionType;
    state: string;
    city: string;
    headName: string;
    headEmail: string;
    phone: string;
    approvalStatus: InstitutionApprovalStatus;
    hasPendingDues: boolean;
    pendingDuesNote: string;
  }>,
  actorId: string,
  ipAddress?: string
) {
  const inst = await prisma.institution.findFirst({ where: { id, deletedAt: null } });
  if (!inst) throw new NotFoundError('Institution');

  const updated = await prisma.institution.update({ where: { id }, data });

  await appendAuditLog({
    userId: actorId,
    action: 'UPDATE',
    entity: 'Institution',
    entityId: id,
    oldValue: { name: inst.name, approvalStatus: inst.approvalStatus },
    newValue: data,
    ipAddress,
  });

  return updated;
}

export async function deleteInstitution(id: string, actorId: string, ipAddress?: string) {
  const inst = await prisma.institution.findFirst({ where: { id, deletedAt: null } });
  if (!inst) throw new NotFoundError('Institution');

  // Check no active FDRs
  const activeFdrs = await prisma.fdr.count({
    where: { institutionId: id, deletedAt: null, status: { notIn: ['RELEASED', 'CLOSED', 'ENCASHED'] } },
  });
  if (activeFdrs > 0) throw new ForbiddenError('Cannot delete institution with active FDRs');

  await prisma.institution.update({ where: { id }, data: { deletedAt: new Date() } });

  await appendAuditLog({
    userId: actorId,
    action: 'DELETE',
    entity: 'Institution',
    entityId: id,
    oldValue: { name: inst.name, aicteId: inst.aicteId },
    ipAddress,
  });
}

export async function updatePendingDues(
  id: string,
  hasPendingDues: boolean,
  pendingDuesNote: string | undefined,
  actorId: string,
  ipAddress?: string
) {
  const inst = await prisma.institution.findFirst({ where: { id, deletedAt: null } });
  if (!inst) throw new NotFoundError('Institution');

  const updated = await prisma.institution.update({
    where: { id },
    data: { hasPendingDues, pendingDuesNote },
  });

  await appendAuditLog({
    userId: actorId,
    action: 'UPDATE',
    entity: 'Institution',
    entityId: id,
    oldValue: { hasPendingDues: inst.hasPendingDues },
    newValue: { hasPendingDues, pendingDuesNote },
    ipAddress,
  });

  return updated;
}

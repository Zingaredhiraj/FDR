import { prisma } from '../prisma';
import { NotFoundError, ConflictError, ForbiddenError, AppError } from '../middleware/errorHandler';
import { appendAuditLog } from '../utils/audit';
import { calculateMaturity, serializeMaturityResult, MaturityInput } from '../utils/maturity';
import { FdrStatus, FdrPurpose, InterestType } from '../constants';
import { parsePagination, parseSort } from '../utils/pagination';
import { paginationMeta } from '../utils/response';
import { AccessTokenPayload } from '../utils/crypto';
import { getTodayIST } from '../utils/indianDate';

function serializeFdr(fdr: Record<string, unknown>) {
  // Convert BigInt fields to strings for JSON serialization
  return {
    ...fdr,
    principal: fdr.principal !== undefined ? String(fdr.principal) : undefined,
    maturityAmount: fdr.maturityAmount !== undefined ? String(fdr.maturityAmount) : undefined,
    quarterlyPayout: fdr.quarterlyPayout !== undefined ? String(fdr.quarterlyPayout) : undefined,
  };
}

function buildInstitutionFilter(actor: AccessTokenPayload): string | undefined {
  if (actor.role === 'INSTITUTION_USER') return actor.institutionId;
  return undefined;
}

export async function listFdrs(query: Record<string, unknown>, actor: AccessTokenPayload) {
  const { skip, take, page, pageSize } = parsePagination(query);
  const search = String(query.search || '').trim();
  const institutionFilter = buildInstitutionFilter(actor);

  const today = getTodayIST();

  const where: any = { deletedAt: null };
  if (institutionFilter) {
    where.institutionId = institutionFilter;
  } else if (query.institutionId) {
    where.institutionId = String(query.institutionId);
  }
  if (query.bankId) where.bankId = String(query.bankId);
  if (query.status) where.status = String(query.status);
  if (query.purpose) where.purpose = String(query.purpose);
  if (query.academicYear) where.academicYear = String(query.academicYear);
  if (search) {
    where.OR = [
      { fdrNumber: { contains: search } },
      { institution: { name: { contains: search } } },
      { bank: { name: { contains: search } } },
    ];
  }
  if (query.maturityFrom || query.maturityTo) {
    where.maturityDate = {};
    if (query.maturityFrom) where.maturityDate.gte = new Date(String(query.maturityFrom));
    if (query.maturityTo) where.maturityDate.lte = new Date(String(query.maturityTo));
  }

  const [fdrs, total] = await Promise.all([
    prisma.fdr.findMany({
      where,
      skip,
      take,
      orderBy: parseSort(query, ['fdrNumber', 'maturityDate', 'principal', 'status', 'createdAt']),
      include: {
        institution: { select: { id: true, name: true, aicteId: true } },
        bank: { select: { id: true, name: true, shortCode: true } },
        _count: { select: { documents: { where: { deletedAt: null } } } },
      },
    }),
    prisma.fdr.count({ where }),
  ]);

  // Compute overdue flag
  const enriched = fdrs.map(fdr => {
    const isOverdue = fdr.status === 'MATURED' && fdr.maturityDate < today;
    const overdueDays = isOverdue
      ? Math.floor((today.getTime() - fdr.maturityDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return { ...serializeFdr(fdr as unknown as Record<string, unknown>), isOverdue, overdueDays };
  });

  return { fdrs: enriched, meta: paginationMeta(total, page, pageSize) };
}

export async function getFdrById(id: string, actor: AccessTokenPayload) {
  const institutionFilter = buildInstitutionFilter(actor);

  const fdr = await prisma.fdr.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(institutionFilter && { institutionId: institutionFilter }),
    },
    include: {
      institution: true,
      bank: true,
      createdBy: { select: { id: true, name: true, email: true } },
      parentFdr: { select: { id: true, fdrNumber: true } },
      renewedAs: { select: { id: true, fdrNumber: true, status: true } },
      documents: {
        where: { deletedAt: null },
        orderBy: [{ documentType: 'asc' }, { version: 'desc' }],
        include: {
          uploadedBy: { select: { id: true, name: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
      },
      releaseRequests: {
        where: { status: { notIn: [] } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!fdr) throw new NotFoundError('FDR');

  const today = getTodayIST();
  const isOverdue = fdr.status === 'MATURED' && fdr.maturityDate < today;
  const overdueDays = isOverdue
    ? Math.floor((today.getTime() - fdr.maturityDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    ...serializeFdr(fdr as unknown as Record<string, unknown>),
    isOverdue,
    overdueDays,
  };
}

export async function createFdr(
  data: {
    fdrNumber: string;
    institutionId: string;
    bankId: string;
    branch: string;
    ifsc: string;
    principal: bigint;
    interestRate: number;
    interestType: InterestType;
    issueDate: Date;
    tenureMonths: number;
    lienMarked?: boolean;
    purpose: FdrPurpose;
    academicYear: string;
    remarks?: string;
    parentFdrId?: string;
  },
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  // INSTITUTION_USER cannot create FDRs for other institutions
  if (actor.role === 'INSTITUTION_USER' && actor.institutionId !== data.institutionId) {
    throw new ForbiddenError('Cannot create FDR for another institution');
  }

  const existing = await prisma.fdr.findFirst({ where: { fdrNumber: data.fdrNumber, deletedAt: null } });
  if (existing) throw new ConflictError('FDR number already exists');

  // Validate institution exists
  const institution = await prisma.institution.findFirst({ where: { id: data.institutionId, deletedAt: null } });
  if (!institution) throw new NotFoundError('Institution');

  // Validate bank exists
  const bank = await prisma.bank.findFirst({ where: { id: data.bankId, isActive: true } });
  if (!bank) throw new NotFoundError('Bank');

  const maturityInput: MaturityInput = {
    principal: data.principal,
    interestRate: data.interestRate,
    interestType: data.interestType,
    tenureMonths: data.tenureMonths,
  };

  const { maturityAmount, quarterlyPayout, maturityDate } = calculateMaturity(maturityInput, data.issueDate);

  const fdr = await prisma.fdr.create({
    data: {
      fdrNumber: data.fdrNumber,
      institutionId: data.institutionId,
      bankId: data.bankId,
      branch: data.branch,
      ifsc: data.ifsc,
      principal: data.principal,
      interestRate: data.interestRate,
      interestType: data.interestType,
      issueDate: data.issueDate,
      tenureMonths: data.tenureMonths,
      maturityDate,
      maturityAmount,
      quarterlyPayout,
      lienMarked: data.lienMarked ?? false,
      purpose: data.purpose,
      academicYear: data.academicYear,
      remarks: data.remarks,
      parentFdrId: data.parentFdrId,
      createdById: actor.sub,
      status: 'ACTIVE',
    },
    include: {
      institution: { select: { id: true, name: true } },
      bank: { select: { id: true, name: true } },
    },
  });

  await appendAuditLog({
    userId: actor.sub,
    action: 'CREATE',
    entity: 'Fdr',
    entityId: fdr.id,
    newValue: { fdrNumber: fdr.fdrNumber, principal: String(fdr.principal), institutionId: fdr.institutionId },
    ipAddress,
  });

  return serializeFdr(fdr as unknown as Record<string, unknown>);
}

export async function updateFdr(
  id: string,
  data: Partial<{
    branch: string;
    ifsc: string;
    lienMarked: boolean;
    remarks: string;
    academicYear: string;
  }>,
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  const institutionFilter = buildInstitutionFilter(actor);
  const fdr = await prisma.fdr.findFirst({
    where: { id, deletedAt: null, ...(institutionFilter && { institutionId: institutionFilter }) },
  });
  if (!fdr) throw new NotFoundError('FDR');

  if (['RELEASED', 'CLOSED', 'ENCASHED'].includes(fdr.status)) {
    throw new ForbiddenError('Cannot edit a released, closed, or encashed FDR');
  }

  const updated = await prisma.fdr.update({
    where: { id },
    data,
    include: {
      institution: { select: { id: true, name: true } },
      bank: { select: { id: true, name: true } },
    },
  });

  await appendAuditLog({
    userId: actor.sub,
    action: 'UPDATE',
    entity: 'Fdr',
    entityId: id,
    oldValue: { branch: fdr.branch, ifsc: fdr.ifsc, lienMarked: fdr.lienMarked },
    newValue: data,
    ipAddress,
  });

  return serializeFdr(updated as unknown as Record<string, unknown>);
}

export async function deleteFdr(id: string, actor: AccessTokenPayload, ipAddress?: string) {
  const fdr = await prisma.fdr.findFirst({ where: { id, deletedAt: null } });
  if (!fdr) throw new NotFoundError('FDR');

  if (fdr.status !== 'ACTIVE') {
    throw new ForbiddenError('Only ACTIVE FDRs can be deleted');
  }

  await prisma.fdr.update({ where: { id }, data: { deletedAt: new Date() } });

  await appendAuditLog({
    userId: actor.sub,
    action: 'DELETE',
    entity: 'Fdr',
    entityId: id,
    oldValue: { fdrNumber: fdr.fdrNumber },
    ipAddress,
  });
}

export async function calculateFdrPreview(
  principal: bigint,
  interestRate: number,
  interestType: InterestType,
  issueDate: Date,
  tenureMonths: number
) {
  const input: MaturityInput = { principal, interestRate, interestType, tenureMonths };
  const result = calculateMaturity(input, issueDate);
  return serializeMaturityResult(result);
}

export async function getRenewalDueList(actor: AccessTokenPayload) {
  const institutionFilter = buildInstitutionFilter(actor);

  const fdrs = await prisma.fdr.findMany({
    where: {
      deletedAt: null,
      status: { in: ['NEAR_MATURITY', 'MATURED'] },
      renewedAs: { none: {} },
      ...(institutionFilter && { institutionId: institutionFilter }),
    },
    include: {
      institution: { select: { id: true, name: true } },
      bank: { select: { id: true, name: true } },
    },
    orderBy: { maturityDate: 'asc' },
  });

  return fdrs.map(fdr => serializeFdr(fdr as unknown as Record<string, unknown>));
}

export async function getFdrChain(id: string, actor: AccessTokenPayload) {
  const institutionFilter = buildInstitutionFilter(actor);

  // Walk up to root
  let current: any = await prisma.fdr.findFirst({
    where: { id, deletedAt: null, ...(institutionFilter && { institutionId: institutionFilter }) },
  });
  if (!current) throw new NotFoundError('FDR');

  // Find root
  while (current.parentFdrId) {
    const parent = await prisma.fdr.findUnique({ where: { id: current.parentFdrId } });
    if (!parent) break;
    current = parent;
  }

  // Build chain recursively
  async function buildChain(fdrId: string): Promise<unknown> {
    const fdr = await prisma.fdr.findUnique({
      where: { id: fdrId },
      include: {
        institution: { select: { id: true, name: true } },
        bank: { select: { id: true, name: true } },
        renewedAs: { select: { id: true, fdrNumber: true, status: true } },
      },
    });
    if (!fdr) return null;

    const children = await Promise.all(fdr.renewedAs.map(r => buildChain(r.id)));

    return {
      ...serializeFdr(fdr as unknown as Record<string, unknown>),
      children: children.filter(Boolean),
    };
  }

  return buildChain(current.id);
}

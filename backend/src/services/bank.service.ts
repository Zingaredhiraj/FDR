import { prisma } from '../prisma';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';
import { appendAuditLog } from '../utils/audit';

export async function listBanks(query: Record<string, unknown>) {
  const search = String(query.search || '').trim();
  const includeInactive = query.includeInactive === 'true';

  const banks = await prisma.bank.findMany({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { shortCode: { contains: search } },
        ],
      }),
      ...(!includeInactive && { isActive: true }),
    },
    orderBy: { name: 'asc' },
  });

  return banks;
}

export async function getBankById(id: string) {
  const bank = await prisma.bank.findUnique({ where: { id } });
  if (!bank) throw new NotFoundError('Bank');
  return bank;
}

export async function createBank(data: { name: string; shortCode: string }, actorId: string, ipAddress?: string) {
  const existing = await prisma.bank.findUnique({ where: { shortCode: data.shortCode.toUpperCase() } });
  if (existing) throw new ConflictError('Bank short code already exists');

  const bank = await prisma.bank.create({
    data: { name: data.name, shortCode: data.shortCode.toUpperCase() },
  });

  await appendAuditLog({
    userId: actorId,
    action: 'CREATE',
    entity: 'Bank',
    entityId: bank.id,
    newValue: { name: bank.name, shortCode: bank.shortCode },
    ipAddress,
  });

  return bank;
}

export async function updateBank(
  id: string,
  data: { name?: string; isActive?: boolean },
  actorId: string,
  ipAddress?: string
) {
  const bank = await prisma.bank.findUnique({ where: { id } });
  if (!bank) throw new NotFoundError('Bank');

  const updated = await prisma.bank.update({ where: { id }, data });

  await appendAuditLog({
    userId: actorId,
    action: 'UPDATE',
    entity: 'Bank',
    entityId: id,
    oldValue: { name: bank.name, isActive: bank.isActive },
    newValue: data,
    ipAddress,
  });

  return updated;
}

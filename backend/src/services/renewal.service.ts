import { prisma } from '../prisma';
import { NotFoundError, UnprocessableError } from '../middleware/errorHandler';
import { appendAuditLog } from '../utils/audit';
import { createFdr } from './fdr.service';
import { AccessTokenPayload } from '../utils/crypto';

export async function createRenewal(
  parentFdrId: string,
  data: {
    fdrNumber: string;
    bankId: string;
    branch: string;
    ifsc: string;
    principal: bigint;
    interestRate: number;
    interestType: 'CUMULATIVE' | 'QUARTERLY_PAYOUT';
    issueDate: Date;
    tenureMonths: number;
    lienMarked?: boolean;
    academicYear: string;
    remarks?: string;
  },
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  const parentFdr = await prisma.fdr.findFirst({
    where: { id: parentFdrId, deletedAt: null },
  });
  if (!parentFdr) throw new NotFoundError('FDR');

  // Check no existing child
  const existingChild = await prisma.fdr.findFirst({
    where: { parentFdrId, deletedAt: null },
  });
  if (existingChild) {
    throw new UnprocessableError('This FDR already has a renewal. Only one renewal chain is allowed per FDR.');
  }

  // Status must be NEAR_MATURITY or MATURED
  if (!['NEAR_MATURITY', 'MATURED'].includes(parentFdr.status)) {
    throw new UnprocessableError(`Renewal is only allowed for NEAR_MATURITY or MATURED FDRs (current: ${parentFdr.status}).`);
  }

  // Create new FDR with parentFdrId
  const newFdr = await createFdr(
    {
      ...data,
      institutionId: parentFdr.institutionId,
      purpose: parentFdr.purpose as 'APPROVAL_PROCESS_FEE' | 'SECURITY_DEPOSIT' | 'PERFORMANCE_GUARANTEE' | 'OTHER',
      parentFdrId,
    },
    actor,
    ipAddress
  );

  // Mark parent as RENEWED
  await prisma.fdr.update({
    where: { id: parentFdrId },
    data: { status: 'RENEWED' },
  });

  await appendAuditLog({
    userId: actor.sub,
    action: 'CREATE',
    entity: 'Fdr',
    entityId: typeof newFdr === 'object' && newFdr !== null ? (newFdr as any).id : '',
    newValue: { type: 'RENEWAL', parentFdrId },
    ipAddress,
  });

  return newFdr;
}

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { prisma } from '../prisma';
import { NotFoundError, ForbiddenError, UnprocessableError, AppError, ConflictError } from '../middleware/errorHandler';
import { appendAuditLog } from '../utils/audit';
import { checkDocumentComplete } from './document.service';
import { createNotification } from './notification.service';
import { config } from '../config';
import { AccessTokenPayload } from '../utils/crypto';
import { getTodayIST } from '../utils/indianDate';
import { parsePagination } from '../utils/pagination';
import { paginationMeta } from '../utils/response';

const RELEASES_PDF_DIR = path.join(process.cwd(), 'uploads', 'releases');

function ensureReleasesDir() {
  if (!fs.existsSync(RELEASES_PDF_DIR)) {
    fs.mkdirSync(RELEASES_PDF_DIR, { recursive: true });
  }
}

function serializeRelease(r: Record<string, unknown>) {
  return {
    ...r,
    releasedAmount: r.releasedAmount !== undefined ? String(r.releasedAmount) : null,
    deductions: r.deductions !== undefined ? String(r.deductions) : '0',
  };
}

async function generateReferenceNumber(): Promise<string> {
  const today = getTodayIST();
  const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;

  const count = await prisma.releaseRequest.count({
    where: {
      createdAt: {
        gte: new Date(Date.UTC(fyStartYear, 3, 1)),
        lt: new Date(Date.UTC(fyStartYear + 1, 3, 1)),
      },
    },
  });

  const seq = String(count + 1).padStart(6, '0');
  return `AICTE/FDR/REL/${fyStartYear}/${seq}`;
}

async function generateReleasePdf(releaseRequest: {
  id: string;
  referenceNumber: string;
  fdr: {
    fdrNumber: string;
    institution: { name: string; aicteId: string };
    bank: { name: string };
    principal: bigint;
    maturityAmount: bigint;
  };
  releaseDate: Date;
  utr: string;
  releasedAmount: bigint;
  deductions: bigint;
  deductionReason: string | null;
}): Promise<string> {
  ensureReleasesDir();

  const filename = `${releaseRequest.referenceNumber.replace(/\//g, '-')}.pdf`;
  const filePath = path.join(RELEASES_PDF_DIR, filename);

  const verifyUrl = `${config.APP_BASE_URL}/api/v1/public/verify-release/${releaseRequest.referenceNumber}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl);
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('AICTE - Release Order', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('All India Council for Technical Education', { align: 'center' });
    doc.moveDown();

    // Reference
    doc.fontSize(14).font('Helvetica-Bold').text(`Reference: ${releaseRequest.referenceNumber}`, { align: 'center' });
    doc.moveDown();

    // Details table
    const details = [
      ['Institution', releaseRequest.fdr.institution.name],
      ['AICTE ID', releaseRequest.fdr.institution.aicteId],
      ['FDR Number', releaseRequest.fdr.fdrNumber],
      ['Bank', releaseRequest.fdr.bank.name],
      ['Release Date', releaseRequest.releaseDate.toLocaleDateString('en-IN')],
      ['UTR Number', releaseRequest.utr],
      ['Principal Amount', `₹${(Number(releaseRequest.fdr.principal) / 100).toFixed(2)}`],
      ['Maturity Amount', `₹${(Number(releaseRequest.fdr.maturityAmount) / 100).toFixed(2)}`],
      ['Released Amount', `₹${(Number(releaseRequest.releasedAmount) / 100).toFixed(2)}`],
      ['Deductions', `₹${(Number(releaseRequest.deductions) / 100).toFixed(2)}`],
    ];

    if (releaseRequest.deductionReason) {
      details.push(['Deduction Reason', releaseRequest.deductionReason]);
    }

    doc.font('Helvetica').fontSize(11);
    details.forEach(([key, value]) => {
      doc.text(`${key}: `, { continued: true }).font('Helvetica-Bold').text(value as string);
      doc.font('Helvetica');
    });

    doc.moveDown();

    // QR Code
    doc.text('Scan to verify this release order:', { align: 'center' });
    doc.image(qrBuffer, { width: 100, align: 'center' });
    doc.moveDown();

    // Verify URL
    doc.fontSize(9).font('Helvetica').text(verifyUrl, { align: 'center', link: verifyUrl });
    doc.moveDown();

    // Footer
    doc.fontSize(9).text(
      'This is a system-generated document. For queries, contact AICTE at aicte-india.org.',
      { align: 'center' }
    );
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

export async function listReleases(query: Record<string, unknown>, actor: AccessTokenPayload) {
  const { skip, take, page, pageSize } = parsePagination(query);
  const institutionFilter = actor.role === 'INSTITUTION_USER' ? actor.institutionId : undefined;

  const where: any = {};
  if (query.status) where.status = String(query.status);
  if (institutionFilter) where.fdr = { institutionId: institutionFilter };
  if (query.fdrId) where.fdrId = String(query.fdrId);

  const [releases, total] = await Promise.all([
    prisma.releaseRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        fdr: {
          select: {
            id: true,
            fdrNumber: true,
            institution: { select: { id: true, name: true } },
            bank: { select: { id: true, name: true } },
            maturityAmount: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
        steps: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.releaseRequest.count({ where }),
  ]);

  return {
    releases: releases.map(r => serializeRelease(r as unknown as Record<string, unknown>)),
    meta: paginationMeta(total, page, pageSize),
  };
}

export async function getReleaseById(id: string, actor: AccessTokenPayload) {
  const institutionFilter = actor.role === 'INSTITUTION_USER' ? actor.institutionId : undefined;

  const release = await prisma.releaseRequest.findFirst({
    where: {
      id,
      ...(institutionFilter && { fdr: { institutionId: institutionFilter } }),
    },
    include: {
      fdr: {
        include: {
          institution: true,
          bank: true,
        },
      },
      createdBy: { select: { id: true, name: true, role: true } },
      steps: {
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!release) throw new NotFoundError('Release request');

  return serializeRelease(release as unknown as Record<string, unknown>);
}

export async function createReleaseRequest(
  fdrId: string,
  prematureRelease: boolean,
  prematureReason: string | undefined,
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  const fdr = await prisma.fdr.findFirst({
    where: {
      id: fdrId,
      deletedAt: null,
      ...(actor.role === 'INSTITUTION_USER' && { institutionId: actor.institutionId }),
    },
    include: { institution: true },
  });
  if (!fdr) throw new NotFoundError('FDR');

  // Gate a: document-complete
  const { complete, missing } = await checkDocumentComplete(fdrId);
  if (!complete) {
    throw new UnprocessableError(
      `FDR is not document-complete. Missing or unverified documents: ${missing.join(', ')}.`
    );
  }

  // Gate b: MATURED or premature
  if (fdr.status !== 'MATURED' && !prematureRelease) {
    throw new UnprocessableError(
      `FDR is not MATURED (current status: ${fdr.status}). Set prematureRelease=true with a mandatory reason for early release.`
    );
  }
  if (prematureRelease && (!prematureReason || prematureReason.trim().length === 0)) {
    throw new UnprocessableError('prematureReason is mandatory when prematureRelease=true.');
  }

  // Gate c: no other open release request
  const openRequest = await prisma.releaseRequest.findFirst({
    where: { fdrId, status: { notIn: ['RELEASED'] } },
  });
  if (openRequest) {
    throw new UnprocessableError(`There is already an open release request (status: ${openRequest.status}) for this FDR.`);
  }

  // Gate d: no pending dues
  if (fdr.institution.hasPendingDues) {
    throw new UnprocessableError(
      `Institution has pending dues: ${fdr.institution.pendingDuesNote || 'Please clear dues first.'}`
    );
  }

  const referenceNumber = await generateReferenceNumber();

  const release = await prisma.releaseRequest.create({
    data: {
      fdrId,
      referenceNumber,
      status: 'DRAFT',
      prematureRelease,
      prematureReason,
      createdById: actor.sub,
    },
  });

  await prisma.releaseStep.create({
    data: {
      releaseRequestId: release.id,
      actorId: actor.sub,
      actorRole: actor.role,
      action: 'CREATED',
    },
  });

  // Update FDR status
  await prisma.fdr.update({
    where: { id: fdrId },
    data: { status: 'RELEASE_REQUESTED' },
  });

  await appendAuditLog({
    userId: actor.sub,
    action: 'CREATE',
    entity: 'ReleaseRequest',
    entityId: release.id,
    newValue: { referenceNumber, fdrId, prematureRelease },
    ipAddress,
  });

  return release;
}

export async function submitReleaseRequest(id: string, actor: AccessTokenPayload, ipAddress?: string) {
  const release = await prisma.releaseRequest.findUnique({ where: { id } });
  if (!release) throw new NotFoundError('Release request');
  if (release.status !== 'DRAFT') throw new UnprocessableError(`Cannot submit from status ${release.status}`);

  const updated = await prisma.releaseRequest.update({
    where: { id },
    data: { status: 'SUBMITTED' },
  });

  await prisma.releaseStep.create({
    data: { releaseRequestId: id, actorId: actor.sub, actorRole: actor.role, action: 'SUBMITTED' },
  });

  await notifyReleaseStatusChange(release.fdrId, id, 'SUBMITTED', actor);
  await appendAuditLog({ userId: actor.sub, action: 'UPDATE', entity: 'ReleaseRequest', entityId: id, newValue: { status: 'SUBMITTED' }, ipAddress });

  return updated;
}

export async function verifyReleaseRequest(id: string, remarks: string | undefined, actor: AccessTokenPayload, ipAddress?: string) {
  const release = await prisma.releaseRequest.findUnique({ where: { id }, include: { createdBy: true } });
  if (!release) throw new NotFoundError('Release request');
  if (release.status !== 'SUBMITTED') throw new UnprocessableError(`Cannot verify from status ${release.status}`);

  if (!['VERIFIER', 'SUPER_ADMIN'].includes(actor.role)) {
    throw new ForbiddenError('Only VERIFIER can verify release requests.');
  }

  const updated = await prisma.releaseRequest.update({
    where: { id },
    data: { status: 'VERIFIED' },
  });

  await prisma.releaseStep.create({
    data: { releaseRequestId: id, actorId: actor.sub, actorRole: actor.role, action: 'VERIFIED', remarks },
  });

  await notifyReleaseStatusChange(release.fdrId, id, 'VERIFIED', actor);
  await appendAuditLog({ userId: actor.sub, action: 'VERIFY', entity: 'ReleaseRequest', entityId: id, newValue: { status: 'VERIFIED' }, ipAddress });

  return updated;
}

export async function rejectReleaseRequest(id: string, remarks: string, actor: AccessTokenPayload, ipAddress?: string) {
  const release = await prisma.releaseRequest.findUnique({ where: { id } });
  if (!release) throw new NotFoundError('Release request');
  if (!['SUBMITTED', 'VERIFIED'].includes(release.status)) {
    throw new UnprocessableError(`Cannot reject from status ${release.status}`);
  }
  if (!remarks || remarks.trim().length === 0) {
    throw new UnprocessableError('Rejection remarks are required.');
  }

  const updated = await prisma.releaseRequest.update({
    where: { id },
    data: { status: 'DRAFT' },
  });

  await prisma.releaseStep.create({
    data: { releaseRequestId: id, actorId: actor.sub, actorRole: actor.role, action: 'REJECTED', remarks },
  });

  await prisma.fdr.update({ where: { id: release.fdrId }, data: { status: 'MATURED' } });

  await notifyReleaseStatusChange(release.fdrId, id, 'REJECTED', actor);
  await appendAuditLog({ userId: actor.sub, action: 'REJECT', entity: 'ReleaseRequest', entityId: id, newValue: { status: 'DRAFT', remarks }, ipAddress });

  return updated;
}

export async function approveReleaseRequest(id: string, remarks: string | undefined, actor: AccessTokenPayload, ipAddress?: string) {
  const release = await prisma.releaseRequest.findUnique({
    where: { id },
    include: { steps: true },
  });
  if (!release) throw new NotFoundError('Release request');
  if (release.status !== 'VERIFIED') throw new UnprocessableError(`Cannot approve from status ${release.status}`);

  if (!['APPROVING_AUTHORITY', 'SUPER_ADMIN'].includes(actor.role)) {
    throw new ForbiddenError('Only APPROVING_AUTHORITY can approve release requests.');
  }

  // Maker-checker: verifier cannot approve
  const verifyStep = release.steps.find(s => s.action === 'VERIFIED');
  if (verifyStep && verifyStep.actorId === actor.sub) {
    throw new ForbiddenError('The verifier cannot also approve the same release request (maker-checker rule).');
  }

  const updated = await prisma.releaseRequest.update({
    where: { id },
    data: { status: 'APPROVED' },
  });

  await prisma.releaseStep.create({
    data: { releaseRequestId: id, actorId: actor.sub, actorRole: actor.role, action: 'APPROVED', remarks },
  });

  await notifyReleaseStatusChange(release.fdrId, id, 'APPROVED', actor);
  await appendAuditLog({ userId: actor.sub, action: 'APPROVE', entity: 'ReleaseRequest', entityId: id, newValue: { status: 'APPROVED' }, ipAddress });

  return updated;
}

export async function markReleased(
  id: string,
  data: {
    releaseDate: Date;
    utr: string;
    releasedAmount: bigint;
    deductions?: bigint;
    deductionReason?: string;
  },
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  const release = await prisma.releaseRequest.findUnique({
    where: { id },
    include: {
      fdr: {
        include: {
          institution: true,
          bank: true,
        },
      },
    },
  });
  if (!release) throw new NotFoundError('Release request');
  if (release.status !== 'APPROVED') throw new UnprocessableError(`Cannot mark released from status ${release.status}`);

  // Generate PDF
  const pdfPath = await generateReleasePdf({
    id: release.id,
    referenceNumber: release.referenceNumber,
    fdr: {
      fdrNumber: release.fdr.fdrNumber,
      institution: release.fdr.institution,
      bank: release.fdr.bank,
      principal: release.fdr.principal,
      maturityAmount: release.fdr.maturityAmount,
    },
    releaseDate: data.releaseDate,
    utr: data.utr,
    releasedAmount: data.releasedAmount,
    deductions: data.deductions || BigInt(0),
    deductionReason: data.deductionReason || null,
  });

  const updated = await prisma.releaseRequest.update({
    where: { id },
    data: {
      status: 'RELEASED',
      releaseDate: data.releaseDate,
      utr: data.utr,
      releasedAmount: data.releasedAmount,
      deductions: data.deductions || BigInt(0),
      deductionReason: data.deductionReason,
      pdfPath,
    },
  });

  // Update FDR status
  await prisma.fdr.update({ where: { id: release.fdrId }, data: { status: 'RELEASED' } });

  await prisma.releaseStep.create({
    data: { releaseRequestId: id, actorId: actor.sub, actorRole: actor.role, action: 'RELEASED' },
  });

  await notifyReleaseStatusChange(release.fdrId, id, 'RELEASED', actor);
  await appendAuditLog({ userId: actor.sub, action: 'RELEASE', entity: 'ReleaseRequest', entityId: id, newValue: { status: 'RELEASED', utr: data.utr }, ipAddress });

  return serializeRelease(updated as unknown as Record<string, unknown>);
}

export async function getReleasePdf(id: string, actor: AccessTokenPayload) {
  const release = await prisma.releaseRequest.findFirst({
    where: {
      id,
      ...(actor.role === 'INSTITUTION_USER' && { fdr: { institutionId: actor.institutionId } }),
    },
  });
  if (!release || !release.pdfPath) throw new NotFoundError('Release PDF');
  if (!fs.existsSync(release.pdfPath)) throw new AppError('PDF file not found on server', 404);
  return { filePath: release.pdfPath, referenceNumber: release.referenceNumber };
}

async function notifyReleaseStatusChange(fdrId: string, releaseId: string, status: string, actor: AccessTokenPayload) {
  const fdr = await prisma.fdr.findUnique({
    where: { id: fdrId },
    include: {
      institution: {
        include: { users: { where: { isActive: true, deletedAt: null } } },
      },
    },
  });
  if (!fdr) return;

  const financeOfficers = await prisma.user.findMany({
    where: { role: 'FINANCE_OFFICER', isActive: true, deletedAt: null },
  });

  const recipients = new Set([
    ...financeOfficers.map(u => u.id),
    ...fdr.institution.users.map(u => u.id),
  ]);

  for (const userId of recipients) {
    await createNotification({
      userId,
      title: `Release Request ${status}`,
      body: `Release request for FDR ${fdr.fdrNumber} has been ${status}.`,
      type: 'RELEASE_STATUS',
      entityType: 'RELEASE_REQUEST',
      entityId: releaseId,
    });
  }
}

export async function publicVerifyRelease(referenceNumber: string) {
  const release = await prisma.releaseRequest.findFirst({
    where: { referenceNumber, status: 'RELEASED' },
    include: {
      fdr: {
        select: {
          fdrNumber: true,
          institution: { select: { name: true, aicteId: true } },
          bank: { select: { name: true } },
        },
      },
    },
  });

  if (!release) {
    return {
      valid: false,
      message: 'No released order found with this reference number.',
    };
  }

  return {
    valid: true,
    referenceNumber: release.referenceNumber,
    institution: release.fdr.institution.name,
    aicteId: release.fdr.institution.aicteId,
    fdrNumber: release.fdr.fdrNumber,
    bank: release.fdr.bank.name,
    releaseDate: release.releaseDate,
    status: 'RELEASED',
  };
}

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { prisma } from '../prisma';
import { NotFoundError, ForbiddenError, AppError, UnprocessableError } from '../middleware/errorHandler';
import { appendAuditLog } from '../utils/audit';
import { DocumentType, DocumentVerificationStatus, REQUIRED_DOCUMENT_TYPES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../constants';
import { AccessTokenPayload } from '../utils/crypto';
import { paginationMeta } from '../utils/response';
import { parsePagination } from '../utils/pagination';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads');

export function getUploadDir(institutionId: string): string {
  const dir = path.join(UPLOAD_BASE, institutionId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function detectMimeFromMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  return null;
}

export async function validateFileBuffer(buffer: Buffer, _originalMime: string): Promise<string> {
  const detectedMime = detectMimeFromMagicBytes(buffer);
  if (!detectedMime) {
    throw new UnprocessableError('Could not determine file type or invalid magic bytes. Only PDF, JPG, and PNG are allowed.');
  }
  if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
    throw new UnprocessableError(`File type ${detectedMime} is not allowed. Only PDF, JPG, and PNG are accepted.`);
  }
  return detectedMime;
}

export async function uploadDocument(
  fdrId: string,
  documentType: DocumentType,
  fileBuffer: Buffer,
  originalName: string,
  fileSize: number,
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  // Check FDR exists and access
  const fdr = await prisma.fdr.findFirst({
    where: {
      id: fdrId,
      deletedAt: null,
      ...(actor.role === 'INSTITUTION_USER' && { institutionId: actor.institutionId }),
    },
  });
  if (!fdr) throw new NotFoundError('FDR');

  // Check file size
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new UnprocessableError(`File size exceeds the 5 MB limit.`);
  }

  // Validate MIME by magic bytes
  const verifiedMime = await validateFileBuffer(fileBuffer, '');

  // Determine extension
  const extMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  };
  const ext = extMap[verifiedMime] || 'bin';

  // Safe filename
  const safeFileName = `${uuidv4()}.${ext}`;
  const uploadDir = getUploadDir(fdr.institutionId);
  const filePath = path.join(uploadDir, safeFileName);

  // Prevent path traversal (extra safety)
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(UPLOAD_BASE);
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new ForbiddenError('Invalid file path');
  }

  // Get current version
  const currentVersion = await prisma.document.aggregate({
    where: { fdrId, documentType, deletedAt: null },
    _max: { version: true },
  });
  const newVersion = (currentVersion._max.version || 0) + 1;

  // Write file
  fs.writeFileSync(filePath, fileBuffer);

  const doc = await prisma.document.create({
    data: {
      fdrId,
      documentType,
      fileName: safeFileName,
      originalName: path.basename(originalName).slice(0, 255),
      mimeType: verifiedMime,
      filePath: resolvedPath,
      fileSize,
      version: newVersion,
      uploadedById: actor.sub,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  await appendAuditLog({
    userId: actor.sub,
    action: 'CREATE',
    entity: 'Document',
    entityId: doc.id,
    newValue: { fdrId, documentType, version: newVersion, fileName: safeFileName },
    ipAddress,
  });

  return doc;
}

export async function downloadDocument(documentId: string, actor: AccessTokenPayload) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    include: { fdr: { select: { institutionId: true } } },
  });
  if (!doc) throw new NotFoundError('Document');

  // Institution isolation
  if (actor.role === 'INSTITUTION_USER' && doc.fdr.institutionId !== actor.institutionId) {
    throw new NotFoundError('Document');
  }

  if (!fs.existsSync(doc.filePath)) {
    throw new AppError('File not found on server', 404);
  }

  return { filePath: doc.filePath, mimeType: doc.mimeType, fileName: doc.originalName };
}

export async function listDocuments(fdrId: string, actor: AccessTokenPayload) {
  // Check FDR access
  const fdr = await prisma.fdr.findFirst({
    where: {
      id: fdrId,
      deletedAt: null,
      ...(actor.role === 'INSTITUTION_USER' && { institutionId: actor.institutionId }),
    },
  });
  if (!fdr) throw new NotFoundError('FDR');

  const docs = await prisma.document.findMany({
    where: { fdrId, deletedAt: null },
    include: {
      uploadedBy: { select: { id: true, name: true } },
      verifiedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ documentType: 'asc' }, { version: 'desc' }],
  });

  return docs;
}

export async function verifyDocument(
  documentId: string,
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    include: { fdr: true },
  });
  if (!doc) throw new NotFoundError('Document');

  // Maker-checker: the uploader cannot verify
  if (doc.uploadedById === actor.sub) {
    throw new ForbiddenError('The document uploader cannot verify their own document (maker-checker rule).');
  }

  // Check role
  if (!['VERIFIER', 'SUPER_ADMIN'].includes(actor.role)) {
    throw new ForbiddenError('Only VERIFIER or SUPER_ADMIN can verify documents.');
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      verificationStatus: 'VERIFIED',
      verifiedById: actor.sub,
      verifiedAt: new Date(),
      verificationRemarks: null,
    },
  });

  await appendAuditLog({
    userId: actor.sub,
    action: 'VERIFY',
    entity: 'Document',
    entityId: documentId,
    oldValue: { verificationStatus: doc.verificationStatus },
    newValue: { verificationStatus: 'VERIFIED' },
    ipAddress,
  });

  return updated;
}

export async function rejectDocument(
  documentId: string,
  remarks: string,
  actor: AccessTokenPayload,
  ipAddress?: string
) {
  if (!remarks || remarks.trim().length === 0) {
    throw new UnprocessableError('Rejection remarks are mandatory.');
  }

  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
  });
  if (!doc) throw new NotFoundError('Document');

  // Maker-checker: the uploader cannot reject their own document
  if (doc.uploadedById === actor.sub) {
    throw new ForbiddenError('The document uploader cannot reject their own document.');
  }

  if (!['VERIFIER', 'SUPER_ADMIN'].includes(actor.role)) {
    throw new ForbiddenError('Only VERIFIER or SUPER_ADMIN can reject documents.');
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      verificationStatus: 'REJECTED',
      verifiedById: actor.sub,
      verifiedAt: new Date(),
      verificationRemarks: remarks,
    },
  });

  await appendAuditLog({
    userId: actor.sub,
    action: 'REJECT',
    entity: 'Document',
    entityId: documentId,
    oldValue: { verificationStatus: doc.verificationStatus },
    newValue: { verificationStatus: 'REJECTED', remarks },
    ipAddress,
  });

  return updated;
}

export async function getVerificationQueue(query: Record<string, unknown>) {
  const { skip, take, page, pageSize } = parsePagination(query);

  const where: any = {
    deletedAt: null,
    verificationStatus: 'PENDING',
  };
  if (query.documentType) where.documentType = String(query.documentType);

  const [docs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: {
        fdr: {
          select: {
            id: true,
            fdrNumber: true,
            institution: { select: { id: true, name: true } },
          },
        },
        uploadedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return { documents: docs, meta: paginationMeta(total, page, pageSize) };
}

/**
 * Check if an FDR is document-complete:
 * FDR_SCAN, BANK_CONFIRMATION, and LIEN_LETTER all VERIFIED (latest versions).
 */
export async function checkDocumentComplete(fdrId: string): Promise<{ complete: boolean; missing: string[] }> {
  const missing: string[] = [];

  for (const type of REQUIRED_DOCUMENT_TYPES) {
    const latestDoc = await prisma.document.findFirst({
      where: { fdrId, documentType: type, deletedAt: null },
      orderBy: { version: 'desc' },
    });
    if (!latestDoc || latestDoc.verificationStatus !== 'VERIFIED') {
      missing.push(type);
    }
  }

  return { complete: missing.length === 0, missing };
}

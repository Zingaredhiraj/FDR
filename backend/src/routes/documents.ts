import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as documentService from '../services/document.service';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess, sendCreated } from '../utils/response';
import { DocumentType } from '../constants';
import { uploadRateLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate);

// Multer: use memory storage, validate manually
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 + 1024 }, // slightly over to catch in service
});

const rejectSchema = z.object({
  remarks: z.string().min(1, 'Rejection remarks are required'),
});

/**
 * @swagger
 * /documents/verification-queue:
 *   get:
 *     summary: Get document verification queue
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.get('/verification-queue', authorize('SUPER_ADMIN', 'VERIFIER'), async (req, res, next) => {
  try {
    const result = await documentService.getVerificationQueue(req.query as Record<string, unknown>);
    sendSuccess(res, result.documents, undefined, result.meta);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     summary: Download a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const { filePath, mimeType, fileName } = await documentService.downloadDocument(
      req.params.id,
      req.user!
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /documents/{id}/verify:
 *   patch:
 *     summary: Verify a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/verify', authorize('SUPER_ADMIN', 'VERIFIER'), async (req, res, next) => {
  try {
    const doc = await documentService.verifyDocument(req.params.id as string, req.user!, req.ip);
    sendSuccess(res, doc, 'Document verified successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /documents/{id}/reject:
 *   patch:
 *     summary: Reject a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/reject', authorize('SUPER_ADMIN', 'VERIFIER'), validateBody(rejectSchema), async (req, res, next) => {
  try {
    const doc = await documentService.rejectDocument(req.params.id as string, req.body.remarks, req.user!, req.ip);
    sendSuccess(res, doc, 'Document rejected');
  } catch (err) {
    next(err);
  }
});

// FDR-scoped document routes (mounted at /fdrs/:fdrId/documents via index router)
export const fdrDocumentRouter = Router({ mergeParams: true });
fdrDocumentRouter.use(authenticate);

/**
 * @swagger
 * /fdrs/{fdrId}/documents:
 *   get:
 *     summary: List documents for an FDR
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
fdrDocumentRouter.get('/', async (req, res, next) => {
  try {
    const fdrId = (req.params as Record<string, string>).fdrId;
    const docs = await documentService.listDocuments(fdrId, req.user!);
    sendSuccess(res, docs);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /fdrs/{fdrId}/documents:
 *   post:
 *     summary: Upload a document for an FDR
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
fdrDocumentRouter.post(
  '/',
  uploadRateLimiter,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new Error('No file uploaded');

      const fdrId = (req.params as Record<string, string>).fdrId;
      const documentType = req.body.documentType as string;
      const validType = DocumentType.safeParse(documentType);
      if (!validType.success) {
        return next(new Error('Invalid document type'));
      }

      const doc = await documentService.uploadDocument(
        fdrId,
        validType.data,
        req.file.buffer,
        req.file.originalname,
        req.file.size,
        req.user!,
        req.ip
      );
      sendCreated(res, doc, 'Document uploaded successfully');
    } catch (err) {
      next(err);
    }
  }
);

export default router;

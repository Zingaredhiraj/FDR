import { Router } from 'express';
import { z } from 'zod';
import * as releaseService from '../services/release.service';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess, sendCreated } from '../utils/response';

const router = Router();
router.use(authenticate);

const createReleaseSchema = z.object({
  fdrId: z.string().min(1),
  prematureRelease: z.boolean().default(false),
  prematureReason: z.string().optional(),
});

const markReleasedSchema = z.object({
  releaseDate: z.string().transform(s => new Date(s)),
  utr: z.string().min(1),
  releasedAmount: z.string().regex(/^\d+$/).transform(BigInt),
  deductions: z.string().regex(/^\d+$/).transform(BigInt).optional(),
  deductionReason: z.string().optional(),
});

const verifyRejectSchema = z.object({
  remarks: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const result = await releaseService.listReleases(req.query as Record<string, unknown>, req.user!);
    sendSuccess(res, result.releases, undefined, result.meta);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const release = await releaseService.getReleaseById(req.params.id, req.user!);
    sendSuccess(res, release);
  } catch (err) { next(err); }
});

router.post('/', authorize('SUPER_ADMIN', 'FINANCE_OFFICER'), validateBody(createReleaseSchema), async (req, res, next) => {
  try {
    const release = await releaseService.createReleaseRequest(
      req.body.fdrId, req.body.prematureRelease, req.body.prematureReason, req.user!, req.ip
    );
    sendCreated(res, release, 'Release request created');
  } catch (err) { next(err); }
});

router.patch('/:id/submit', authorize('SUPER_ADMIN', 'FINANCE_OFFICER'), async (req, res, next) => {
  try {
    const release = await releaseService.submitReleaseRequest(req.params.id as string, req.user!, req.ip);
    sendSuccess(res, release, 'Release request submitted');
  } catch (err) { next(err); }
});

router.patch('/:id/verify', authorize('SUPER_ADMIN', 'VERIFIER'), validateBody(verifyRejectSchema), async (req, res, next) => {
  try {
    const release = await releaseService.verifyReleaseRequest(req.params.id as string, req.body.remarks, req.user!, req.ip);
    sendSuccess(res, release, 'Release request verified');
  } catch (err) { next(err); }
});

router.patch('/:id/reject', validateBody(z.object({ remarks: z.string().min(1) })), async (req, res, next) => {
  try {
    const release = await releaseService.rejectReleaseRequest(req.params.id as string, req.body.remarks, req.user!, req.ip);
    sendSuccess(res, release, 'Release request rejected');
  } catch (err) { next(err); }
});

router.patch('/:id/approve', authorize('SUPER_ADMIN', 'APPROVING_AUTHORITY'), validateBody(verifyRejectSchema), async (req, res, next) => {
  try {
    const release = await releaseService.approveReleaseRequest(req.params.id as string, req.body.remarks, req.user!, req.ip);
    sendSuccess(res, release, 'Release request approved');
  } catch (err) { next(err); }
});

router.patch('/:id/mark-released', authorize('SUPER_ADMIN', 'FINANCE_OFFICER'), validateBody(markReleasedSchema), async (req, res, next) => {
  try {
    const release = await releaseService.markReleased(req.params.id as string, req.body, req.user!, req.ip);
    sendSuccess(res, release, 'FDR marked as released');
  } catch (err) { next(err); }
});

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { filePath, referenceNumber } = await releaseService.getReleasePdf(req.params.id as string, req.user!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="release-order-${referenceNumber.replace(/\//g, '-')}.pdf"`);
    res.sendFile(filePath);
  } catch (err) { next(err); }
});

export default router;

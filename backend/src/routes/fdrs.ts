import { Router } from 'express';
import { z } from 'zod';
import * as fdrService from '../services/fdr.service';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess, sendCreated } from '../utils/response';
import { FdrPurpose, InterestType } from '../constants';
import { fdrDocumentRouter } from './documents';
import renewalRouter from './renewals';

const router = Router();
router.use(authenticate);

const createFdrSchema = z.object({
  fdrNumber: z.string().min(1),
  institutionId: z.string().min(1),
  bankId: z.string().min(1),
  branch: z.string().min(1),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
  principal: z.string().regex(/^\d+$/, 'Principal must be a string of digits (paise)').transform(BigInt),
  interestRate: z.number().min(0).max(100),
  interestType: InterestType,
  issueDate: z.string().datetime().or(z.string().date()).transform(s => new Date(s)),
  tenureMonths: z.number().int().min(1).max(360),
  lienMarked: z.boolean().optional(),
  purpose: FdrPurpose,
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-YY'),
  remarks: z.string().optional(),
  parentFdrId: z.string().optional(),
});

const updateFdrSchema = z.object({
  branch: z.string().min(1).optional(),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  lienMarked: z.boolean().optional(),
  remarks: z.string().optional(),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

const calculateSchema = z.object({
  principal: z.string().regex(/^\d+$/).transform(BigInt),
  interestRate: z.number().min(0).max(100),
  interestType: InterestType,
  issueDate: z.string().transform(s => new Date(s)),
  tenureMonths: z.number().int().min(1).max(360),
});

/**
 * @swagger
 * /fdrs/calculate:
 *   post:
 *     summary: Preview maturity calculation
 *     tags: [FDRs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate', validateBody(calculateSchema), async (req, res, next) => {
  try {
    const preview = await fdrService.calculateFdrPreview(
      req.body.principal,
      req.body.interestRate,
      req.body.interestType,
      req.body.issueDate,
      req.body.tenureMonths
    );
    sendSuccess(res, preview);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /fdrs/renewal-due:
 *   get:
 *     summary: Get FDRs due for renewal
 *     tags: [FDRs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/renewal-due', async (req, res, next) => {
  try {
    const fdrs = await fdrService.getRenewalDueList(req.user!);
    sendSuccess(res, fdrs);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await fdrService.listFdrs(req.query as Record<string, unknown>, req.user!);
    sendSuccess(res, result.fdrs, undefined, result.meta);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/chain', async (req, res, next) => {
  try {
    const chain = await fdrService.getFdrChain(req.params.id, req.user!);
    sendSuccess(res, chain);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const fdr = await fdrService.getFdrById(req.params.id, req.user!);
    sendSuccess(res, fdr);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authorize('SUPER_ADMIN', 'FINANCE_OFFICER'),
  validateBody(createFdrSchema),
  async (req, res, next) => {
    try {
      const fdr = await fdrService.createFdr(req.body, req.user!, req.ip);
      sendCreated(res, fdr, 'FDR created successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'FINANCE_OFFICER'),
  validateBody(updateFdrSchema),
  async (req, res, next) => {
    try {
      const fdr = await fdrService.updateFdr(req.params.id as string, req.body, req.user!, req.ip);
      sendSuccess(res, fdr, 'FDR updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:id', authorize('SUPER_ADMIN', 'FINANCE_OFFICER'), async (req, res, next) => {
  try {
    await fdrService.deleteFdr(req.params.id as string, req.user!, req.ip);
    sendSuccess(res, null, 'FDR deleted successfully');
  } catch (err) {
    next(err);
  }
});

router.use('/:fdrId/documents', fdrDocumentRouter);
router.use('/:fdrId/renew', renewalRouter);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess } from '../utils/response';
import { createRenewal } from '../services/renewal.service';
import { InterestType } from '../constants';

const router = Router({ mergeParams: true });
router.use(authenticate);

const renewalSchema = z.object({
  fdrNumber: z.string().min(1),
  bankId: z.string().min(1),
  branch: z.string().min(1),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
  principal: z.string().regex(/^\d+$/).transform(BigInt),
  interestRate: z.number().min(0).max(100),
  interestType: InterestType,
  issueDate: z.string().transform(s => new Date(s)),
  tenureMonths: z.number().int().min(1),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
  lienMarked: z.boolean().optional(),
  remarks: z.string().optional(),
});

router.post(
  '/',
  authorize('SUPER_ADMIN', 'FINANCE_OFFICER'),
  validateBody(renewalSchema),
  async (req, res, next) => {
    try {
      const fdrId = (req.params as Record<string, string>).fdrId;
      const newFdr = await createRenewal(fdrId, req.body, req.user!, req.ip);
      sendSuccess(res, newFdr, 'FDR renewed successfully');
    } catch (err) { next(err); }
  }
);

export default router;

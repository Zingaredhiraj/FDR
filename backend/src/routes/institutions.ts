import { Router } from 'express';
import { z } from 'zod';
import * as institutionService from '../services/institution.service';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess, sendCreated } from '../utils/response';
import { InstitutionApprovalStatus, InstitutionType } from '../constants';

const router = Router();
router.use(authenticate);

const institutionSchema = z.object({
  aicteId: z.string().min(1),
  name: z.string().min(1),
  type: InstitutionType,
  state: z.string().min(1),
  city: z.string().min(1),
  headName: z.string().min(1),
  headEmail: z.string().email(),
  phone: z.string().min(10),
  approvalStatus: InstitutionApprovalStatus.optional(),
});

const pendingDuesSchema = z.object({
  hasPendingDues: z.boolean(),
  pendingDuesNote: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const result = await institutionService.listInstitutions(
      req.query as Record<string, unknown>,
      req.user!
    );
    sendSuccess(res, result.institutions, undefined, result.meta);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const inst = await institutionService.getInstitutionById(req.params.id, req.user!);
    sendSuccess(res, inst);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authorize('SUPER_ADMIN', 'FINANCE_OFFICER'),
  validateBody(institutionSchema),
  async (req, res, next) => {
    try {
      const inst = await institutionService.createInstitution(req.body, req.user!.sub, req.ip);
      sendCreated(res, inst, 'Institution created successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'FINANCE_OFFICER'),
  validateBody(institutionSchema.partial()),
  async (req, res, next) => {
    try {
      const inst = await institutionService.updateInstitution(
        req.params.id as string,
        req.body,
        req.user!.sub,
        req.ip
      );
      sendSuccess(res, inst, 'Institution updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:id', authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await institutionService.deleteInstitution(req.params.id as string, req.user!.sub, req.ip);
    sendSuccess(res, null, 'Institution deleted successfully');
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/pending-dues',
  authorize('SUPER_ADMIN', 'FINANCE_OFFICER'),
  validateBody(pendingDuesSchema),
  async (req, res, next) => {
    try {
      const inst = await institutionService.updatePendingDues(
        req.params.id as string,
        req.body.hasPendingDues,
        req.body.pendingDuesNote,
        req.user!.sub,
        req.ip
      );
      sendSuccess(res, inst, 'Pending dues status updated');
    } catch (err) {
      next(err);
    }
  }
);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import * as bankService from '../services/bank.service';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess, sendCreated } from '../utils/response';

const router = Router();
router.use(authenticate);

const createBankSchema = z.object({
  name: z.string().min(1),
  shortCode: z.string().min(2).max(10),
});

const updateBankSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const banks = await bankService.listBanks(req.query as Record<string, unknown>);
    sendSuccess(res, banks);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const bank = await bankService.getBankById(req.params.id);
    sendSuccess(res, bank);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('SUPER_ADMIN'), validateBody(createBankSchema), async (req, res, next) => {
  try {
    const bank = await bankService.createBank(req.body, req.user!.sub, req.ip);
    sendCreated(res, bank, 'Bank created successfully');
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorize('SUPER_ADMIN'), validateBody(updateBankSchema), async (req, res, next) => {
  try {
    const bank = await bankService.updateBank(req.params.id as string, req.body, req.user!.sub, req.ip);
    sendSuccess(res, bank, 'Bank updated successfully');
  } catch (err) {
    next(err);
  }
});

export default router;

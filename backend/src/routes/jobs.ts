import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess } from '../utils/response';
import { runStatusJob } from '../jobs/statusJob';
import { runAlertJob } from '../jobs/alertJob';

const router = Router();
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

router.post('/status', async (req, res, next) => {
  try {
    const result = await runStatusJob();
    sendSuccess(res, result, `Status job completed: ${result.fdrsUpdated} FDR(s) updated`);
  } catch (err) { next(err); }
});

router.post('/alerts', async (req, res, next) => {
  try {
    const result = await runAlertJob();
    sendSuccess(res, result, `Alert job completed: ${result.alertsCreated} alert(s) created`);
  } catch (err) { next(err); }
});

export default router;

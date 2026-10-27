import { Router } from 'express';
import * as releaseService from '../services/release.service';
import { sendSuccess } from '../utils/response';

const router = Router();

router.get('/verify-release/:ref', async (req, res, next) => {
  try {
    const result = await releaseService.publicVerifyRelease(req.params.ref);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

export default router;

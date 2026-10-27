import { Router } from 'express';
import { z } from 'zod';
import * as notificationService from '../services/notification.service';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess } from '../utils/response';
import { NotificationType } from '../constants';

const router = Router();
router.use(authenticate);

const prefSchema = z.object({
  preferences: z.array(z.object({
    notificationType: NotificationType,
    inApp: z.boolean(),
    email: z.boolean(),
  })),
});

router.get('/', async (req, res, next) => {
  try {
    const result = await notificationService.listNotifications(
      req.user!.sub,
      req.query as Record<string, unknown>
    );
    sendSuccess(res, result.notifications, undefined, result.meta);
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user!.sub);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await notificationService.markRead(req.params.id, req.user!.sub);
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
});

router.get('/preferences', async (req, res, next) => {
  try {
    const prefs = await notificationService.getPreferences(req.user!.sub);
    sendSuccess(res, prefs);
  } catch (err) { next(err); }
});

router.put('/preferences', validateBody(prefSchema), async (req, res, next) => {
  try {
    await notificationService.updatePreferences(req.user!.sub, req.body.preferences);
    sendSuccess(res, null, 'Preferences updated');
  } catch (err) { next(err); }
});

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { prisma } from '../prisma';
import { parsePagination } from '../utils/pagination';
import { paginationMeta } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'AUDITOR'));

router.get('/', async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search || '').trim();
    const entity = req.query.entity ? String(req.query.entity) : undefined;
    const action = req.query.action ? String(req.query.action) : undefined;
    const userId = req.query.userId ? String(req.query.userId) : undefined;

    const where = {
      ...(search && {
        OR: [
          { entity: { contains: search } },
          { entityId: { contains: search } },
          { action: { contains: search } },
        ],
      }),
      ...(entity && { entity }),
      ...(action && { action }),
      ...(userId && { userId }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendSuccess(res, logs, undefined, paginationMeta(total, page, pageSize));
  } catch (err) { next(err); }
});

export default router;

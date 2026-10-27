import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { prisma } from '../prisma';
import { AccessTokenPayload } from '../utils/crypto';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const actor = req.user!;
    const q = String(req.query.q || '').trim();
    const type = String(req.query.type || 'all');

    if (q.length < 2) {
      sendSuccess(res, { institutions: [], fdrs: [], documents: [] });
      return;
    }

    const institutionFilter = actor.role === 'INSTITUTION_USER'
      ? { institutionId: actor.institutionId }
      : {};

    const [institutions, fdrs, documents] = await Promise.all([
      (type === 'all' || type === 'institution') && actor.role !== 'INSTITUTION_USER'
        ? prisma.institution.findMany({
            where: {
              deletedAt: null,
              OR: [
                { name: { contains: q } },
                { aicteId: { contains: q } },
              ],
            },
            select: { id: true, name: true, aicteId: true, state: true, type: true },
            take: 5,
          })
        : [],

      type === 'all' || type === 'fdr'
        ? prisma.fdr.findMany({
            where: {
              deletedAt: null,
              OR: [
                { fdrNumber: { contains: q } },
                { branch: { contains: q } },
              ],
              ...institutionFilter,
            },
            select: {
              id: true,
              fdrNumber: true,
              status: true,
              maturityDate: true,
              institution: { select: { id: true, name: true } },
            },
            take: 5,
          })
        : [],

      type === 'all' || type === 'document'
        ? prisma.document.findMany({
            where: {
              deletedAt: null,
              originalName: { contains: q },
              ...(actor.role === 'INSTITUTION_USER' && { fdr: { institutionId: actor.institutionId } }),
            },
            select: {
              id: true,
              originalName: true,
              documentType: true,
              verificationStatus: true,
              fdr: { select: { id: true, fdrNumber: true } },
            },
            take: 5,
          })
        : [],
    ]);

    sendSuccess(res, { institutions, fdrs, documents });
  } catch (err) { next(err); }
});

export default router;

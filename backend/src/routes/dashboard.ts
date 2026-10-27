import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { prisma } from '../prisma';
import { AccessTokenPayload } from '../utils/crypto';
import { getTodayIST, getCurrentFinancialYearRange } from '../utils/indianDate';

const router = Router();
router.use(authenticate);

async function getKpis(actor: AccessTokenPayload) {
  const today = getTodayIST();
  const { start: fyStart, end: fyEnd } = getCurrentFinancialYearRange();
  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  const institutionFilter = actor.role === 'INSTITUTION_USER'
    ? { institutionId: actor.institutionId }
    : {};

  const [
    totalDepositAgg,
    activeFdrs,
    maturingIn30,
    overdueCount,
    pendingVerifications,
    pendingReleases,
    releasedThisFY,
  ] = await Promise.all([
    prisma.fdr.aggregate({
      where: { deletedAt: null, status: { notIn: ['RELEASED', 'CLOSED', 'ENCASHED'] }, ...institutionFilter },
      _sum: { principal: true },
    }),
    prisma.fdr.count({
      where: { deletedAt: null, status: { in: ['ACTIVE', 'NEAR_MATURITY'] }, ...institutionFilter },
    }),
    prisma.fdr.count({
      where: {
        deletedAt: null,
        status: { in: ['ACTIVE', 'NEAR_MATURITY', 'MATURED'] },
        maturityDate: { gte: today, lte: thirtyDaysOut },
        ...institutionFilter,
      },
    }),
    prisma.fdr.count({
      where: {
        deletedAt: null,
        status: 'MATURED',
        maturityDate: { lt: today },
        ...institutionFilter,
      },
    }),
    prisma.document.count({
      where: {
        deletedAt: null,
        verificationStatus: 'PENDING',
        ...(actor.role === 'INSTITUTION_USER' && { fdr: { institutionId: actor.institutionId } }),
      },
    }),
    prisma.releaseRequest.count({
      where: {
        status: { in: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED'] },
        ...(actor.role === 'INSTITUTION_USER' && { fdr: { institutionId: actor.institutionId } }),
      },
    }),
    prisma.releaseRequest.aggregate({
      where: {
        status: 'RELEASED',
        releaseDate: { gte: fyStart, lte: fyEnd },
        ...(actor.role === 'INSTITUTION_USER' && { fdr: { institutionId: actor.institutionId } }),
      },
      _sum: { releasedAmount: true },
    }),
  ]);

  return {
    totalDepositValue: (totalDepositAgg._sum.principal || BigInt(0)).toString(),
    activeFdrs,
    maturingIn30,
    overdueCount,
    pendingVerifications,
    pendingReleases,
    releasedThisFinancialYear: (releasedThisFY._sum.releasedAmount || BigInt(0)).toString(),
  };
}

router.get('/kpis', async (req, res, next) => {
  try {
    const data = await getKpis(req.user!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/maturity-forecast', async (req, res, next) => {
  try {
    const actor = req.user!;
    const today = getTodayIST();
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};

    // Get 12-month forecast
    const months: Array<{ month: string; count: number; totalAmount: string }> = [];
    for (let i = 0; i < 12; i++) {
      const start = new Date(Date.UTC(today.getFullYear(), today.getMonth() + i, 1));
      const end = new Date(Date.UTC(today.getFullYear(), today.getMonth() + i + 1, 0));

      const [count, agg] = await Promise.all([
        prisma.fdr.count({
          where: { deletedAt: null, maturityDate: { gte: start, lte: end }, ...institutionFilter },
        }),
        prisma.fdr.aggregate({
          where: { deletedAt: null, maturityDate: { gte: start, lte: end }, ...institutionFilter },
          _sum: { maturityAmount: true },
        }),
      ]);

      months.push({
        month: start.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
        count,
        totalAmount: (agg._sum.maturityAmount || BigInt(0)).toString(),
      });
    }

    sendSuccess(res, months);
  } catch (err) { next(err); }
});

router.get('/status-distribution', async (req, res, next) => {
  try {
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};

    const statusCounts = await prisma.fdr.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...institutionFilter },
      _count: { status: true },
      _sum: { principal: true },
    });

    const result = statusCounts.map(s => ({
      status: s.status,
      count: s._count.status,
      totalPrincipal: (s._sum.principal || BigInt(0)).toString(),
    }));

    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/bank-wise', async (req, res, next) => {
  try {
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};

    const bankData = await prisma.fdr.groupBy({
      by: ['bankId'],
      where: { deletedAt: null, status: { notIn: ['RELEASED', 'CLOSED', 'ENCASHED'] }, ...institutionFilter },
      _count: { bankId: true },
      _sum: { principal: true },
    });

    const banks = await prisma.bank.findMany({ select: { id: true, name: true, shortCode: true } });
    const bankMap = new Map(banks.map(b => [b.id, b]));

    const result = bankData.map(d => ({
      bank: bankMap.get(d.bankId),
      count: d._count.bankId,
      totalPrincipal: (d._sum.principal || BigInt(0)).toString(),
    }));

    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/state-wise', async (req, res, next) => {
  try {
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};

    // Group institutions by state
    const stateData = await prisma.institution.groupBy({
      by: ['state'],
      where: { deletedAt: null },
      _count: { state: true },
    });

    sendSuccess(res, stateData.map(d => ({ state: d.state, institutionCount: d._count.state })));
  } catch (err) { next(err); }
});

router.get('/deposit-trend', async (req, res, next) => {
  try {
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};
    const today = getTodayIST();

    const trend: Array<{ month: string; deposited: string; released: string }> = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(Date.UTC(today.getFullYear(), today.getMonth() - i, 1));
      const end = new Date(Date.UTC(today.getFullYear(), today.getMonth() - i + 1, 0));

      const [depositedAgg, releasedAgg] = await Promise.all([
        prisma.fdr.aggregate({
          where: { deletedAt: null, issueDate: { gte: start, lte: end }, ...institutionFilter },
          _sum: { principal: true },
        }),
        prisma.releaseRequest.aggregate({
          where: {
            status: 'RELEASED',
            releaseDate: { gte: start, lte: end },
            ...(actor.role === 'INSTITUTION_USER' && { fdr: { institutionId: actor.institutionId } }),
          },
          _sum: { releasedAmount: true },
        }),
      ]);

      trend.push({
        month: start.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        deposited: (depositedAgg._sum.principal || BigInt(0)).toString(),
        released: (releasedAgg._sum.releasedAmount || BigInt(0)).toString(),
      });
    }

    sendSuccess(res, trend);
  } catch (err) { next(err); }
});

router.get('/recent-activity', async (req, res, next) => {
  try {
    const recent = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    sendSuccess(res, recent);
  } catch (err) { next(err); }
});

router.get('/calendar', async (req, res, next) => {
  try {
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};

    const today = getTodayIST();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 3, 0));

    const fdrs = await prisma.fdr.findMany({
      where: {
        deletedAt: null,
        maturityDate: { gte: start, lte: end },
        ...institutionFilter,
      },
      select: {
        id: true,
        fdrNumber: true,
        maturityDate: true,
        principal: true,
        status: true,
        institution: { select: { id: true, name: true } },
      },
    });

    const calendarData = fdrs.map(fdr => ({
      id: fdr.id,
      fdrNumber: fdr.fdrNumber,
      maturityDate: fdr.maturityDate,
      principal: fdr.principal.toString(),
      status: fdr.status,
      institution: fdr.institution,
      daysToMaturity: diffDays(fdr.maturityDate, today),
    }));

    sendSuccess(res, calendarData);
  } catch (err) { next(err); }
});

function diffDays(a: Date, b: Date): number {
  const aMs = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bMs = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aMs - bMs) / (1000 * 60 * 60 * 24));
}

export default router;

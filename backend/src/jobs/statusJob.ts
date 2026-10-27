import cron from 'node-cron';
import { prisma } from '../prisma';
import { logger } from '../logger';
import { getTodayIST } from '../utils/indianDate';
import { SYSTEM_SETTING_KEYS, DEFAULT_NEAR_MATURITY_DAYS } from '../constants';

export interface StatusJobResult {
  fdrsUpdated: number;
  details: Array<{ id: string; fdrNumber: string; oldStatus: string; newStatus: string }>;
}

export async function runStatusJob(): Promise<StatusJobResult> {
  const today = getTodayIST();
  logger.info({ today: today.toISOString() }, '⚙️ Running status job');

  // Get nearMaturityDays from settings
  const setting = await prisma.systemSetting.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.NEAR_MATURITY_DAYS },
  });
  const nearMaturityDays = parseInt(setting?.value || String(DEFAULT_NEAR_MATURITY_DAYS), 10);

  const nearMaturityThreshold = new Date(today);
  nearMaturityThreshold.setDate(nearMaturityThreshold.getDate() + nearMaturityDays);

  const updates: StatusJobResult['details'] = [];

  // Find ACTIVE/NEAR_MATURITY FDRs to update
  const fdrs = await prisma.fdr.findMany({
    where: {
      deletedAt: null,
      status: { in: ['ACTIVE', 'NEAR_MATURITY'] },
    },
    select: { id: true, fdrNumber: true, status: true, maturityDate: true },
  });

  for (const fdr of fdrs) {
    let newStatus: string | null = null;

    if (fdr.maturityDate <= today) {
      newStatus = 'MATURED';
    } else if (fdr.maturityDate <= nearMaturityThreshold) {
      newStatus = 'NEAR_MATURITY';
    }

    if (newStatus && newStatus !== fdr.status) {
      await prisma.fdr.update({
        where: { id: fdr.id },
        data: { status: newStatus },
      });
      updates.push({
        id: fdr.id,
        fdrNumber: fdr.fdrNumber,
        oldStatus: fdr.status,
        newStatus,
      });
    }
  }

  logger.info({ fdrsUpdated: updates.length }, '✅ Status job complete');
  return { fdrsUpdated: updates.length, details: updates };
}

export function startStatusJob(): void {
  // Run daily at 06:00 IST (00:30 UTC)
  cron.schedule('30 0 * * *', async () => {
    try {
      const result = await runStatusJob();
      logger.info(result, 'Status job completed');
    } catch (err) {
      logger.error(err, 'Status job failed');
    }
  }, { timezone: 'UTC' });

  logger.info('Status job scheduled (daily 06:00 IST)');
}

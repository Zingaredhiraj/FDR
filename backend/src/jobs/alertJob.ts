import cron from 'node-cron';
import { prisma } from '../prisma';
import { logger } from '../logger';
import { getTodayIST, diffDays } from '../utils/indianDate';
import { createNotification } from '../services/notification.service';
import { ALERT_THRESHOLDS, AlertType } from '../constants';

export interface AlertJobResult {
  alertsCreated: number;
  emailsLogged: number;
}

export async function runAlertJob(): Promise<AlertJobResult> {
  const today = getTodayIST();
  logger.info({ today: today.toISOString() }, '⚙️ Running alert job');

  let alertsCreated = 0;
  let emailsLogged = 0;

  // Get all ACTIVE/NEAR_MATURITY/MATURED FDRs
  const fdrs = await prisma.fdr.findMany({
    where: {
      deletedAt: null,
      status: { in: ['ACTIVE', 'NEAR_MATURITY', 'MATURED'] },
    },
    include: {
      institution: {
        include: {
          users: {
            where: { isActive: true, deletedAt: null },
            select: { id: true, role: true },
          },
        },
      },
    },
  });

  const financeOfficers = await prisma.user.findMany({
    where: { role: 'FINANCE_OFFICER', isActive: true, deletedAt: null },
    select: { id: true },
  });

  for (const fdr of fdrs) {
    const daysToMaturity = diffDays(fdr.maturityDate, today);

    // Check if overdue
    const isOverdue = fdr.status === 'MATURED' && daysToMaturity < 0;

    // Determine which alert types to fire
    const alertTypesToFire: AlertType[] = [];

    if (isOverdue) {
      // Every 7 days while overdue
      const overdueDay = Math.abs(daysToMaturity);
      if (overdueDay > 0 && overdueDay % 7 === 0) {
        alertTypesToFire.push('OVERDUE_7');
      }
    } else {
      // Pre-maturity alerts
      for (const [days, alertType] of Object.entries(ALERT_THRESHOLDS)) {
        const daysNum = parseInt(days, 10);
        if (daysToMaturity === daysNum) {
          alertTypesToFire.push(alertType);
        }
      }
    }

    for (const alertType of alertTypesToFire) {
      // Dedupe: check if alert already sent today
      const existingAlert = await prisma.alertLog.findUnique({
        where: {
          fdrId_alertType_targetDate: {
            fdrId: fdr.id,
            alertType,
            targetDate: fdr.maturityDate,
          },
        },
      });

      if (existingAlert) continue; // Already sent, skip (idempotent)

      // Create alert log
      await prisma.alertLog.create({
        data: {
          fdrId: fdr.id,
          alertType,
          targetDate: fdr.maturityDate,
        },
      });

      // Build recipient list
      const recipients = new Set([
        ...financeOfficers.map(u => u.id),
        ...fdr.institution.users
          .filter(u => u.role === 'INSTITUTION_USER')
          .map(u => u.id),
      ]);

      const title = isOverdue
        ? `FDR Overdue Alert: ${fdr.fdrNumber}`
        : `FDR Maturity Alert: ${fdr.fdrNumber}`;

      const body = isOverdue
        ? `FDR ${fdr.fdrNumber} is now ${Math.abs(daysToMaturity)} days overdue (matured on ${fdr.maturityDate.toLocaleDateString('en-IN')}). Please initiate release or renewal immediately.`
        : daysToMaturity === 0
        ? `FDR ${fdr.fdrNumber} matures TODAY. Please initiate renewal or release.`
        : `FDR ${fdr.fdrNumber} matures in ${daysToMaturity} day(s) on ${fdr.maturityDate.toLocaleDateString('en-IN')}.`;

      for (const userId of recipients) {
        await createNotification({
          userId,
          title,
          body,
          type: 'MATURITY_ALERT',
          entityType: 'FDR',
          entityId: fdr.id,
        });
        alertsCreated++;
      }
    }
  }

  // Document pending > 2 days alerts to VERIFIERS
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const pendingDocs = await prisma.document.findMany({
    where: {
      deletedAt: null,
      verificationStatus: 'PENDING',
      createdAt: { lt: twoDaysAgo },
    },
    include: {
      fdr: { select: { fdrNumber: true } },
    },
  });

  if (pendingDocs.length > 0) {
    const verifiers = await prisma.user.findMany({
      where: { role: 'VERIFIER', isActive: true, deletedAt: null },
      select: { id: true },
    });

    for (const verifier of verifiers) {
      await createNotification({
        userId: verifier.id,
        title: `${pendingDocs.length} document(s) pending verification for 2+ days`,
        body: `There are ${pendingDocs.length} document(s) that have been pending verification for more than 2 days. Please review the verification queue.`,
        type: 'DOCUMENT_PENDING',
      });
      alertsCreated++;
    }
  }

  logger.info({ alertsCreated, emailsLogged }, '✅ Alert job complete');
  return { alertsCreated, emailsLogged };
}

export function startAlertJob(): void {
  // Run daily at 07:00 IST (01:30 UTC)
  cron.schedule('30 1 * * *', async () => {
    try {
      const result = await runAlertJob();
      logger.info(result, 'Alert job completed');
    } catch (err) {
      logger.error(err, 'Alert job failed');
    }
  }, { timezone: 'UTC' });

  logger.info('Alert job scheduled (daily 07:00 IST)');
}

import { prisma } from '../prisma';
import { NotificationType } from '../constants';
import { sendEmail } from '../utils/mailer';

interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  // Check user preferences
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_notificationType: { userId: input.userId, notificationType: input.type } },
  });

  const inApp = pref ? pref.inApp : true;
  const emailEnabled = pref ? pref.email : true;

  if (!inApp && !emailEnabled) return;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      emailStatus: emailEnabled ? 'PENDING' : 'SKIPPED',
    },
  });

  if (emailEnabled) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });

    if (user) {
      const { sent } = await sendEmail({
        to: user.email,
        subject: `AICTE FDR Vault: ${input.title}`,
        text: `Dear ${user.name},\n\n${input.body}\n\nThis is an automated notification from AICTE FDR Vault.`,
        html: `<p>Dear ${user.name},</p><p>${input.body}</p><p><em>This is an automated notification from AICTE FDR Vault.</em></p>`,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailStatus: sent ? 'SENT' : 'FAILED' },
      });
    }
  }
}

export async function listNotifications(userId: string, query: Record<string, unknown>) {
  const isRead = query.isRead !== undefined ? query.isRead === 'true' : undefined;
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const pageSize = Math.min(50, parseInt(String(query.pageSize || '20'), 10));

  const where = {
    userId,
    ...(isRead !== undefined && { isRead }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      unreadCount,
    },
  };
}

export async function markRead(id: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function getPreferences(userId: string) {
  const types: NotificationType[] = ['MATURITY_ALERT', 'DOCUMENT_PENDING', 'RELEASE_STATUS', 'SYSTEM'];

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  const prefMap = new Map(prefs.map(p => [p.notificationType, p]));

  return types.map(type => ({
    notificationType: type,
    inApp: prefMap.get(type)?.inApp ?? true,
    email: prefMap.get(type)?.email ?? true,
  }));
}

export async function updatePreferences(
  userId: string,
  preferences: Array<{ notificationType: NotificationType; inApp: boolean; email: boolean }>
): Promise<void> {
  await Promise.all(
    preferences.map(pref =>
      prisma.notificationPreference.upsert({
        where: { userId_notificationType: { userId, notificationType: pref.notificationType } },
        create: { userId, notificationType: pref.notificationType, inApp: pref.inApp, email: pref.email },
        update: { inApp: pref.inApp, email: pref.email },
      })
    )
  );
}

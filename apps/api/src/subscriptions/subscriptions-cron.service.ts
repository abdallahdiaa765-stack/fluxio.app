import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma.service';
import { SubscriptionStatus } from '@fluxio/database';

// How many days before `currentPeriodEnd` the "your subscription is about to
// expire" warning should go out. Kept as a named constant since it's quoted
// directly in the notification copy below - if this ever changes, the
// message text must change with it.
const EXPIRY_WARNING_DAYS = 7;

/**
 * Runs once a day and owns the two state transitions nothing else in the
 * codebase was doing automatically:
 *
 *  1. 7 days before `currentPeriodEnd`, send a single "about to expire"
 *     notification per subscription (guarded by `expiryWarningSentAt` so it
 *     never fires twice for the same billing period).
 *  2. Once `currentPeriodEnd` has actually passed, flip the subscription to
 *     EXPIRED and send a final notification. From that moment on,
 *     SubscriptionGuard (dashboard/API) and the subscription check added to
 *     MenuService.getPublicMenu (public menu/ordering) both read this same
 *     `status` field, so everything - staff accounts and the customer-facing
 *     menu alike - stops together, without any extra wiring here.
 *
 * Superadmin-assigned subscriptions and Vodafone Cash renewals both reset
 * `status` to ACTIVE and clear these two timestamp fields (see
 * SuperAdminService.assignSubscription), so a renewed tenant automatically
 * re-enters this cycle from a clean state.
 */
@Injectable()
export class SubscriptionsCronService {
  private readonly logger = new Logger(SubscriptionsCronService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDailyCheck() {
    await this.sendExpiryWarnings();
    await this.expireOverdueSubscriptions();
  }

  private async sendExpiryWarnings() {
    const now = new Date();
    const warningWindowEnd = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

    const dueForWarning = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        isDeleted: false,
        currentPeriodEnd: { gte: now, lte: warningWindowEnd },
        expiryWarningSentAt: null,
      },
      include: { tenant: true },
    });

    for (const sub of dueForWarning) {
      if (!sub.tenant) continue;

      await this.prisma.notification.create({
        data: {
          tenantId: sub.tenantId,
          title: 'اشتراكك هينتهي قريب',
          body: `اشتراكك في Fluxio هينتهي بعد ${EXPIRY_WARNING_DAYS} أيام. جدد دلوقتي عشان منيوك وطلباتك وحسابات فريقك تفضل شغالة من غير أي توقف. بياناتك محفوظة بالكامل ومش هتتأثر - بس التجديد أهم عشان تفادي إيقاف الخدمة.`,
          channel: 'WHATSAPP',
          data: { type: 'subscription_expiring', daysLeft: EXPIRY_WARNING_DAYS, tenantId: sub.tenantId },
        },
      });

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { expiryWarningSentAt: now },
      });

      this.logger.log(`Sent expiry warning to tenant ${sub.tenantId} (${sub.tenant.name})`);
    }
  }

  private async expireOverdueSubscriptions() {
    const now = new Date();

    const overdue = await this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE] },
        isDeleted: false,
        currentPeriodEnd: { lt: now },
      },
      include: { tenant: true },
    });

    for (const sub of overdue) {
      if (!sub.tenant) continue;

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.EXPIRED, expiredAt: now },
      });

      await this.prisma.notification.create({
        data: {
          tenantId: sub.tenantId,
          title: 'الاشتراك انتهى',
          body: 'اشتراكك في Fluxio انتهى. الخدمة اتوقفت مؤقتًا (المنيو العام، الطلبات، وحسابات الفريق) لحد ما تجدد. بياناتك كلها محفوظة زي ما هي وهترجع تشتغل فورًا بعد التجديد.',
          channel: 'WHATSAPP',
          data: { type: 'subscription_expired', tenantId: sub.tenantId },
        },
      });

      this.logger.warn(`Subscription expired for tenant ${sub.tenantId} (${sub.tenant.name})`);
    }
  }
}

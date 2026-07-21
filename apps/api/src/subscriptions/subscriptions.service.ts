import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@fluxio/database';
import { FeatureFlag, PLAN_FEATURE_FLAGS, planHasFeature } from './feature-flags';

export const PLAN_CONFIGS = {
  [SubscriptionPlan.STARTER]: {
    name: 'Starter',
    nameAr: 'بداية',
    priceMonthly: 999,
    priceYearly: 9990,
    maxBranches: 1,
    maxEmployees: 10,
    maxProducts: null,
    maxOrders: null,
    features: [
      'Dashboard كامل',
      'Menu Management',
      'QR Menu',
      'POS System',
      'Kitchen Display',
      'Waiter Management',
      'Table Management',
      'Cashier System',
      'Inventory Management',
      'Order Management',
      'Basic Reports',
      'Customer Management',
      'Business Settings',
      'Email Support',
    ],
  },
  [SubscriptionPlan.BUSINESS]: {
    name: 'Business',
    nameAr: 'أعمال',
    priceMonthly: 1999,
    priceYearly: 19990,
    maxBranches: 3,
    maxEmployees: 50,
    maxProducts: null,
    maxOrders: null,
    features: [
      'كل مميزات Starter',
      'Advanced Reports',
      'Analytics Dashboard',
      'Offers Management',
      'Coupons',
      'Marketing Center',
      'Employee Permissions',
      'Restaurant Branding',
      'Custom Theme',
      'Priority Support',
      'Performance Analytics',
      'Revenue Reports',
      'Inventory Analytics',
      'Customer Analytics',
    ],
  },
  [SubscriptionPlan.ENTERPRISE]: {
    name: 'Enterprise',
    nameAr: 'مؤسسي',
    priceMonthly: 3999,
    priceYearly: 39990,
    maxBranches: null, // unlimited
    maxEmployees: null, // unlimited
    maxProducts: null,
    maxOrders: null,
    features: [
      'كل مميزات Business',
      'فروع غير محدودة',
      'موظفين غير محدودين',
      'طلبات غير محدودة',
      'منتجات غير محدودة',
      'Multi Branch Management',
      'Enterprise Analytics',
      'API Access',
      'Third-party Integrations',
      'White Label (اختياري)',
      'Dedicated Account Manager',
    ],
  },
};

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const config = PLAN_CONFIGS[subscription.plan];

    const daysUntilExpiry = subscription.currentPeriodEnd
      ? Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...subscription,
      planConfig: config,
      featureFlags: PLAN_FEATURE_FLAGS[subscription.plan],
      isTrial: subscription.status === SubscriptionStatus.TRIAL,
      trialDaysLeft: subscription.trialEndsAt
        ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
      // Days left in the CURRENT paid period (independent of trial), used by
      // the settings-page countdown. Null when there's no end date set yet.
      daysUntilExpiry,
      // Mirrors the 7-day threshold the daily cron job (SubscriptionsCronService)
      // uses to send the "about to expire" notification, so the in-app banner
      // shows up immediately rather than waiting for the next cron run.
      isExpiringSoon:
        subscription.status === SubscriptionStatus.ACTIVE &&
        daysUntilExpiry !== null &&
        daysUntilExpiry >= 0 &&
        daysUntilExpiry <= 7,
    };
  }

  async changePlan(tenantId: string, newPlan: SubscriptionPlan) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const config = PLAN_CONFIGS[newPlan];

    // Check if current usage fits new plan
    if (config.maxBranches !== null) {
      const branchCount = await this.prisma.branch.count({
        where: { tenantId, isDeleted: false },
      });
      if (branchCount > config.maxBranches) {
        throw new BadRequestException(
          `You have ${branchCount} branches. ${newPlan} plan allows only ${config.maxBranches}. Please delete some branches first.`
        );
      }
    }

    if (config.maxEmployees !== null) {
      const employeeCount = await this.prisma.user.count({
        where: {
          tenantId,
          isDeleted: false,
          role: { not: 'CUSTOMER' },
        },
      });
      if (employeeCount > config.maxEmployees) {
        throw new BadRequestException(
          `You have ${employeeCount} employees. ${newPlan} plan allows only ${config.maxEmployees}. Please remove some employees first.`
        );
      }
    }

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        plan: newPlan,
        maxBranches: config.maxBranches ?? 999,
        maxEmployees: config.maxEmployees ?? 999,
        priceMonthly: config.priceMonthly,
        priceYearly: config.priceYearly,
        status: subscription.status === SubscriptionStatus.TRIAL
          ? SubscriptionStatus.TRIAL
          : subscription.status,
      },
    });
  }

  async applyCoupon(tenantId: string, code: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const coupon = await this.prisma.subscriptionCoupon.findFirst({
      where: {
        subscriptionId: subscription.id,
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
    });

    // maxUses/usedCount is a field-to-field comparison, which Prisma's `where`
    // can't express directly - checked here instead of in the query above
    // (the previous version tried `usedCount: { lt: { maxUses } }`, which
    // isn't valid Prisma syntax and threw a ReferenceError on every call).
    if (!coupon || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    // Apply coupon (in production, this would adjust Stripe subscription)
    await this.prisma.subscriptionCoupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return {
      message: 'Coupon applied successfully',
      discount: coupon.discountPercent
        ? `${coupon.discountPercent}%`
        : `${coupon.discountAmount} EGP`,
    };
  }

  async checkFeatureAccess(tenantId: string, feature: FeatureFlag): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) return false;

    // Check if subscription is active or in trial
    if (subscription.status !== SubscriptionStatus.ACTIVE &&
        subscription.status !== SubscriptionStatus.TRIAL) {
      return false;
    }

    return planHasFeature(subscription.plan, feature);
  }

  async enforceLimit(tenantId: string, limitType: 'branches' | 'employees' | 'products' | 'orders') {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription');
    }

    if (subscription.status === SubscriptionStatus.EXPIRED ||
        subscription.status === SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException('Subscription expired. Please renew to continue.');
    }

    const limits = {
      branches: subscription.maxBranches,
      employees: subscription.maxEmployees,
      products: subscription.maxProducts,
      orders: subscription.maxOrders,
    };

    const limit = limits[limitType];
    if (limit === null) return; // Unlimited

    let currentCount = 0;
    switch (limitType) {
      case 'branches':
        currentCount = await this.prisma.branch.count({ where: { tenantId, isDeleted: false } });
        break;
      case 'employees':
        currentCount = await this.prisma.user.count({
          where: { tenantId, isDeleted: false, role: { not: 'CUSTOMER' } },
        });
        break;
      case 'products':
        currentCount = await this.prisma.product.count({ where: { tenantId, isDeleted: false } });
        break;
      case 'orders':
        currentCount = await this.prisma.order.count({ where: { tenantId, isDeleted: false } });
        break;
    }

    if (currentCount >= limit) {
      throw new BadRequestException(
        `${limitType} limit reached (${limit}). Upgrade your plan to add more.`
      );
    }
  }

  async requestVodafoneCashRenewal(tenantId: string, plan: SubscriptionPlan, billingCycle: 'monthly' | 'yearly') {
    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const config = PLAN_CONFIGS[plan];
    const amount = billingCycle === 'yearly' ? config.priceYearly : config.priceMonthly;

    // Recorded as `pending` - a human (super admin) confirms the Vodafone Cash
    // transfer actually arrived and marks it paid; we never auto-activate a
    // plan off an unverified manual payment claim.
    return this.prisma.invoice.create({
      data: {
        subscriptionId: subscription.id,
        amount,
        currency: subscription.currency,
        status: 'pending',
        paymentMethod: 'vodafone_cash',
        dueDate: new Date(),
      },
    });
  }

  async getAllPlans() {
    return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
      plan: key,
      ...config,
      featureFlags: PLAN_FEATURE_FLAGS[key as SubscriptionPlan],
    }));
  }
}

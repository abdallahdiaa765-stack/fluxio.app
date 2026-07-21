import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { SubscriptionStatus } from '@fluxio/database';
import { PLAN_CONFIGS } from '@/subscriptions/subscriptions.service';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [tenantCount, activeTenantCount, userCount, ordersToday, ordersTotal] =
      await Promise.all([
        this.prisma.tenant.count({ where: { isDeleted: false } }),
        this.prisma.tenant.count({ where: { isDeleted: false, isActive: true } }),
        this.prisma.user.count({ where: { isDeleted: false } }),
        this.prisma.order.count({
          where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
        this.prisma.order.count(),
      ]);

    return {
      tenantCount,
      activeTenantCount,
      inactiveTenantCount: tenantCount - activeTenantCount,
      userCount,
      ordersToday,
      ordersTotal,
    };
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        _count: {
          select: { users: true, orders: true, products: true },
        },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      phone: t.phone,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      accentColor: t.accentColor,
      isActive: t.isActive,
      createdAt: t.createdAt,
      plan: t.subscription?.plan ?? null,
      usersCount: t._count.users,
      ordersCount: t._count.orders,
      productsCount: t._count.products,
    }));
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, isDeleted: false },
      include: {
        subscription: true,
        settings: true,
        _count: { select: { users: true, orders: true, products: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Restaurant not found');
    }

    return tenant;
  }

  async updateBranding(
    id: string,
    data: {
      brandName?: string;
      logoUrl?: string;
      faviconUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
    },
  ) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, isDeleted: false } });
    if (!tenant) {
      throw new NotFoundException('Restaurant not found');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.brandName && { name: data.brandName }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
        ...(data.primaryColor && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor && { secondaryColor: data.secondaryColor }),
        ...(data.accentColor && { accentColor: data.accentColor }),
      },
    });

    // Keep RestaurantSetting.brandColors (used by the public menu page) in sync
    // with the Tenant color columns (used by the dashboard) so both surfaces
    // always reflect the same admin-controlled palette.
    await this.prisma.restaurantSetting.upsert({
      where: { tenantId: id },
      update: {
        brandColors: {
          primary: updated.primaryColor,
          secondary: updated.secondaryColor,
          accent: updated.accentColor,
        },
        ...(data.brandName && { brandName: data.brandName }),
        ...(data.logoUrl !== undefined && { brandLogoUrl: data.logoUrl }),
      },
      create: {
        tenantId: id,
        brandName: updated.name,
        brandLogoUrl: updated.logoUrl,
        brandColors: {
          primary: updated.primaryColor,
          secondary: updated.secondaryColor,
          accent: updated.accentColor,
        },
      },
    });

    return updated;
  }

  async updateStatus(id: string, isActive: boolean) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, isDeleted: false } });
    if (!tenant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.tenant.update({ where: { id }, data: { isActive } });
  }

  // The one piece that was missing end-to-end: the super admin activating a
  // package "from their side" for a registered account. This is what should
  // be called after confirming a Vodafone Cash transfer (or any other
  // offline payment) actually arrived - it sets the plan, resets the billing
  // period/expiry, clears the cron's warning/expired markers so the tenant
  // gets a clean 7-day-warning cycle again, and re-activates the tenant in
  // case it had been auto-suspended.
  async assignSubscription(tenantId: string, dto: AssignSubscriptionDto) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, isDeleted: false } });
    if (!tenant) {
      throw new NotFoundException('Restaurant not found');
    }

    const config = PLAN_CONFIGS[dto.plan];
    const durationDays = dto.durationDays ?? (dto.billingCycle === 'yearly' ? 365 : 30);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        plan: dto.plan,
        status: SubscriptionStatus.ACTIVE,
        maxBranches: config.maxBranches ?? 999,
        maxEmployees: config.maxEmployees ?? 999,
        priceMonthly: config.priceMonthly,
        priceYearly: config.priceYearly,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        expiryWarningSentAt: null,
        expiredAt: null,
      },
      create: {
        tenantId,
        plan: dto.plan,
        status: SubscriptionStatus.ACTIVE,
        maxBranches: config.maxBranches ?? 999,
        maxEmployees: config.maxEmployees ?? 999,
        priceMonthly: config.priceMonthly,
        priceYearly: config.priceYearly,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // A subscription can only ever have been suspended *because* it lapsed,
    // so activating a fresh paid period should also lift a `isActive: false`
    // the tenant may have picked up from that - otherwise the public menu
    // would stay dark despite a valid, active subscription underneath it.
    if (!tenant.isActive) {
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { isActive: true } });
    }

    await this.prisma.notification.create({
      data: {
        tenantId,
        title: 'تم تفعيل الاشتراك',
        body: `تم تفعيل باقة ${config.nameAr} لحسابك، والخدمة شغالة تاني بالكامل.`,
        channel: 'WHATSAPP',
        data: { type: 'subscription_activated', plan: dto.plan },
      },
    });

    return subscription;
  }
}

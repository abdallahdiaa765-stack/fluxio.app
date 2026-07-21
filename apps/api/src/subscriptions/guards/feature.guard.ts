import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma.service';
import { FeatureFlag, planHasFeature, minimumPlanFor } from '../feature-flags';
import { REQUIRED_FEATURE } from './require-feature.decorator';

/**
 * Separate from SubscriptionGuard (which only checks "is the subscription
 * active at all"). This one checks "does the CURRENT PLAN include this
 * specific feature" - so a Starter tenant with an otherwise-active
 * subscription still gets blocked from Business/Enterprise-only routes,
 * and upgrading their plan is exactly what unlocks it (no separate
 * per-feature toggle to remember to flip).
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<FeatureFlag>(REQUIRED_FEATURE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredFeature) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true;
    if (user.role === 'SUPER_ADMIN') return true;

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
      select: { plan: true },
    });

    if (!subscription || !planHasFeature(subscription.plan, requiredFeature)) {
      throw new ForbiddenException({
        code: 'FEATURE_LOCKED',
        feature: requiredFeature,
        requiredPlan: minimumPlanFor(requiredFeature),
        message: `This feature requires the ${minimumPlanFor(requiredFeature)} plan or higher.`,
      });
    }

    return true;
  }
}

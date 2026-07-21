import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma.service';
import { SubscriptionStatus } from '@fluxio/database';
import { SKIP_SUBSCRIPTION_CHECK } from './skip-subscription-check.decorator';

/**
 * Runs on every request (registered as a global APP_GUARD). It only actually
 * enforces anything when:
 *  - the route already went through JwtAuthGuard (so req.user exists), AND
 *  - the route isn't marked @SkipSubscriptionCheck() (auth + the
 *    subscriptions module itself must always stay reachable so a tenant can
 *    renew), AND
 *  - the caller isn't SUPER_ADMIN (the control panel must work regardless of
 *    any tenant's billing state).
 * Anyone else on a tenant whose subscription is EXPIRED or SUSPENDED gets a
 * 403 with a machine-readable code the frontend uses to show the renewal
 * screen instead of a generic error.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // no auth on this route - nothing to check
    if (user.role === 'SUPER_ADMIN') return true;

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
      select: { status: true },
    });

    if (
      subscription &&
      (subscription.status === SubscriptionStatus.EXPIRED ||
        subscription.status === SubscriptionStatus.SUSPENDED)
    ) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_INACTIVE',
        message: 'Subscription expired. Please renew to continue.',
      });
    }

    return true;
  }
}

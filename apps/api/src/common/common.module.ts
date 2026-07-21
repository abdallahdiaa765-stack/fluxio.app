import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { SubscriptionGuard } from '@/subscriptions/guards/subscription.guard';
import { FeatureGuard } from '@/subscriptions/guards/feature.guard';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // NOTE: RolesGuard was previously only defined, never registered anywhere
    // (no controller applied it, and it wasn't global) - every @Roles(...) /
    // @RequirePermissions(...) decorator in the codebase was a silent no-op.
    // Registering it globally here makes those checks actually run. It's
    // still safe on routes with no JwtAuthGuard: with no @Roles/@RequirePermissions
    // metadata present it returns true immediately without touching req.user.
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Runs after RolesGuard. Blocks tenant data access once a subscription
    // is EXPIRED/SUSPENDED (see SubscriptionGuard for the exact exemptions).
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
    // Per-feature plan gate - runs after the subscription-active check.
    {
      provide: APP_GUARD,
      useClass: FeatureGuard,
    },
  ],
  exports: [PrismaService],
})
export class CommonModule {}

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';
import { SubscriptionPlan } from '@fluxio/database';
import { SkipSubscriptionCheck } from './guards/skip-subscription-check.decorator';
import { RequireFeature } from './guards/require-feature.decorator';
import { FeatureFlag } from './feature-flags';

class ChangePlanDto {
  plan: SubscriptionPlan;
}

class ApplyCouponDto {
  code: string;
}

class VodafoneCashRequestDto {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
}

// An expired/suspended tenant must still be able to see its own plan and
// renew - so this whole controller is exempt from the global subscription
// guard (see SubscriptionGuard), otherwise renewing would be impossible.
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@SkipSubscriptionCheck()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('current')
  async getCurrent(@CurrentTenant() tenantId: string) {
    return this.subscriptionsService.getCurrentSubscription(tenantId);
  }

  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @Put('change-plan')
  @RequirePermissions(Permission.SUBSCRIPTION_MANAGE)
  async changePlan(@CurrentTenant() tenantId: string, @Body() dto: ChangePlanDto) {
    return this.subscriptionsService.changePlan(tenantId, dto.plan);
  }

  @Post('apply-coupon')
  @RequirePermissions(Permission.SUBSCRIPTION_MANAGE)
  @RequireFeature(FeatureFlag.COUPONS)
  async applyCoupon(@CurrentTenant() tenantId: string, @Body() dto: ApplyCouponDto) {
    return this.subscriptionsService.applyCoupon(tenantId, dto.code);
  }

  @Post('request-vodafone-cash')
  @RequirePermissions(Permission.SUBSCRIPTION_MANAGE)
  async requestVodafoneCash(@CurrentTenant() tenantId: string, @Body() dto: VodafoneCashRequestDto) {
    return this.subscriptionsService.requestVodafoneCashRenewal(tenantId, dto.plan, dto.billingCycle);
  }
}

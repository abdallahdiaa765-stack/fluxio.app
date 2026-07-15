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

class ChangePlanDto {
  plan: SubscriptionPlan;
}

class ApplyCouponDto {
  code: string;
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
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
  async applyCoupon(@CurrentTenant() tenantId: string, @Body() dto: ApplyCouponDto) {
    return this.subscriptionsService.applyCoupon(tenantId, dto.code);
  }
}

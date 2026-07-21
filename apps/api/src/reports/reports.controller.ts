import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/subscriptions/guards/require-feature.decorator';
import { FeatureFlag } from '@/subscriptions/feature-flags';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // Basic sales numbers stay available on every plan (Starter includes
  // "Basic Reports"); only the deeper breakdowns are gated below.
  @Get('sales')
  @RequirePermissions(Permission.REPORTS_VIEW)
  async getSalesReport(
    @CurrentTenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getSalesReport(tenantId, {
      fromDate: new Date(from),
      toDate: new Date(to),
      branchId,
    });
  }

  @Get('revenue')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @RequireFeature(FeatureFlag.ADVANCED_REPORTS)
  async getRevenueReport(
    @CurrentTenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getRevenueReport(tenantId, {
      fromDate: new Date(from),
      toDate: new Date(to),
    });
  }

  @Get('employees')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @RequireFeature(FeatureFlag.ADVANCED_REPORTS)
  async getEmployeePerformance(
    @CurrentTenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getEmployeePerformance(tenantId, {
      fromDate: new Date(from),
      toDate: new Date(to),
    });
  }
}

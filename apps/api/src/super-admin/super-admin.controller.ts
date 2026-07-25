import { Body, Controller, Get, Param, Patch, UseGuards, ForbiddenException } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  private checkSuperAdmin(user: any) {
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin access required');
  }

  @Get('overview')
  getOverview(@CurrentUser() user: any) {
    this.checkSuperAdmin(user);
    return this.superAdminService.getOverview();
  }

  @Get('tenants')
  listTenants(@CurrentUser() user: any) {
    this.checkSuperAdmin(user);
    return this.superAdminService.listTenants();
  }

  @Get('tenants/:id')
  getTenant(@CurrentUser() user: any, @Param('id') id: string) {
    this.checkSuperAdmin(user);
    return this.superAdminService.getTenant(id);
  }

  @Patch('tenants/:id/branding')
  updateBranding(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateBrandingDto) {
    this.checkSuperAdmin(user);
    return this.superAdminService.updateBranding(id, dto);
  }

  @Patch('tenants/:id/status')
  updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    this.checkSuperAdmin(user);
    return this.superAdminService.updateStatus(id, dto.isActive);
  }

  @Patch('tenants/:id/subscription')
  assignSubscription(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AssignSubscriptionDto) {
    this.checkSuperAdmin(user);
    return this.superAdminService.assignSubscription(id, dto);
  }
}

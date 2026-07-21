import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@/auth/guards/roles.guard';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';

// Every route here is gated behind BOTH a valid JWT and the SUPER_ADMIN role.
// This is the only place in the API that can see or edit data across
// tenants - regular tenant users (including RESTAURANT_OWNER) get a 403.
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Get('overview')
  getOverview() {
    return this.superAdminService.getOverview();
  }

  @Get('tenants')
  listTenants() {
    return this.superAdminService.listTenants();
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.superAdminService.getTenant(id);
  }

  @Patch('tenants/:id/branding')
  updateBranding(@Param('id') id: string, @Body() dto: UpdateBrandingDto) {
    return this.superAdminService.updateBranding(id, dto);
  }

  @Patch('tenants/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.superAdminService.updateStatus(id, dto.isActive);
  }

  // Activates/changes a tenant's package "from the super admin's side" -
  // e.g. after manually confirming a Vodafone Cash payment arrived.
  @Patch('tenants/:id/subscription')
  assignSubscription(@Param('id') id: string, @Body() dto: AssignSubscriptionDto) {
    return this.superAdminService.assignSubscription(id, dto);
  }
}

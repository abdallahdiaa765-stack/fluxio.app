import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/common/prisma.service';

class UpdateSettingsDto {
  brandName?: string;
  brandLogoUrl?: string;
  brandColors?: { primary?: string; secondary?: string; accent?: string };
  taxRate?: number;
  taxNumber?: string;
  currency?: string;
  enableTips?: boolean;
  enableDelivery?: boolean;
  enableReservations?: boolean;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptShowTax?: boolean;
}

class CreateBranchDto {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
  latitude?: number;
  longitude?: number;
}

class UpdateBranchDto {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
  isActive?: boolean;
}

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private tenantsService: TenantsService,
    private prisma: PrismaService,
  ) {}

  @Get('me')
  async getMyTenant(@CurrentTenant() tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    return this.tenantsService.findBySlug(tenant.slug);
  }

  @Put('settings')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async updateSettings(@CurrentTenant() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.tenantsService.updateSettings(tenantId, dto);
  }

  @Post('branches')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async createBranch(@CurrentTenant() tenantId: string, @Body() dto: CreateBranchDto) {
    return this.tenantsService.createBranch(tenantId, dto);
  }

  @Put('branches/:id')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async updateBranch(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.tenantsService.updateBranch(tenantId, id, dto);
  }

  @Delete('branches/:id')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async deleteBranch(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tenantsService.deleteBranch(tenantId, id);
  }
}

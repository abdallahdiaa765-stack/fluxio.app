import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';
import { CampaignType } from '@fluxio/database';

class CreateCampaignDto {
  name: string;
  type: CampaignType;
  discountPercent?: number;
  discountAmount?: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  startDate: string;
  endDate?: string;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  bannerUrl?: string;
  bannerText?: string;
}

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions(Permission.MENU_VIEW)
  async getCampaigns(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: CampaignType,
  ) {
    return this.campaignsService.getCampaigns(tenantId, { type });
  }

  @Post()
  @RequirePermissions(Permission.MENU_CREATE)
  async createCampaign(@CurrentTenant() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(tenantId, {
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Put(':id')
  @RequirePermissions(Permission.MENU_UPDATE)
  async updateCampaign(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCampaignDto>,
  ) {
    return this.campaignsService.updateCampaign(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.MENU_DELETE)
  async deleteCampaign(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.campaignsService.deleteCampaign(tenantId, id);
  }

  @Post('validate-coupon')
  async validateCoupon(
    @CurrentTenant() tenantId: string,
    @Body('code') code: string,
    @Body('orderAmount') orderAmount: number,
  ) {
    return this.campaignsService.validateCoupon(tenantId, code, orderAmount);
  }
}

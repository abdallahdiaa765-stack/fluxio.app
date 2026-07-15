import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant, CurrentUser } from '@/common/decorators/current-user.decorator';
import { InventoryMovementType } from '@fluxio/database';

class CreateItemDto {
  name: string;
  nameAr?: string;
  sku?: string;
  description?: string;
  unitOfMeasure: string;
  currentStock?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  unitCost?: number;
  supplierId?: string;
  branchId?: string;
}

class RecordMovementDto {
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  orderId?: string;
  reference?: string;
  notes?: string;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions(Permission.INVENTORY_VIEW)
  async getItems(
    @CurrentTenant() tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.inventoryService.getItems(tenantId, branchId);
  }

  @Get('low-stock')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  async getLowStock(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getLowStockItems(tenantId);
  }

  @Get('report')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  async getStockReport(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getStockReport(tenantId);
  }

  @Post()
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  async createItem(@CurrentTenant() tenantId: string, @Body() dto: CreateItemDto) {
    return this.inventoryService.createItem(tenantId, dto);
  }

  @Post('movements')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  async recordMovement(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: RecordMovementDto,
  ) {
    return this.inventoryService.recordMovement(tenantId, {
      ...dto,
      createdBy: user.userId,
    });
  }

  @Get('movements')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  async getMovements(
    @CurrentTenant() tenantId: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getMovements(tenantId, itemId);
  }
}

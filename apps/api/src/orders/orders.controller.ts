import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant, CurrentUser } from '@/common/decorators/current-user.decorator';
import { OrderStatus, OrderType, PaymentMethod } from '@fluxio/database';

class CreateOrderDto {
  type: OrderType;
  branchId?: string;
  tableId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  waiterId?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    extras?: { name: string; price: number }[];
    notes?: string;
  }[];
  customerNote?: string;
  internalNote?: string;
}

class UpdateStatusDto {
  status: OrderStatus;
  cancelReason?: string;
}

class AddPaymentDto {
  method: PaymentMethod;
  amount: number;
  tipAmount?: number;
  isSplit?: boolean;
  splitIndex?: number;
  reference?: string;
}

class ProcessReturnDto {
  items: { orderItemId: string; quantity: number }[];
  reason: string;
  refundAmount: number;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @RequirePermissions(Permission.ORDERS_CREATE)
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(tenantId, {
      ...dto,
      createdById: user.userId,
    });
  }

  @Get()
  @RequirePermissions(Permission.ORDERS_VIEW)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: OrderStatus,
    @Query('type') type?: OrderType,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ordersService.findAll(tenantId, {
      status,
      type,
      branchId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('kitchen')
  @RequirePermissions(Permission.ORDERS_VIEW)
  async getKitchenOrders(@CurrentTenant() tenantId: string) {
    return this.ordersService.getKitchenOrders(tenantId);
  }

  @Get('daily-report')
  @RequirePermissions(Permission.REPORTS_VIEW)
  async getDailyReport(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
  ) {
    const reportDate = date ? new Date(date) : new Date();
    return this.ordersService.getDailyReport(tenantId, reportDate);
  }

  @Get(':id')
  @RequirePermissions(Permission.ORDERS_VIEW)
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findOne(tenantId, id);
  }

  @Put(':id/status')
  @RequirePermissions(Permission.ORDERS_UPDATE)
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.ordersService.updateStatus(tenantId, id, dto.status, user.userId, dto.cancelReason);
  }

  @Post(':id/payments')
  @RequirePermissions(Permission.ORDERS_UPDATE)
  async addPayment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.ordersService.addPayment(tenantId, id, dto);
  }

  @Post(':id/returns')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  async processReturn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ProcessReturnDto,
  ) {
    return this.ordersService.processReturn(tenantId, id, dto, user.userId);
  }
}

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
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';
import { ReservationStatus } from '@fluxio/database';

class CreateTableDto {
  number: string;
  capacity: number;
  branchId?: string;
  posX?: number;
  posY?: number;
  shape?: string;
}

class CreateReservationDto {
  tableId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  date: string;
  time: string;
  notes?: string;
}

@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get()
  @RequirePermissions(Permission.TABLES_VIEW)
  async getTables(
    @CurrentTenant() tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.tablesService.getTables(tenantId, branchId);
  }

  @Post()
  @RequirePermissions(Permission.TABLES_MANAGE)
  async createTable(@CurrentTenant() tenantId: string, @Body() dto: CreateTableDto) {
    return this.tablesService.createTable(tenantId, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.TABLES_MANAGE)
  async updateTable(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTableDto>,
  ) {
    return this.tablesService.updateTable(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.TABLES_MANAGE)
  async deleteTable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tablesService.deleteTable(tenantId, id);
  }

  // Reservations
  @Get('reservations')
  @RequirePermissions(Permission.TABLES_VIEW)
  async getReservations(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
    @Query('status') status?: ReservationStatus,
  ) {
    return this.tablesService.getReservations(tenantId, {
      date: date ? new Date(date) : undefined,
      status,
    });
  }

  @Post('reservations')
  @RequirePermissions(Permission.TABLES_MANAGE)
  async createReservation(@CurrentTenant() tenantId: string, @Body() dto: CreateReservationDto) {
    return this.tablesService.createReservation(tenantId, {
      ...dto,
      date: new Date(dto.date),
    });
  }

  @Put('reservations/:id/status')
  @RequirePermissions(Permission.TABLES_MANAGE)
  async updateReservationStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: ReservationStatus,
  ) {
    return this.tablesService.updateReservationStatus(tenantId, id, status);
  }
}

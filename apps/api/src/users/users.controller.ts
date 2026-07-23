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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@fluxio/database';

class CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  customPermissions?: string[];
}

class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
  customPermissions?: string[];
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USERS_VIEW)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll(tenantId, {
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_VIEW)
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permission.USERS_CREATE)
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(tenantId, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.USERS_UPDATE)
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USERS_DELETE)
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.usersService.remove(tenantId, id);
  }

  @Post(':id/reset-password')
  @RequirePermissions(Permission.USERS_UPDATE)
  async resetPassword(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.usersService.resetPassword(tenantId, id);
  }
}

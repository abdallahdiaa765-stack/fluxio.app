import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';
import { SkipSubscriptionCheck } from '@/subscriptions/guards/skip-subscription-check.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@SkipSubscriptionCheck()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query('limit') limit?: string) {
    return this.notificationsService.list(tenantId, limit ? Number(limit) : undefined);
  }

  @Get('unread-count')
  unreadCount(@CurrentTenant() tenantId: string) {
    return this.notificationsService.unreadCount(tenantId);
  }

  @Patch(':id/read')
  markRead(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(tenantId, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentTenant() tenantId: string) {
    return this.notificationsService.markAllRead(tenantId);
  }
}

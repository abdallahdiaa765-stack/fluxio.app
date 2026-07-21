import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(tenantId: string) {
    return this.prisma.notification.count({ where: { tenantId, isRead: false } });
  }

  async markRead(tenantId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, tenantId } });
    if (!notification) {
      // Don't leak whether the id exists for another tenant - just refuse.
      throw new ForbiddenException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }
}

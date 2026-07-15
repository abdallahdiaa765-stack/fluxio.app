import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async getLogs(tenantId: string, options?: {
    action?: string;
    entityType?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(options?.action && { action: { contains: options.action } }),
        ...(options?.entityType && { entityType: options.entityType }),
        ...(options?.userId && { userId: options.userId }),
        ...(options?.fromDate && { createdAt: { gte: options.fromDate } }),
        ...(options?.toDate && { createdAt: { lte: options.toDate } }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async getLogStats(tenantId: string) {
    const [total, today, byAction] = await Promise.all([
      this.prisma.auditLog.count({ where: { tenantId } }),
      this.prisma.auditLog.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { tenantId },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
    ]);

    return { total, today, topActions: byAction };
  }
}

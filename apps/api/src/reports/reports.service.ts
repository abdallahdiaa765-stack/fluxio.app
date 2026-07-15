import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { OrderStatus, PaymentStatus } from '@fluxio/database';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(tenantId: string, options: {
    fromDate: Date;
    toDate: Date;
    branchId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        isDeleted: false,
        status: { in: [OrderStatus.DELIVERED, OrderStatus.READY] },
        createdAt: { gte: options.fromDate, lte: options.toDate },
        ...(options.branchId && { branchId: options.branchId }),
      },
      include: {
        items: true,
        payments: true,
      },
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Top products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.totalPrice);
        } else {
          productSales.set(item.productId, {
            name: item.name,
            quantity: item.quantity,
            revenue: Number(item.totalPrice),
          });
        }
      }
    }

    const topProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      period: {
        from: options.fromDate.toISOString(),
        to: options.toDate.toISOString(),
      },
      summary: {
        totalSales,
        totalOrders,
        avgOrderValue,
      },
      topProducts,
    };
  }

  async getRevenueReport(tenantId: string, options: {
    fromDate: Date;
    toDate: Date;
  }) {
    const [orders, payments, expenses] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          tenantId,
          isDeleted: false,
          createdAt: { gte: options.fromDate, lte: options.toDate },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          order: { tenantId },
          status: PaymentStatus.PAID,
          createdAt: { gte: options.fromDate, lte: options.toDate },
        },
      }),
      this.prisma.inventoryMovement.findMany({
        where: {
          item: { tenantId },
          type: 'IN',
          createdAt: { gte: options.fromDate, lte: options.toDate },
        },
      }),
    ]);

    const revenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const refunds = payments
      .filter(p => Number(p.amount) < 0)
      .reduce((sum, p) => sum + Math.abs(Number(p.amount)), 0);
    const costOfGoods = expenses.reduce((sum, e) => sum + Number(e.totalCost || 0), 0);
    const netRevenue = revenue - refunds;
    const grossProfit = netRevenue - costOfGoods;

    return {
      revenue,
      refunds,
      netRevenue,
      costOfGoods,
      grossProfit,
      grossMargin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
    };
  }

  async getEmployeePerformance(tenantId: string, options: {
    fromDate: Date;
    toDate: Date;
  }) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        isDeleted: false,
        createdAt: { gte: options.fromDate, lte: options.toDate },
        status: OrderStatus.DELIVERED,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    const employeeStats = new Map<string, {
      name: string;
      role: string;
      orders: number;
      revenue: number;
    }>();

    for (const order of orders) {
      const userId = order.createdById;
      const existing = employeeStats.get(userId);
      if (existing) {
        existing.orders += 1;
        existing.revenue += Number(order.totalAmount);
      } else {
        employeeStats.set(userId, {
          name: `${order.createdBy.firstName} ${order.createdBy.lastName}`,
          role: order.createdBy.role,
          orders: 1,
          revenue: Number(order.totalAmount),
        });
      }
    }

    return Array.from(employeeStats.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }
}

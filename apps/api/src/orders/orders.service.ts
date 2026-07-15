import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@fluxio/database';

// Valid state transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.order.count({ where: { tenantId } });
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }

  private validateTransition(current: OrderStatus, next: OrderStatus): void {
    const validNext = VALID_TRANSITIONS[current];
    if (!validNext.includes(next)) {
      throw new BadRequestException(
        `Invalid transition from ${current} to ${next}. Valid transitions: ${validNext.join(', ')}`
      );
    }
  }

  async create(tenantId: string, data: {
    type: OrderType;
    branchId?: string;
    tableId?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    waiterId?: string;
    createdById: string;
    items: {
      productId: string;
      variantId?: string;
      quantity: number;
      extras?: { name: string; price: number }[];
      notes?: string;
    }[];
    customerNote?: string;
    internalNote?: string;
  }) {
    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of data.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
        include: { variants: true },
      });

      if (!product || !product.isAvailable) {
        throw new BadRequestException(`Product ${item.productId} not found or unavailable`);
      }

      let unitPrice = Number(product.basePrice);

      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (variant) {
          unitPrice += Number(variant.priceAdjustment);
        }
      }

      const extrasTotal = item.extras?.reduce((sum, e) => sum + Number(e.price), 0) || 0;
      const itemTotal = (unitPrice + extrasTotal) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
        extras: item.extras,
        notes: item.notes,
      });
    }

    // Get tax rate from settings
    const settings = await this.prisma.restaurantSetting.findUnique({
      where: { tenantId },
    });
    const taxRate = Number(settings?.taxRate || 14);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const orderNumber = await this.generateOrderNumber(tenantId);

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        type: data.type,
        branchId: data.branchId,
        tableId: data.tableId,
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        waiterId: data.waiterId,
        createdById: data.createdById,
        subtotal,
        taxAmount,
        totalAmount,
        customerNote: data.customerNote,
        internalNote: data.internalNote,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        table: true,
      },
    });

    // Update table status if dine-in
    if (data.tableId) {
      await this.prisma.table.update({
        where: { id: data.tableId },
        data: { status: 'occupied' },
      });
    }

    return order;
  }

  async findAll(tenantId: string, options?: {
    status?: OrderStatus;
    type?: OrderType;
    branchId?: string;
    tableId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(options?.status && { status: options.status }),
        ...(options?.type && { type: options.type }),
        ...(options?.branchId && { branchId: options.branchId }),
        ...(options?.tableId && { tableId: options.tableId }),
        ...(options?.fromDate && { createdAt: { gte: options.fromDate } }),
        ...(options?.toDate && { createdAt: { lte: options.toDate } }),
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        table: { select: { id: true, number: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        items: { include: { product: true } },
        table: true,
        customer: true,
        waiter: true,
        payments: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: OrderStatus,
    userId: string,
    cancelReason?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
    });

    if (!order) throw new NotFoundException('Order not found');

    this.validateTransition(order.status, newStatus);

    const updateData: any = { status: newStatus };

    // Set timestamps based on status
    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        updateData.confirmedAt = new Date();
        break;
      case OrderStatus.PREPARING:
        updateData.preparingAt = new Date();
        break;
      case OrderStatus.READY:
        updateData.readyAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        updateData.deliveredAt = new Date();
        break;
      case OrderStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = userId;
        updateData.cancelReason = cancelReason;
        // Free table
        if (order.tableId) {
          await this.prisma.table.update({
            where: { id: order.tableId },
            data: { status: 'available' },
          });
        }
        break;
    }

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        table: true,
      },
    });
  }

  async addPayment(tenantId: string, orderId: string, data: {
    method: PaymentMethod;
    amount: number;
    tipAmount?: number;
    isSplit?: boolean;
    splitIndex?: number;
    reference?: string;
  }) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const totalPaid = order.payments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remaining = Number(order.totalAmount) - totalPaid;

    if (data.amount > remaining) {
      throw new BadRequestException(`Amount exceeds remaining balance: ${remaining}`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        method: data.method,
        amount: data.amount,
        tipAmount: data.tipAmount || 0,
        isSplit: data.isSplit || false,
        splitIndex: data.splitIndex,
        reference: data.reference,
        status: PaymentStatus.PAID,
      },
    });

    // Check if fully paid
    const newTotalPaid = totalPaid + data.amount;
    if (newTotalPaid >= Number(order.totalAmount)) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
      });
    }

    return payment;
  }

  async processReturn(tenantId: string, orderId: string, data: {
    items: { orderItemId: string; quantity: number }[];
    reason: string;
    refundAmount: number;
  }, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, status: OrderStatus.DELIVERED },
    });

    if (!order) {
      throw new BadRequestException('Order not found or not delivered');
    }

    // Create refund payment
    await this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.CASH,
        amount: -data.refundAmount,
        status: PaymentStatus.REFUNDED,
        reference: `RETURN: ${data.reason}`,
      },
    });

    // Update order status
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.RETURNED,
        totalAmount: { decrement: data.refundAmount },
      },
    });
  }

  async getKitchenOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] },
        isDeleted: false,
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, nameAr: true } },
          },
        },
        table: { select: { number: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDailyReport(tenantId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [orders, payments] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          tenantId,
          createdAt: { gte: startOfDay, lte: endOfDay },
          isDeleted: false,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          order: { tenantId },
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: PaymentStatus.PAID,
        },
      }),
    ]);

    const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const byPaymentMethod = payments.reduce((acc, p) => {
      const method = p.method;
      acc[method] = (acc[method] || 0) + Number(p.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalSales,
      totalOrders,
      avgOrderValue,
      byPaymentMethod,
      ordersByStatus: orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

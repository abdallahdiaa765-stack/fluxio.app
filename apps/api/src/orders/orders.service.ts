import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@fluxio/database';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.order.count({ where: { tenantId } });
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }

  private validateTransition(current: string, next: string): void {
    const validNext = VALID_TRANSITIONS[current] || [];
    if (!validNext.includes(next)) {
      throw new BadRequestException(`Invalid transition from ${current} to ${next}`);
    }
  }

  async create(tenantId: string, data: any) {
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
        const variant = (product.variants as any[]).find((v: any) => v.id === item.variantId);
        if (variant) unitPrice += Number(variant.priceAdjustment);
      }

      const extrasTotal = item.extras?.reduce((sum: number, e: any) => sum + Number(e.price), 0) || 0;
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

    const settings = await this.prisma.restaurantSetting.findUnique({ where: { tenantId } });
    const taxRate = Number((settings as any)?.taxRate || 14);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    const orderNumber = await this.generateOrderNumber(tenantId);

    const order = await this.prisma.order.create({
      data: {
        tenantId, orderNumber, type: data.type, branchId: data.branchId,
        tableId: data.tableId, customerId: data.customerId, customerName: data.customerName,
        customerPhone: data.customerPhone, customerEmail: data.customerEmail,
        waiterId: data.waiterId, createdById: data.createdById,
        subtotal, taxAmount, totalAmount,
        customerNote: data.customerNote, internalNote: data.internalNote,
        items: { create: orderItems },
      },
      include: { items: true, table: true },
    });

    if (data.tableId) {
      await this.prisma.table.update({ where: { id: data.tableId }, data: { status: 'occupied' } });
    }

    return order;
  }

  async findAll(tenantId: string, options?: any) {
    return this.prisma.order.findMany({
      where: {
        tenantId, isDeleted: false,
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
        table: true, customer: true, waiter: true, payments: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(tenantId: string, id: string, newStatus: OrderStatus, userId: string, cancelReason?: string) {
    const order = await this.prisma.order.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    this.validateTransition(order.status, newStatus);

    const updateData: any = { status: newStatus };
    switch (newStatus) {
      case OrderStatus.CONFIRMED: updateData.confirmedAt = new Date(); break;
      case OrderStatus.PREPARING: updateData.preparingAt = new Date(); break;
      case OrderStatus.READY: updateData.readyAt = new Date(); break;
      case OrderStatus.DELIVERED: updateData.deliveredAt = new Date(); break;
      case OrderStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = userId;
        updateData.cancelReason = cancelReason;
        if (order.tableId) {
          await this.prisma.table.update({ where: { id: order.tableId }, data: { status: 'available' } });
        }
        break;
    }

    return this.prisma.order.update({ where: { id }, data: updateData, include: { items: true, table: true } });
  }

  async addPayment(tenantId: string, orderId: string, data: any) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId }, include: { payments: true } });
    if (!order) throw new NotFoundException('Order not found');

    const totalPaid = order.payments.filter((p: any) => p.status === PaymentStatus.PAID).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const remaining = Number(order.totalAmount) - totalPaid;
    if (data.amount > remaining) throw new BadRequestException(`Amount exceeds remaining balance: ${remaining}`);

    const payment = await this.prisma.payment.create({
      data: { orderId, method: data.method, amount: data.amount, tipAmount: data.tipAmount || 0, isSplit: data.isSplit || false, splitIndex: data.splitIndex, reference: data.reference, status: PaymentStatus.PAID },
    });

    const newTotalPaid = totalPaid + data.amount;
    if (newTotalPaid >= Number(order.totalAmount)) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() } });
    }

    return payment;
  }

  async processReturn(tenantId: string, orderId: string, data: any, _userId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId, status: OrderStatus.DELIVERED } });
    if (!order) throw new BadRequestException('Order not found or not delivered');

    await this.prisma.payment.create({
      data: { orderId, method: PaymentMethod.CASH, amount: -data.refundAmount, status: PaymentStatus.REFUNDED, reference: `RETURN: ${data.reason}` },
    });

    return this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.RETURNED, totalAmount: { decrement: data.refundAmount } } });
  }

  async getKitchenOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId, status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] }, isDeleted: false },
      include: { items: { include: { product: { select: { id: true, name: true, nameAr: true } } } }, table: { select: { number: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDailyReport(tenantId: string, date: Date) {
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const [orders, payments] = await Promise.all([
      this.prisma.order.findMany({ where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay }, isDeleted: false } }),
      this.prisma.payment.findMany({ where: { order: { tenantId }, createdAt: { gte: startOfDay, lte: endOfDay }, status: PaymentStatus.PAID } }),
    ]);

    const totalSales = orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const byPaymentMethod = payments.reduce((acc: any, p: any) => { acc[p.method] = (acc[p.method] || 0) + Number(p.amount); return acc; }, {});

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalSales, totalOrders, avgOrderValue, byPaymentMethod,
      ordersByStatus: orders.reduce((acc: any, o: any) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {}),
    };
  }
}

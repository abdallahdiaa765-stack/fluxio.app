import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { ReservationStatus } from '@fluxio/database';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async getTables(tenantId: string, branchId?: string) {
    return this.prisma.table.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(branchId && { branchId }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        orders: {
          where: { status: { notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'] } },
          select: { id: true, status: true, totalAmount: true },
        },
        reservations: {
          where: {
            status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
            date: { gte: new Date() },
          },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async createTable(tenantId: string, data: {
    number: string;
    capacity: number;
    branchId?: string;
    posX?: number;
    posY?: number;
    shape?: string;
  }) {
    // Check if table number exists
    const existing = await this.prisma.table.findUnique({
      where: { tenantId_number: { tenantId, number: data.number } },
    });

    if (existing) {
      throw new BadRequestException(`Table ${data.number} already exists`);
    }

    return this.prisma.table.create({
      data: { tenantId, ...data },
    });
  }

  async updateTable(tenantId: string, id: string, data: {
    number?: string;
    capacity?: number;
    posX?: number;
    posY?: number;
    shape?: string;
    status?: string;
    isActive?: boolean;
  }) {
    const table = await this.prisma.table.findFirst({
      where: { id, tenantId },
    });
    if (!table) throw new NotFoundException('Table not found');

    return this.prisma.table.update({ where: { id }, data });
  }

  async deleteTable(tenantId: string, id: string) {
    const table = await this.prisma.table.findFirst({
      where: { id, tenantId },
    });
    if (!table) throw new NotFoundException('Table not found');

    return this.prisma.table.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    });
  }

  // ========== RESERVATIONS ==========
  async getReservations(tenantId: string, options?: {
    date?: Date;
    status?: ReservationStatus;
    tableId?: string;
  }) {
    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        ...(options?.date && {
          date: {
            gte: new Date(options.date.setHours(0, 0, 0, 0)),
            lte: new Date(options.date.setHours(23, 59, 59, 999)),
          },
        }),
        ...(options?.status && { status: options.status }),
        ...(options?.tableId && { tableId: options.tableId }),
      },
      include: {
        table: { select: { id: true, number: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async createReservation(tenantId: string, data: {
    tableId?: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    partySize: number;
    date: Date;
    time: string;
    notes?: string;
  }) {
    // Check table availability if tableId provided
    if (data.tableId) {
      const existingReservation = await this.prisma.reservation.findFirst({
        where: {
          tableId: data.tableId,
          date: data.date,
          time: data.time,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        },
      });

      if (existingReservation) {
        throw new BadRequestException('Table is already reserved for this time slot');
      }
    }

    return this.prisma.reservation.create({
      data: { tenantId, ...data },
    });
  }

  async updateReservationStatus(tenantId: string, id: string, status: ReservationStatus) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    return this.prisma.reservation.update({
      where: { id },
      data: { status },
    });
  }

  async cancelReservation(tenantId: string, id: string) {
    return this.updateReservationStatus(tenantId, id, ReservationStatus.CANCELLED);
  }
}

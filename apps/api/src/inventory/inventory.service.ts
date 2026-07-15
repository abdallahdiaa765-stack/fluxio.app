import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { InventoryMovementType } from '@fluxio/database';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getItems(tenantId: string, branchId?: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(branchId && { branchId }),
      },
      include: {
        supplier: true,
        products: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getLowStockItems(tenantId: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isDeleted: false,
        currentStock: { lte: { minStockLevel: { path: [] } } },
      },
      include: { supplier: true },
    });
  }

  async createItem(tenantId: string, data: {
    name: string;
    nameAr?: string;
    sku?: string;
    description?: string;
    unitOfMeasure: string;
    currentStock?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderPoint?: number;
    unitCost?: number;
    supplierId?: string;
    branchId?: string;
  }) {
    return this.prisma.inventoryItem.create({
      data: { tenantId, ...data },
    });
  }

  async recordMovement(tenantId: string, data: {
    itemId: string;
    type: InventoryMovementType;
    quantity: number;
    unitCost?: number;
    orderId?: string;
    reference?: string;
    notes?: string;
    createdBy: string;
  }) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: data.itemId, tenantId },
    });

    if (!item) throw new NotFoundException('Inventory item not found');

    const totalCost = data.unitCost ? data.unitCost * data.quantity : null;

    // Update stock
    let newStock = Number(item.currentStock);
    if (data.type === InventoryMovementType.IN) {
      newStock += data.quantity;
    } else if (data.type === InventoryMovementType.OUT) {
      newStock -= data.quantity;
    } else if (data.type === InventoryMovementType.ADJUSTMENT) {
      newStock = data.quantity; // Direct set for adjustment
    } else if (data.type === InventoryMovementType.WASTE || data.type === InventoryMovementType.RETURN) {
      newStock -= data.quantity;
    }

    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock for this movement');
    }

    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: {
          itemId: data.itemId,
          type: data.type,
          quantity: data.quantity,
          unitCost: data.unitCost,
          totalCost,
          orderId: data.orderId,
          reference: data.reference,
          notes: data.notes,
          createdBy: data.createdBy,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: { currentStock: newStock },
      }),
    ]);

    return movement;
  }

  async getMovements(tenantId: string, itemId?: string) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        item: { tenantId },
        ...(itemId && { itemId }),
      },
      include: {
        item: { select: { id: true, name: true, unitOfMeasure: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getStockReport(tenantId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        movements: { orderBy: { createdAt: 'desc' }, take: 5 },
        supplier: true,
      },
    });

    const totalValue = items.reduce((sum, item) => {
      return sum + (Number(item.currentStock) * Number(item.unitCost || 0));
    }, 0);

    const lowStock = items.filter(item =>
      Number(item.currentStock) <= Number(item.minStockLevel)
    );

    return {
      totalItems: items.length,
      totalValue,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
      items,
    };
  }
}

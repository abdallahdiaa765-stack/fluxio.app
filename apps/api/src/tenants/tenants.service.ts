import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isDeleted: false },
      include: {
        settings: true,
        subscription: true,
        branches: { where: { isDeleted: false } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Restaurant not found');
    }

    return tenant;
  }

  async updateSettings(tenantId: string, data: {
    brandName?: string;
    brandLogoUrl?: string;
    brandColors?: { primary?: string; secondary?: string; accent?: string };
    taxRate?: number;
    taxNumber?: string;
    currency?: string;
    enableTips?: boolean;
    enableDelivery?: boolean;
    enableReservations?: boolean;
    receiptHeader?: string;
    receiptFooter?: string;
    receiptShowTax?: boolean;
    businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
  }) {
    // Update or create settings
    const settings = await this.prisma.restaurantSetting.upsert({
      where: { tenantId },
      update: {
        ...(data.brandName && { brandName: data.brandName }),
        ...(data.brandLogoUrl && { brandLogoUrl: data.brandLogoUrl }),
        ...(data.brandColors && { brandColors: data.brandColors }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.taxNumber && { taxNumber: data.taxNumber }),
        ...(data.currency && { currency: data.currency }),
        ...(data.enableTips !== undefined && { enableTips: data.enableTips }),
        ...(data.enableDelivery !== undefined && { enableDelivery: data.enableDelivery }),
        ...(data.enableReservations !== undefined && { enableReservations: data.enableReservations }),
        ...(data.receiptHeader !== undefined && { receiptHeader: data.receiptHeader }),
        ...(data.receiptFooter !== undefined && { receiptFooter: data.receiptFooter }),
        ...(data.receiptShowTax !== undefined && { receiptShowTax: data.receiptShowTax }),
      },
      create: {
        tenantId,
        brandName: data.brandName,
        brandLogoUrl: data.brandLogoUrl,
        brandColors: data.brandColors,
        taxRate: data.taxRate ?? 14.00,
        taxNumber: data.taxNumber,
        currency: data.currency ?? 'EGP',
        enableTips: data.enableTips ?? true,
        enableDelivery: data.enableDelivery ?? false,
        enableReservations: data.enableReservations ?? true,
        receiptHeader: data.receiptHeader,
        receiptFooter: data.receiptFooter,
        receiptShowTax: data.receiptShowTax ?? true,
      },
    });

    // Update tenant colors if provided
    if (data.brandColors) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(data.brandColors.primary && { primaryColor: data.brandColors.primary }),
          ...(data.brandColors.secondary && { secondaryColor: data.brandColors.secondary }),
          ...(data.brandColors.accent && { accentColor: data.brandColors.accent }),
        },
      });
    }

    return settings;
  }

  async createBranch(tenantId: string, data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
    latitude?: number;
    longitude?: number;
  }) {
    // Check subscription limit
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    const currentBranchCount = await this.prisma.branch.count({
      where: { tenantId, isDeleted: false },
    });

    if (subscription?.maxBranches && currentBranchCount >= subscription.maxBranches) {
      throw new BadRequestException(
        `Branch limit reached (${subscription.maxBranches}). Upgrade your plan.`
      );
    }

    return this.prisma.branch.create({
      data: {
        tenantId,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        businessHours: data.businessHours,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  }

  async updateBranch(tenantId: string, branchId: string, data: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
    isActive?: boolean;
  }) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.prisma.branch.update({
      where: { id: branchId },
      data,
    });
  }

  async deleteBranch(tenantId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.prisma.branch.update({
      where: { id: branchId },
      data: { isDeleted: true, isActive: false },
    });
  }
}

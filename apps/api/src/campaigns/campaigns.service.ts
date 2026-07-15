import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { CampaignType } from '@fluxio/database';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async getCampaigns(tenantId: string, options?: { type?: CampaignType; isActive?: boolean }) {
    return this.prisma.campaign.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(options?.type && { type: options.type }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCampaign(tenantId: string, data: {
    name: string;
    type: CampaignType;
    discountPercent?: number;
    discountAmount?: number;
    maxDiscount?: number;
    minOrderAmount?: number;
    applicableCategories?: string[];
    applicableProducts?: string[];
    startDate: Date;
    endDate?: Date;
    maxUses?: number;
    maxUsesPerCustomer?: number;
    bannerUrl?: string;
    bannerText?: string;
  }) {
    return this.prisma.campaign.create({
      data: { tenantId, ...data },
    });
  }

  async updateCampaign(tenantId: string, id: string, data: Partial<{
    name: string;
    discountPercent: number;
    discountAmount: number;
    maxDiscount: number;
    minOrderAmount: number;
    startDate: Date;
    endDate: Date;
    maxUses: number;
    maxUsesPerCustomer: number;
    bannerUrl: string;
    bannerText: string;
    isActive: boolean;
  }>) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.prisma.campaign.update({ where: { id }, data });
  }

  async deleteCampaign(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.prisma.campaign.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    });
  }

  async validateCoupon(tenantId: string, code: string, orderAmount: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        tenantId,
        name: code,
        type: CampaignType.COUPON,
        isActive: true,
        isDeleted: false,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        OR: [{ maxUses: null }, { usedCount: { lt: { maxUses: { path: [] } } } }],
      },
    });

    if (!campaign) {
      return { valid: false, message: 'Invalid or expired coupon' };
    }

    if (campaign.minOrderAmount && orderAmount < Number(campaign.minOrderAmount)) {
      return {
        valid: false,
        message: `Minimum order amount is ${campaign.minOrderAmount} EGP`,
      };
    }

    let discount = 0;
    if (campaign.discountPercent) {
      discount = (orderAmount * campaign.discountPercent) / 100;
      if (campaign.maxDiscount) {
        discount = Math.min(discount, Number(campaign.maxDiscount));
      }
    } else if (campaign.discountAmount) {
      discount = Number(campaign.discountAmount);
    }

    return {
      valid: true,
      discount,
      campaignId: campaign.id,
    };
  }

  async applyCoupon(tenantId: string, campaignId: string) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { usedCount: { increment: 1 } },
    });
  }
}

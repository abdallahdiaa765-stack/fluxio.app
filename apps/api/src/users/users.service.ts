import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma.service';
import { UserRole } from '@fluxio/database';
import { FeatureFlag, planHasFeature } from '@/subscriptions/feature-flags';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, options?: { role?: UserRole; isActive?: boolean }) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(options?.role && { role: options.role }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        customPermissions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, isDeleted: false },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        customPermissions: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(tenantId: string, data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    customPermissions?: string[];
  }) {
    // Check subscription limit
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    const currentEmployeeCount = await this.prisma.user.count({
      where: {
        tenantId,
        isDeleted: false,
        role: { not: UserRole.CUSTOMER },
      },
    });

    if (subscription?.maxEmployees && currentEmployeeCount >= subscription.maxEmployees) {
      throw new BadRequestException(
        `Employee limit reached (${subscription.maxEmployees}). Upgrade your plan.`
      );
    }

    // Custom per-employee permission overrides are a Business+ feature -
    // Starter tenants can still assign roles, just not hand-pick individual
    // permissions per person.
    if (data.customPermissions?.length && subscription && !planHasFeature(subscription.plan, FeatureFlag.EMPLOYEE_PERMISSIONS)) {
      throw new BadRequestException(
        'Custom employee permissions require the Business plan or higher. Upgrade to unlock this.'
      );
    }

    // Generate username from email
    const username = data.email.split('@')[0] + '-' + Date.now().toString(36);

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        customPermissions: data.customPermissions || [],
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      tempPassword, // Send this via email in production
    };
  }

  async update(tenantId: string, id: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: UserRole;
    isActive?: boolean;
    customPermissions?: string[];
  }) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        customPermissions: true,
        updatedAt: true,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    return this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        email: `deleted-${id}@fluxio.app`,
        username: `deleted-${id}`,
      },
    });
  }

  async resetPassword(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { newPassword }; // Send via email in production
  }
}

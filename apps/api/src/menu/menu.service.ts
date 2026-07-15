import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // ========== CATEGORIES ==========
  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isDeleted: false, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(tenantId: string, data: {
    name: string;
    nameAr?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
  }) {
    return this.prisma.category.create({
      data: { tenantId, ...data },
    });
  }

  async updateCategory(tenantId: string, id: string, data: {
    name?: string;
    nameAr?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.category.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    });
  }

  // ========== PRODUCTS ==========
  async getProducts(tenantId: string, options?: { categoryId?: string; isAvailable?: boolean }) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(options?.categoryId && { categoryId: options.categoryId }),
        ...(options?.isAvailable !== undefined && { isAvailable: options.isAvailable }),
      },
      include: {
        category: { select: { id: true, name: true, nameAr: true } },
        variants: { where: { isActive: true } },
        extras: { where: { isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        category: true,
        variants: true,
        extras: true,
        inventoryItem: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(tenantId: string, data: {
    name: string;
    nameAr?: string;
    description?: string;
    categoryId?: string;
    basePrice: number;
    costPrice?: number;
    sku?: string;
    imageUrl?: string;
    trackStock?: boolean;
    inventoryItemId?: string;
    variants?: { name: string; nameAr?: string; priceAdjustment: number }[];
    extras?: { name: string; nameAr?: string; price: number }[];
  }) {
    const { variants, extras, ...productData } = data;

    return this.prisma.product.create({
      data: {
        tenantId,
        ...productData,
        variants: variants ? {
          create: variants,
        } : undefined,
        extras: extras ? {
          create: extras,
        } : undefined,
      },
      include: {
        variants: true,
        extras: true,
      },
    });
  }

  async updateProduct(tenantId: string, id: string, data: {
    name?: string;
    nameAr?: string;
    description?: string;
    categoryId?: string;
    basePrice?: number;
    costPrice?: number;
    sku?: string;
    imageUrl?: string;
    isAvailable?: boolean;
    isFeatured?: boolean;
    trackStock?: boolean;
    inventoryItemId?: string;
  }) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id },
      data: { isDeleted: true, isAvailable: false },
    });
  }

  // ========== VARIANTS ==========
  async addVariant(tenantId: string, productId: string, data: {
    name: string;
    nameAr?: string;
    priceAdjustment: number;
  }) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.productVariant.create({
      data: { productId, ...data },
    });
  }

  async updateVariant(tenantId: string, variantId: string, data: {
    name?: string;
    nameAr?: string;
    priceAdjustment?: number;
    isActive?: boolean;
  }) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, product: { tenantId } },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    return this.prisma.productVariant.update({ where: { id: variantId }, data });
  }

  async deleteVariant(tenantId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, product: { tenantId } },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }

  // ========== EXTRAS ==========
  async addExtra(tenantId: string, productId: string, data: {
    name: string;
    nameAr?: string;
    price: number;
  }) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.productExtra.create({
      data: { productId, ...data },
    });
  }

  async updateExtra(tenantId: string, extraId: string, data: {
    name?: string;
    nameAr?: string;
    price?: number;
    isActive?: boolean;
  }) {
    const extra = await this.prisma.productExtra.findFirst({
      where: { id: extraId, product: { tenantId } },
    });
    if (!extra) throw new NotFoundException('Extra not found');

    return this.prisma.productExtra.update({ where: { id: extraId }, data });
  }

  async deleteExtra(tenantId: string, extraId: string) {
    const extra = await this.prisma.productExtra.findFirst({
      where: { id: extraId, product: { tenantId } },
    });
    if (!extra) throw new NotFoundException('Extra not found');

    return this.prisma.productExtra.update({
      where: { id: extraId },
      data: { isActive: false },
    });
  }

  // ========== PUBLIC MENU ==========
  async getPublicMenu(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true, isDeleted: false },
      include: {
        settings: true,
        categories: {
          where: { isActive: true, isDeleted: false },
          orderBy: { sortOrder: 'asc' },
          include: {
            products: {
              where: { isAvailable: true, isDeleted: false },
              include: {
                variants: { where: { isActive: true } },
                extras: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Restaurant not found');

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        accentColor: tenant.accentColor,
      },
      settings: tenant.settings,
      categories: tenant.categories,
    };
  }
}

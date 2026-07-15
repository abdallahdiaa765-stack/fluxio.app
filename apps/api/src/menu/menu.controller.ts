import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/auth/guards/roles.guard';
import { Permission } from '@/common/rbac.permissions';
import { CurrentTenant } from '@/common/decorators/current-user.decorator';

// DTOs
class CreateCategoryDto {
  name: string;
  nameAr?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

class CreateProductDto {
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
}

class CreateVariantDto {
  name: string;
  nameAr?: string;
  priceAdjustment: number;
}

class CreateExtraDto {
  name: string;
  nameAr?: string;
  price: number;
}

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  // Public menu (no auth required)
  @Get('public/:slug')
  async getPublicMenu(@Param('slug') slug: string) {
    return this.menuService.getPublicMenu(slug);
  }

  // Protected routes
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_VIEW)
  async getCategories(@CurrentTenant() tenantId: string) {
    return this.menuService.getCategories(tenantId);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_CREATE)
  async createCategory(@CurrentTenant() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(tenantId, dto);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  async updateCategory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategoryDto>,
  ) {
    return this.menuService.updateCategory(tenantId, id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_DELETE)
  async deleteCategory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.menuService.deleteCategory(tenantId, id);
  }

  @Get('products')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_VIEW)
  async getProducts(
    @CurrentTenant() tenantId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.menuService.getProducts(tenantId, { categoryId });
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_VIEW)
  async getProduct(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.menuService.getProductById(tenantId, id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_CREATE)
  async createProduct(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.menuService.createProduct(tenantId, dto);
  }

  @Put('products/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  async updateProduct(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.menuService.updateProduct(tenantId, id, dto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_DELETE)
  async deleteProduct(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.menuService.deleteProduct(tenantId, id);
  }

  @Post('products/:id/variants')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_CREATE)
  async addVariant(
    @CurrentTenant() tenantId: string,
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.menuService.addVariant(tenantId, productId, dto);
  }

  @Post('products/:id/extras')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permission.MENU_CREATE)
  async addExtra(
    @CurrentTenant() tenantId: string,
    @Param('id') productId: string,
    @Body() dto: CreateExtraDto,
  ) {
    return this.menuService.addExtra(tenantId, productId, dto);
  }
}

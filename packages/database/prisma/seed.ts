import { PrismaClient, SubscriptionPlan, SubscriptionStatus, UserRole } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // 1. Create Demo Tenant
  // ============================================
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      email: 'demo@fluxio.app',
      phone: '+20 100 000 0000',
      address: 'Cairo, Egypt',
      primaryColor: '#00d4ff',
      secondaryColor: '#7b2ff7',
      accentColor: '#00f5d4',
    },
  });

  console.log(`✅ Tenant created: ${tenant.name}`);

  // ============================================
  // 2. Create Subscription with Plan Limits
  // ============================================
  const subscription = await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: SubscriptionPlan.BUSINESS,
      status: SubscriptionStatus.ACTIVE,
      maxBranches: 3,
      maxEmployees: 50,
      maxProducts: null, // unlimited
      maxOrders: null,     // unlimited
      priceMonthly: 1999.00,
      priceYearly: 19990.00,
      currency: 'EGP',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Subscription created: ${subscription.plan}`);

  // ============================================
  // 3. Create Users for all 7 roles
  // ============================================
  const usersData = [
    { role: UserRole.SUPER_ADMIN, email: 'super@fluxio.app', firstName: 'Super', lastName: 'Admin' },
    { role: UserRole.RESTAURANT_OWNER, email: 'owner@demo.com', firstName: 'Restaurant', lastName: 'Owner' },
    { role: UserRole.MANAGER, email: 'manager@demo.com', firstName: 'General', lastName: 'Manager' },
    { role: UserRole.CASHIER, email: 'cashier@demo.com', firstName: 'Head', lastName: 'Cashier' },
    { role: UserRole.CHEF, email: 'chef@demo.com', firstName: 'Head', lastName: 'Chef' },
    { role: UserRole.WAITER, email: 'waiter@demo.com', firstName: 'Senior', lastName: 'Waiter' },
    { role: UserRole.CUSTOMER, email: 'customer@demo.com', firstName: 'Valued', lastName: 'Customer' },
  ];

  for (const userData of usersData) {
    const username = `${userData.role.toLowerCase().replace('_', '-')}-demo`;
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        tenantId: tenant.id,
        email: userData.email,
        username,
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', // password: "Fluxio2026!"
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: true,
      },
    });
  }

  console.log(`✅ Created ${usersData.length} demo users`);

  // ============================================
  // 4. Create Branch
  // ============================================
  const branch = await prisma.branch.upsert({
    where: { id: 'demo-branch-1' },
    update: {},
    create: {
      id: 'demo-branch-1',
      tenantId: tenant.id,
      name: 'Main Branch',
      address: '123 Demo Street, Cairo',
      phone: '+20 100 000 0001',
      businessHours: {
        monday: { open: '09:00', close: '23:00', closed: false },
        tuesday: { open: '09:00', close: '23:00', closed: false },
        wednesday: { open: '09:00', close: '23:00', closed: false },
        thursday: { open: '09:00', close: '23:00', closed: false },
        friday: { open: '13:00', close: '23:00', closed: false },
        saturday: { open: '09:00', close: '23:00', closed: false },
        sunday: { open: '09:00', close: '23:00', closed: false },
      },
    },
  });

  console.log(`✅ Branch created: ${branch.name}`);

  // ============================================
  // 5. Create Restaurant Settings
  // ============================================
  await prisma.restaurantSetting.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      brandName: 'Demo Restaurant',
      taxRate: 14.00,
      taxNumber: '123456789',
      currency: 'EGP',
      enableTips: true,
      enableDelivery: false,
      enableReservations: true,
      receiptHeader: 'Demo Restaurant\nCairo, Egypt',
      receiptFooter: 'Thank you for dining with us!',
    },
  });

  console.log('✅ Restaurant settings created');

  // ============================================
  // 6. Create Categories
  // ============================================
  const categories = [
    { name: 'Appetizers', nameAr: 'مقبلات', sortOrder: 1 },
    { name: 'Main Course', nameAr: 'أطباق رئيسية', sortOrder: 2 },
    { name: 'Desserts', nameAr: 'حلويات', sortOrder: 3 },
    { name: 'Beverages', nameAr: 'مشروبات', sortOrder: 4 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: `cat-${cat.sortOrder}` },
      update: {},
      create: {
        id: `cat-${cat.sortOrder}`,
        tenantId: tenant.id,
        ...cat,
      },
    });
  }

  console.log(`✅ Created ${categories.length} categories`);

  // ============================================
  // 7. Create Products
  // ============================================
  const products = [
    {
      id: 'prod-1',
      name: 'Caesar Salad',
      nameAr: 'سلطة سيزر',
      basePrice: 85.00,
      categoryId: 'cat-1',
      sku: 'APP-001',
    },
    {
      id: 'prod-2',
      name: 'Grilled Chicken',
      nameAr: 'دجاج مشوي',
      basePrice: 185.00,
      categoryId: 'cat-2',
      sku: 'MAIN-001',
    },
    {
      id: 'prod-3',
      name: 'Chocolate Cake',
      nameAr: 'كيك الشوكولاتة',
      basePrice: 65.00,
      categoryId: 'cat-3',
      sku: 'DES-001',
    },
    {
      id: 'prod-4',
      name: 'Fresh Orange Juice',
      nameAr: 'عصير برتقال طازج',
      basePrice: 35.00,
      categoryId: 'cat-4',
      sku: 'BEV-001',
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: {
        tenantId: tenant.id,
        ...prod,
        isAvailable: true,
      },
    });
  }

  console.log(`✅ Created ${products.length} products`);

  // ============================================
  // 8. Create Tables
  // ============================================
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { id: `table-${i}` },
      update: {},
      create: {
        id: `table-${i}`,
        tenantId: tenant.id,
        branchId: branch.id,
        number: `T${String(i).padStart(2, '0')}`,
        capacity: i <= 4 ? 4 : i <= 7 ? 6 : 8,
        posX: (i % 4) * 150,
        posY: Math.floor((i - 1) / 4) * 150,
      },
    });
  }

  console.log('✅ Created 10 tables');

  // ============================================
  // 9. Create QR Code for menu
  // ============================================
  await prisma.qrCode.upsert({
    where: { code: 'demo-menu-qr' },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'demo-menu-qr',
      url: `https://fluxio.app/menu/${tenant.slug}`,
    },
  });

  console.log('✅ QR Code created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo credentials (password: Fluxio2026!):');
  console.log('   Super Admin: super@fluxio.app');
  console.log('   Owner:       owner@demo.com');
  console.log('   Manager:     manager@demo.com');
  console.log('   Cashier:     cashier@demo.com');
  console.log('   Chef:        chef@demo.com');
  console.log('   Waiter:      waiter@demo.com');
  console.log('   Customer:    customer@demo.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

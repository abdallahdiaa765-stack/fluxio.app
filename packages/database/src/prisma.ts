import { PrismaClient } from './generated/prisma';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Tenant context for RLS
export type TenantContext = {
  tenantId: string;
  userId?: string;
  role?: string;
};

// Middleware to set RLS context before each query
prisma.$use(async (params, next) => {
  // RLS will be enforced via PostgreSQL policies
  // This middleware can be extended for audit logging
  return next(params);
});

export default prisma;

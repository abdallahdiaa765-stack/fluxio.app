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
// NOTE: Prisma removed `$use` in v5+. RLS is enforced entirely via
// PostgreSQL policies for now; if per-query audit logging is needed later,
// use Prisma Client Extensions ($extends) instead of middleware.

export default prisma;

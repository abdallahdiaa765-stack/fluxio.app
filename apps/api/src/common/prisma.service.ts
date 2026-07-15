import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@fluxio/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private currentTenantId: string | null = null;

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  setTenantContext(tenantId: string) {
    this.currentTenantId = tenantId;
  }

  getTenantContext(): string | null {
    return this.currentTenantId;
  }

  async withTenant<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
    const previousTenant = this.currentTenantId;
    this.currentTenantId = tenantId;

    // Set PostgreSQL RLS context
    await this.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant', '${tenantId}', false)`
    );

    try {
      return await operation();
    } finally {
      this.currentTenantId = previousTenant;
      if (previousTenant) {
        await this.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant', '${previousTenant}', false)`
        );
      } else {
        await this.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant', '', false)`
        );
      }
    }
  }
}

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const path = request.url;

    // Only audit sensitive operations
    const sensitiveMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!sensitiveMethods.includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const duration = Date.now() - startTime;

          await this.prisma.auditLog.create({
            data: {
              tenantId: user?.tenantId || 'system',
              userId: user?.userId,
              action: `${path}.${method.toLowerCase()}`,
              entityType: context.getClass().name,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              after: response ? JSON.parse(JSON.stringify(response)) : undefined,
            },
          });
        } catch (e) {
          // Don't fail the request if audit logging fails
          console.error('Audit logging failed:', e);
        }
      }),
    );
  }
}

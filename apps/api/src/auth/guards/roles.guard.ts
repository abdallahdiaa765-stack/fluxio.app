import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export type Permission = string;
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ['*'],
  RESTAURANT_OWNER: ['read', 'write', 'delete'],
  MANAGER: ['read', 'write'],
  WAITER: ['read'],
  KITCHEN: ['read'],
};

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

export const Roles = (...roles: string[]) => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value || target);
    return descriptor;
  };
};

export const RequirePermissions = (...permissions: Permission[]) => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor?.value || target);
    return descriptor;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentication required');

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    if (requiredPermissions) {
      const userPermissions = ROLE_PERMISSIONS[user.role] || [];
      const customPermissions = user.customPermissions || [];
      const allPermissions = [...userPermissions, ...customPermissions];
      const hasAllPermissions = requiredPermissions.every((p) =>
        allPermissions.includes(p) || allPermissions.includes('*')
      );
      if (!hasAllPermissions) throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

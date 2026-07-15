export enum Permission {
  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',

  // Users
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Menu
  MENU_VIEW = 'menu:view',
  MENU_CREATE = 'menu:create',
  MENU_UPDATE = 'menu:update',
  MENU_DELETE = 'menu:delete',

  // Orders
  ORDERS_VIEW = 'orders:view',
  ORDERS_CREATE = 'orders:create',
  ORDERS_UPDATE = 'orders:update',
  ORDERS_DELETE = 'orders:delete',
  ORDERS_MANAGE = 'orders:manage',

  // Tables
  TABLES_VIEW = 'tables:view',
  TABLES_MANAGE = 'tables:manage',

  // Inventory
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_MANAGE = 'inventory:manage',

  // Reports
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update',

  // Subscriptions
  SUBSCRIPTION_VIEW = 'subscription:view',
  SUBSCRIPTION_MANAGE = 'subscription:manage',

  // Super Admin
  SUPER_ADMIN = 'super_admin',
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    Permission.SUPER_ADMIN,
    Permission.DASHBOARD_VIEW,
    Permission.USERS_VIEW, Permission.USERS_CREATE, Permission.USERS_UPDATE, Permission.USERS_DELETE,
    Permission.MENU_VIEW, Permission.MENU_CREATE, Permission.MENU_UPDATE, Permission.MENU_DELETE,
    Permission.ORDERS_VIEW, Permission.ORDERS_CREATE, Permission.ORDERS_UPDATE, Permission.ORDERS_DELETE, Permission.ORDERS_MANAGE,
    Permission.TABLES_VIEW, Permission.TABLES_MANAGE,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_MANAGE,
    Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
    Permission.SETTINGS_VIEW, Permission.SETTINGS_UPDATE,
    Permission.SUBSCRIPTION_VIEW, Permission.SUBSCRIPTION_MANAGE,
  ],
  RESTAURANT_OWNER: [
    Permission.DASHBOARD_VIEW,
    Permission.USERS_VIEW, Permission.USERS_CREATE, Permission.USERS_UPDATE, Permission.USERS_DELETE,
    Permission.MENU_VIEW, Permission.MENU_CREATE, Permission.MENU_UPDATE, Permission.MENU_DELETE,
    Permission.ORDERS_VIEW, Permission.ORDERS_CREATE, Permission.ORDERS_UPDATE, Permission.ORDERS_MANAGE,
    Permission.TABLES_VIEW, Permission.TABLES_MANAGE,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_MANAGE,
    Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
    Permission.SETTINGS_VIEW, Permission.SETTINGS_UPDATE,
    Permission.SUBSCRIPTION_VIEW, Permission.SUBSCRIPTION_MANAGE,
  ],
  MANAGER: [
    Permission.DASHBOARD_VIEW,
    Permission.USERS_VIEW, Permission.USERS_CREATE, Permission.USERS_UPDATE,
    Permission.MENU_VIEW, Permission.MENU_CREATE, Permission.MENU_UPDATE,
    Permission.ORDERS_VIEW, Permission.ORDERS_CREATE, Permission.ORDERS_UPDATE, Permission.ORDERS_MANAGE,
    Permission.TABLES_VIEW, Permission.TABLES_MANAGE,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_MANAGE,
    Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
    Permission.SETTINGS_VIEW,
  ],
  CASHIER: [
    Permission.DASHBOARD_VIEW,
    Permission.ORDERS_VIEW, Permission.ORDERS_CREATE, Permission.ORDERS_UPDATE,
    Permission.TABLES_VIEW,
    Permission.REPORTS_VIEW,
  ],
  CHEF: [
    Permission.ORDERS_VIEW, Permission.ORDERS_UPDATE,
    Permission.INVENTORY_VIEW,
  ],
  WAITER: [
    Permission.ORDERS_VIEW, Permission.ORDERS_CREATE,
    Permission.TABLES_VIEW, Permission.TABLES_MANAGE,
  ],
  CUSTOMER: [
    Permission.MENU_VIEW,
    Permission.ORDERS_CREATE, Permission.ORDERS_VIEW,
  ],
};

import { SubscriptionPlan } from '@fluxio/database';

export enum FeatureFlag {
  MENU_MANAGEMENT = 'MENU_MANAGEMENT',
  QR_MENU = 'QR_MENU',
  POS = 'POS',
  KITCHEN_DISPLAY = 'KITCHEN_DISPLAY',
  WAITER_MANAGEMENT = 'WAITER_MANAGEMENT',
  TABLE_MANAGEMENT = 'TABLE_MANAGEMENT',
  CASHIER = 'CASHIER',
  INVENTORY = 'INVENTORY',
  ORDER_MANAGEMENT = 'ORDER_MANAGEMENT',
  BASIC_REPORTS = 'BASIC_REPORTS',
  CUSTOMER_MANAGEMENT = 'CUSTOMER_MANAGEMENT',
  BUSINESS_SETTINGS = 'BUSINESS_SETTINGS',

  ADVANCED_REPORTS = 'ADVANCED_REPORTS',
  ANALYTICS_DASHBOARD = 'ANALYTICS_DASHBOARD',
  OFFERS = 'OFFERS',
  COUPONS = 'COUPONS',
  MARKETING_CENTER = 'MARKETING_CENTER',
  EMPLOYEE_PERMISSIONS = 'EMPLOYEE_PERMISSIONS',
  RESTAURANT_BRANDING = 'RESTAURANT_BRANDING',
  CUSTOM_THEME = 'CUSTOM_THEME',

  MULTI_BRANCH = 'MULTI_BRANCH',
  API_ACCESS = 'API_ACCESS',
  WHITE_LABEL = 'WHITE_LABEL',
}

// Base tier - every paying tenant gets these regardless of plan.
const STARTER_FLAGS: FeatureFlag[] = [
  FeatureFlag.MENU_MANAGEMENT,
  FeatureFlag.QR_MENU,
  FeatureFlag.POS,
  FeatureFlag.KITCHEN_DISPLAY,
  FeatureFlag.WAITER_MANAGEMENT,
  FeatureFlag.TABLE_MANAGEMENT,
  FeatureFlag.CASHIER,
  FeatureFlag.INVENTORY,
  FeatureFlag.ORDER_MANAGEMENT,
  FeatureFlag.BASIC_REPORTS,
  FeatureFlag.CUSTOMER_MANAGEMENT,
  FeatureFlag.BUSINESS_SETTINGS,
];

// Added on top of Starter when upgrading to Business.
const BUSINESS_EXTRA_FLAGS: FeatureFlag[] = [
  FeatureFlag.ADVANCED_REPORTS,
  FeatureFlag.ANALYTICS_DASHBOARD,
  FeatureFlag.OFFERS,
  FeatureFlag.COUPONS,
  FeatureFlag.MARKETING_CENTER,
  FeatureFlag.EMPLOYEE_PERMISSIONS,
  FeatureFlag.RESTAURANT_BRANDING,
  FeatureFlag.CUSTOM_THEME,
];

// Added on top of Business when upgrading to Enterprise.
const ENTERPRISE_EXTRA_FLAGS: FeatureFlag[] = [
  FeatureFlag.MULTI_BRANCH,
  FeatureFlag.API_ACCESS,
  FeatureFlag.WHITE_LABEL,
];

// Cumulative: each tier = everything the tier below has, plus its own extras.
// This is what actually gets checked - PLAN_CONFIGS.features in
// subscriptions.service.ts is just the human-readable marketing copy (and
// says things like "كل مميزات Starter" instead of repeating every item), so
// it was never usable for a real permission check on its own.
export const PLAN_FEATURE_FLAGS: Record<SubscriptionPlan, FeatureFlag[]> = {
  [SubscriptionPlan.STARTER]: [...STARTER_FLAGS],
  [SubscriptionPlan.BUSINESS]: [...STARTER_FLAGS, ...BUSINESS_EXTRA_FLAGS],
  [SubscriptionPlan.ENTERPRISE]: [...STARTER_FLAGS, ...BUSINESS_EXTRA_FLAGS, ...ENTERPRISE_EXTRA_FLAGS],
};

export function planHasFeature(plan: SubscriptionPlan, flag: FeatureFlag): boolean {
  return PLAN_FEATURE_FLAGS[plan]?.includes(flag) ?? false;
}

// Given a feature, the cheapest plan that includes it - used to tell the
// frontend which plan to offer the tenant when a feature is locked.
export function minimumPlanFor(flag: FeatureFlag): SubscriptionPlan {
  const order = [SubscriptionPlan.STARTER, SubscriptionPlan.BUSINESS, SubscriptionPlan.ENTERPRISE];
  return order.find((plan) => planHasFeature(plan, flag)) ?? SubscriptionPlan.ENTERPRISE;
}

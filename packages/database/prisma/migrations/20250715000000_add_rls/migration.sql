-- ============================================
-- FLUXIO ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tenant-scoped tables

-- Tenant table (no RLS needed - it's the root)

-- Users
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON "User"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Branches
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_branches ON "Branch"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Categories
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_categories ON "Category"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Products
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_products ON "Product"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Orders
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_orders ON "Order"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- OrderItems
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_order_items ON "OrderItem"
  USING ("orderId" IN (
    SELECT id FROM "Order" 
    WHERE "tenantId" = current_setting('app.current_tenant', true)::text
  ));

-- Payments
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_payments ON "Payment"
  USING ("orderId" IN (
    SELECT id FROM "Order" 
    WHERE "tenantId" = current_setting('app.current_tenant', true)::text
  ));

-- Tables
ALTER TABLE "Table" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tables ON "Table"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Reservations
ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_reservations ON "Reservation"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Inventory
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_inventory ON "InventoryItem"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Inventory Movements
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_inventory_movements ON "InventoryMovement"
  USING ("itemId" IN (
    SELECT id FROM "InventoryItem" 
    WHERE "tenantId" = current_setting('app.current_tenant', true)::text
  ));

-- Suppliers
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_suppliers ON "Supplier"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Campaigns
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_campaigns ON "Campaign"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Reviews
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_reviews ON "Review"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Audit Logs
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_logs ON "AuditLog"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- QR Codes
ALTER TABLE "QrCode" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_qr_codes ON "QrCode"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Restaurant Settings
ALTER TABLE "RestaurantSetting" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_settings ON "RestaurantSetting"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Loyalty Programs
ALTER TABLE "LoyaltyProgram" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_loyalty ON "LoyaltyProgram"
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Notifications
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notifications ON "Notification"
  USING (
    "tenantId" = current_setting('app.current_tenant', true)::text
    OR "tenantId" IS NULL -- system notifications
  );

-- ============================================
-- SUPER ADMIN BYPASS
-- ============================================
-- Create a role for super admin that bypasses RLS
CREATE ROLE fluxio_super_admin BYPASSRLS;

-- ============================================
-- HELPER FUNCTION TO SET TENANT CONTEXT
-- ============================================
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

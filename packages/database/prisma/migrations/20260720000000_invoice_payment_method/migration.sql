-- Add manual-payment support (Vodafone Cash) to Invoice
ALTER TABLE "Invoice" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'stripe';
ALTER TABLE "Invoice" ADD COLUMN "reference" TEXT;

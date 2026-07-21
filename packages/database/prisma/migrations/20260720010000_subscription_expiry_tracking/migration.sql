-- Tracks whether the "expiring in 7 days" warning was already sent for the
-- current billing period, and when a subscription was auto-expired by the
-- daily SubscriptionsCronService job. Both are nullable and default to NULL
-- for existing rows, so this is a safe additive migration.
ALTER TABLE "Subscription" ADD COLUMN "expiryWarningSentAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "expiredAt" TIMESTAMP(3);

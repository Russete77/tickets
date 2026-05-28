-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_org_fk";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_organization_fk";

-- DropForeignKey
ALTER TABLE "ledger_accounts" DROP CONSTRAINT "ledger_accounts_org_fk";

-- DropForeignKey
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_account_fk";

-- DropForeignKey
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_org_fk";

-- DropForeignKey
ALTER TABLE "pos_operators" DROP CONSTRAINT "pos_operators_user_id_fkey";

-- DropForeignKey
ALTER TABLE "webhook_deliveries" DROP CONSTRAINT "webhook_deliveries_sub_fk";

-- DropForeignKey
ALTER TABLE "webhook_subscriptions" DROP CONSTRAINT "webhook_subscriptions_org_fk";

-- DropIndex
DROP INDEX "pos_operators_pos_id_user_id_key";

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "points_of_sale" ADD COLUMN     "archived_at" TIMESTAMPTZ,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pos_operators" ADD COLUMN     "archived_at" TIMESTAMPTZ,
ADD COLUMN     "cpf" VARCHAR(14),
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" VARCHAR(255),
ADD COLUMN     "pin_hash" VARCHAR(255),
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pos_products" ADD COLUMN     "archived_at" TIMESTAMPTZ,
ADD COLUMN     "category_id" UUID,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "low_stock_threshold" INTEGER;

-- AlterTable
ALTER TABLE "webhook_subscriptions" ALTER COLUMN "event_types" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_categories_event_id_sort_order_idx" ON "product_categories"("event_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_event_id_name_key" ON "product_categories"("event_id", "name");

-- CreateIndex
CREATE INDEX "pos_operators_pos_id_is_active_idx" ON "pos_operators"("pos_id", "is_active");

-- AddForeignKey (idempotente: constraint já criada em 20260416051811_init)
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_producer_id_fkey";
ALTER TABLE "events" ADD CONSTRAINT "events_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_operators" ADD CONSTRAINT "pos_operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_products" ADD CONSTRAINT "pos_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "api_keys_org_revoked_idx" RENAME TO "api_keys_organization_id_revoked_at_idx";

-- RenameIndex
ALTER INDEX "ledger_accounts_event_idx" RENAME TO "ledger_accounts_event_id_idx";

-- RenameIndex
ALTER INDEX "ledger_accounts_org_event_type_idx" RENAME TO "ledger_accounts_organization_id_event_id_type_idx";

-- RenameIndex
ALTER INDEX "ledger_entries_account_created_idx" RENAME TO "ledger_entries_account_id_created_at_idx";

-- RenameIndex
ALTER INDEX "ledger_entries_group_idx" RENAME TO "ledger_entries_group_id_idx";

-- RenameIndex
ALTER INDEX "ledger_entries_source_idx" RENAME TO "ledger_entries_source_type_source_id_idx";

-- RenameIndex
ALTER INDEX "orders_gateway_payment_idx" RENAME TO "idx_orders_gateway";

-- RenameIndex
ALTER INDEX "organization_members_org_role_idx" RENAME TO "organization_members_organization_id_role_idx";

-- RenameIndex
ALTER INDEX "webhook_deliveries_status_next_idx" RENAME TO "webhook_deliveries_status_next_attempt_at_idx";

-- RenameIndex
ALTER INDEX "webhook_deliveries_sub_created_idx" RENAME TO "webhook_deliveries_subscription_id_created_at_idx";

-- RenameIndex
ALTER INDEX "webhook_subscriptions_org_active_idx" RENAME TO "webhook_subscriptions_organization_id_is_active_idx";

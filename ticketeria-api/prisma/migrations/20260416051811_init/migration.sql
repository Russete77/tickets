-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('consumer', 'producer', 'admin');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'cancelled', 'finished');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('show', 'festival', 'esporte', 'teatro', 'museu', 'curso', 'outro');

-- CreateEnum
CREATE TYPE "BatchType" AS ENUM ('regular', 'vip', 'backstage', 'camarote');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('pix', 'credit_card', 'boleto');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('active', 'used', 'transferred', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "CheckinResult" AS ENUM ('valid', 'invalid_hash', 'invalid_totp', 'already_used', 'wrong_event', 'ticket_cancelled', 'offline_valid', 'offline_conflict');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('email', 'push', 'in_app');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'push', 'in_app');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('MEI', 'ME', 'EPP', 'LTDA', 'SA', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "AsaasAccountStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "DocumentsStatus" AS ENUM ('pending', 'sent', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "GuestListType" AS ENUM ('free', 'vip', 'backstage', 'press');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "TicketPriceType" AS ENUM ('inteira', 'meia_estudante', 'meia_idoso', 'meia_pcd', 'meia_jovem', 'meia_social', 'cortesia', 'promocional', 'crianca');

-- CreateEnum
CREATE TYPE "GuestListStatus" AS ENUM ('active', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "GuestEntryStatus" AS ENUM ('pending', 'confirmed', 'checked_in', 'rejected', 'no_show');

-- CreateEnum
CREATE TYPE "PromoterTier" AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- CreateEnum
CREATE TYPE "CourtesyStatus" AS ENUM ('courtesy_pending', 'approved', 'issued', 'courtesy_used', 'courtesy_expired', 'revoked');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('digital', 'wristband', 'card');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('wallet_active', 'blocked', 'refund_pending', 'wallet_refunded', 'wallet_expired');

-- CreateEnum
CREATE TYPE "CashlessTransactionType" AS ENUM ('topup', 'purchase', 'cashless_refund', 'wallet_transfer', 'cashout', 'courtesy_credit');

-- CreateEnum
CREATE TYPE "CashlessTransactionStatus" AS ENUM ('tx_completed', 'tx_pending', 'tx_failed', 'reversed');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('beer', 'drink', 'cocktail', 'soft_drink', 'water', 'food', 'snack', 'merch', 'service', 'other');

-- CreateEnum
CREATE TYPE "POSType" AS ENUM ('bar', 'mobile', 'totem', 'vip_lounge', 'food_truck', 'backstage_pos');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('stock_entry', 'sale', 'loss', 'adjustment', 'stock_transfer');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('coordinator', 'checkin_op', 'cashier', 'bartender', 'security_staff', 'promoter_op', 'vip_host', 'runner', 'medic', 'tech', 'custom');

-- CreateEnum
CREATE TYPE "StoreItemType" AS ENUM ('upgrade', 'merchandise', 'parking', 'locker', 'fast_lane', 'meet_greet', 'after_party', 'food_combo', 'cashless_credit');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "cpf" VARCHAR(14) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "totp_secret" VARCHAR(64),
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "device_fingerprints" JSONB NOT NULL DEFAULT '[]',
    "role" "UserRole" NOT NULL DEFAULT 'consumer',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(18),
    "company_type" "CompanyType" NOT NULL,
    "asaas_account_id" VARCHAR(100) NOT NULL,
    "asaas_api_key_encrypted" TEXT NOT NULL,
    "asaas_wallet_id" VARCHAR(100) NOT NULL,
    "asaas_status" "AsaasAccountStatus" NOT NULL DEFAULT 'pending',
    "onboarding_url" VARCHAR(500),
    "platform_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "bank_account" JSONB,
    "documents_status" "DocumentsStatus" NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "producer_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" VARCHAR(500) NOT NULL,
    "category" "EventCategory" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "venue_name" VARCHAR(255) NOT NULL,
    "venue_address" TEXT NOT NULL,
    "venue_lat" DECIMAL(10,8),
    "venue_lng" DECIMAL(11,8),
    "venue_capacity" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "doors_open_at" TIMESTAMPTZ,
    "cover_image_url" VARCHAR(500) NOT NULL,
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "age_rating" VARCHAR(10) NOT NULL DEFAULT 'Livre',
    "dress_code" VARCHAR(100),
    "is_open_bar" BOOLEAN NOT NULL DEFAULT false,
    "lineup" JSONB NOT NULL DEFAULT '[]',
    "rules" TEXT,
    "max_tickets_per_cpf" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "type" "BatchType" NOT NULL DEFAULT 'regular',
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "auto_switch" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "total_cents" INTEGER NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "asaas_payment_id" VARCHAR(100),
    "asaas_invoice_url" VARCHAR(500),
    "pix_qr_code" TEXT,
    "pix_copy_paste" TEXT,
    "paid_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT NOT NULL,
    "device_fingerprint" VARCHAR(100) NOT NULL,
    "risk_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "original_buyer_id" UUID NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'active',
    "ticket_hash" VARCHAR(64) NOT NULL,
    "totp_secret" VARCHAR(64) NOT NULL,
    "holder_name" VARCHAR(255) NOT NULL,
    "holder_cpf" VARCHAR(14) NOT NULL,
    "holder_email" VARCHAR(255) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "checked_in_at" TIMESTAMPTZ,
    "checked_in_by" UUID,
    "checked_in_device" VARCHAR(100),
    "transfer_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'pending',
    "otp_code" VARCHAR(6),
    "otp_expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "device_id" VARCHAR(100) NOT NULL,
    "result" "CheckinResult" NOT NULL,
    "metadata" JSONB,
    "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "conversion_count" INTEGER NOT NULL DEFAULT 0,
    "commission_percent" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "organization" DECIMAL(2,1),
    "sound" DECIMAL(2,1),
    "bar" DECIMAL(2,1),
    "experience" DECIMAL(2,1),
    "comment" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_splits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "recipient_type" VARCHAR(50) NOT NULL,
    "recipient_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "asaas_split_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "cpf" VARCHAR(14),
    "list_type" "GuestListType" NOT NULL,
    "invited_by" UUID,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_price_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "price_type" "TicketPriceType" NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "quantity" INTEGER,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "requires_doc" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_id" UUID,
    "resource" VARCHAR(50) NOT NULL,
    "actions" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courtesies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "batch_id" UUID,
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "recipient_name" VARCHAR(255) NOT NULL,
    "recipient_cpf" VARCHAR(14),
    "recipient_email" VARCHAR(255),
    "reason" VARCHAR(500),
    "status" "CourtesyStatus" NOT NULL DEFAULT 'courtesy_pending',
    "ticket_id" UUID,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,
    "issued_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courtesies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "batch_id" UUID,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_list_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "max_guests_total" INTEGER NOT NULL,
    "max_guests_per_promoter" INTEGER,
    "max_plus_ones" INTEGER NOT NULL DEFAULT 1,
    "requires_cpf" BOOLEAN NOT NULL DEFAULT true,
    "requires_phone" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve" BOOLEAN NOT NULL DEFAULT true,
    "closes_at" TIMESTAMPTZ,
    "free_until_hour" VARCHAR(5),
    "discount_percent" DECIMAL(5,2),
    "discount_until_hour" VARCHAR(5),
    "welcome_message" TEXT,
    "status" "GuestListStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_list_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promoters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "instagram" VARCHAR(100),
    "whatsapp" VARCHAR(20),
    "tier" "PromoterTier" NOT NULL DEFAULT 'bronze',
    "total_guests" INTEGER NOT NULL DEFAULT 0,
    "total_checkins" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promoters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promoter_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "promoter_id" UUID NOT NULL,
    "guest_list_id" UUID NOT NULL,
    "max_guests" INTEGER,
    "share_link" VARCHAR(100) NOT NULL,
    "qr_code_url" VARCHAR(500),
    "guest_count" INTEGER NOT NULL DEFAULT 0,
    "checkin_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promoter_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guest_list_id" UUID NOT NULL,
    "promoter_id" UUID,
    "assignment_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "cpf" VARCHAR(14),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "plus_ones" INTEGER NOT NULL DEFAULT 0,
    "plus_ones_checked" INTEGER NOT NULL DEFAULT 0,
    "list_type" "GuestListType" NOT NULL,
    "status" "GuestEntryStatus" NOT NULL DEFAULT 'pending',
    "checked_in_at" TIMESTAMPTZ,
    "checked_in_by" UUID,
    "notes" VARCHAR(500),
    "source" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashless_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "min_topup_cents" INTEGER NOT NULL DEFAULT 2000,
    "max_topup_cents" INTEGER NOT NULL DEFAULT 100000,
    "max_wallet_balance" INTEGER NOT NULL DEFAULT 200000,
    "allow_partial_payment" BOOLEAN NOT NULL DEFAULT false,
    "auto_refund_after_event" BOOLEAN NOT NULL DEFAULT true,
    "refund_deadline_days" INTEGER NOT NULL DEFAULT 30,
    "tip_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tip_options" JSONB NOT NULL DEFAULT '[10, 15, 20]',
    "service_charge_percent" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashless_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashless_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ticket_id" UUID,
    "wallet_type" "WalletType" NOT NULL,
    "wallet_code" VARCHAR(100) NOT NULL,
    "balance_cents" INTEGER NOT NULL DEFAULT 0,
    "total_topup_cents" INTEGER NOT NULL DEFAULT 0,
    "total_spent_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "WalletStatus" NOT NULL DEFAULT 'wallet_active',
    "nfc_tag_id" VARCHAR(100),
    "activated_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashless_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashless_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "pos_id" UUID,
    "operator_id" UUID,
    "type" "CashlessTransactionType" NOT NULL,
    "status" "CashlessTransactionStatus" NOT NULL DEFAULT 'tx_completed',
    "amount_cents" INTEGER NOT NULL,
    "tip_cents" INTEGER NOT NULL DEFAULT 0,
    "balance_after" INTEGER NOT NULL,
    "items" JSONB,
    "payment_method" "PaymentMethod",
    "asaas_payment_id" VARCHAR(100),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashless_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_of_sale" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "POSType" NOT NULL,
    "location" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_of_sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_operators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pos_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pin" VARCHAR(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pos_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "category" "ProductCategory" NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "image_url" VARCHAR(500),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "stock_qty" INTEGER,
    "sold_qty" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pos_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "operator_id" UUID,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "cpf" VARCHAR(14),
    "phone" VARCHAR(20),
    "role" "StaffRole" NOT NULL,
    "custom_role" VARCHAR(100),
    "access_areas" JSONB NOT NULL DEFAULT '[]',
    "shift_start" TIMESTAMPTZ,
    "shift_end" TIMESTAMPTZ,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "batch_types" JSONB NOT NULL DEFAULT '[]',
    "pos_ids" JSONB NOT NULL DEFAULT '[]',
    "map_coords" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "type" "StoreItemType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "quantity" INTEGER,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_form_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_form_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "ticket_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255),
    "job_title" VARCHAR(100),
    "category" VARCHAR(100),
    "photo_url" VARCHAR(500),
    "qr_code" VARCHAR(100) NOT NULL,
    "custom_fields" JSONB,
    "printed_at" TIMESTAMPTZ,
    "checked_in_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "holder_name" VARCHAR(255) NOT NULL,
    "hours" INTEGER,
    "pdf_url" VARCHAR(500),
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_insurance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "policy_number" VARCHAR(100),
    "coverage_type" VARCHAR(100) NOT NULL,
    "coverage_amount" INTEGER NOT NULL,
    "premium_cents" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_office_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "initial_cash" INTEGER NOT NULL DEFAULT 0,
    "final_cash" INTEGER,
    "total_sales" INTEGER NOT NULL DEFAULT 0,
    "total_tickets" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_office_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "producers_user_id_key" ON "producers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "producers_cnpj_key" ON "producers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "producers_asaas_account_id_key" ON "producers"("asaas_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "idx_events_search" ON "events"("status", "starts_at", "category");

-- CreateIndex
CREATE INDEX "idx_events_slug" ON "events"("slug");

-- CreateIndex
CREATE INDEX "idx_orders_user" ON "orders"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_asaas" ON "orders"("asaas_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_hash_key" ON "tickets"("ticket_hash");

-- CreateIndex
CREATE INDEX "idx_tickets_hash" ON "tickets"("ticket_hash");

-- CreateIndex
CREATE INDEX "idx_tickets_holder" ON "tickets"("holder_id", "status");

-- CreateIndex
CREATE INDEX "idx_tickets_event" ON "tickets"("event_id", "status");

-- CreateIndex
CREATE INDEX "idx_checkin_event" ON "checkin_logs"("event_id", "scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_code_key" ON "affiliate_links"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_event_id_code_key" ON "coupons"("event_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "event_reviews_event_id_user_id_key" ON "event_reviews"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_event_id_key" ON "favorites"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_sent_at_idx" ON "notifications"("user_id", "read", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_log"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_price_rules_batch_id_price_type_idx" ON "ticket_price_rules"("batch_id", "price_type");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_user_id_event_id_resource_key" ON "permissions"("user_id", "event_id", "resource");

-- CreateIndex
CREATE INDEX "courtesies_event_id_status_idx" ON "courtesies"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlists_event_id_user_id_key" ON "waitlists"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guest_list_configs_event_id_key" ON "guest_list_configs"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "promoters_user_id_key" ON "promoters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "promoters_slug_key" ON "promoters"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "promoter_assignments_share_link_key" ON "promoter_assignments"("share_link");

-- CreateIndex
CREATE UNIQUE INDEX "promoter_assignments_promoter_id_guest_list_id_key" ON "promoter_assignments"("promoter_id", "guest_list_id");

-- CreateIndex
CREATE INDEX "guest_entries_guest_list_id_status_idx" ON "guest_entries"("guest_list_id", "status");

-- CreateIndex
CREATE INDEX "guest_entries_cpf_idx" ON "guest_entries"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "cashless_configs_event_id_key" ON "cashless_configs"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "cashless_wallets_wallet_code_key" ON "cashless_wallets"("wallet_code");

-- CreateIndex
CREATE INDEX "cashless_wallets_wallet_code_idx" ON "cashless_wallets"("wallet_code");

-- CreateIndex
CREATE INDEX "cashless_wallets_nfc_tag_id_idx" ON "cashless_wallets"("nfc_tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "cashless_wallets_event_id_user_id_key" ON "cashless_wallets"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "cashless_transactions_wallet_id_created_at_idx" ON "cashless_transactions"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cashless_transactions_pos_id_created_at_idx" ON "cashless_transactions"("pos_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pos_operators_pos_id_user_id_key" ON "pos_operators"("pos_id", "user_id");

-- CreateIndex
CREATE INDEX "pos_products_pos_id_category_is_available_idx" ON "pos_products"("pos_id", "category", "is_available");

-- CreateIndex
CREATE INDEX "stock_movements_pos_id_product_id_created_at_idx" ON "stock_movements"("pos_id", "product_id", "created_at");

-- CreateIndex
CREATE INDEX "event_staff_event_id_role_idx" ON "event_staff"("event_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_qr_code_key" ON "credentials"("qr_code");

-- CreateIndex
CREATE INDEX "credentials_event_id_idx" ON "credentials"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "event_insurance_event_id_key" ON "event_insurance"("event_id");

-- AddForeignKey
ALTER TABLE "producers" ADD CONSTRAINT "producers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_batches" ADD CONSTRAINT "ticket_batches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ticket_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_original_buyer_id_fkey" FOREIGN KEY ("original_buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_logs" ADD CONSTRAINT "checkin_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_logs" ADD CONSTRAINT "checkin_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_logs" ADD CONSTRAINT "checkin_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reviews" ADD CONSTRAINT "event_reviews_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reviews" ADD CONSTRAINT "event_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_splits" ADD CONSTRAINT "payment_splits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_lists" ADD CONSTRAINT "guest_lists_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_media" ADD CONSTRAINT "event_media_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_price_rules" ADD CONSTRAINT "ticket_price_rules_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ticket_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courtesies" ADD CONSTRAINT "courtesies_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list_configs" ADD CONSTRAINT "guest_list_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoters" ADD CONSTRAINT "promoters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_assignments" ADD CONSTRAINT "promoter_assignments_promoter_id_fkey" FOREIGN KEY ("promoter_id") REFERENCES "promoters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_assignments" ADD CONSTRAINT "promoter_assignments_guest_list_id_fkey" FOREIGN KEY ("guest_list_id") REFERENCES "guest_list_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_entries" ADD CONSTRAINT "guest_entries_guest_list_id_fkey" FOREIGN KEY ("guest_list_id") REFERENCES "guest_list_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_entries" ADD CONSTRAINT "guest_entries_promoter_id_fkey" FOREIGN KEY ("promoter_id") REFERENCES "promoters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_entries" ADD CONSTRAINT "guest_entries_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "promoter_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashless_configs" ADD CONSTRAINT "cashless_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashless_wallets" ADD CONSTRAINT "cashless_wallets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashless_wallets" ADD CONSTRAINT "cashless_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashless_transactions" ADD CONSTRAINT "cashless_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "cashless_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashless_transactions" ADD CONSTRAINT "cashless_transactions_pos_id_fkey" FOREIGN KEY ("pos_id") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_operators" ADD CONSTRAINT "pos_operators_pos_id_fkey" FOREIGN KEY ("pos_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_operators" ADD CONSTRAINT "pos_operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_products" ADD CONSTRAINT "pos_products_pos_id_fkey" FOREIGN KEY ("pos_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_pos_id_fkey" FOREIGN KEY ("pos_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_areas" ADD CONSTRAINT "event_areas_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_items" ADD CONSTRAINT "store_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_form_fields" ADD CONSTRAINT "event_form_fields_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_form_responses" ADD CONSTRAINT "ticket_form_responses_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "event_form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_insurance" ADD CONSTRAINT "event_insurance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_office_sessions" ADD CONSTRAINT "box_office_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_office_sessions" ADD CONSTRAINT "box_office_sessions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

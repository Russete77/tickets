-- ============================================================
-- Migration: organizations_and_ledger
-- Data: 2026-05-03
-- Auditoria CTO 2026-05 — gaps 4.1, 4.5, 4.10
--
-- Adiciona:
--   - Multi-tenancy (organizations + organization_members)
--   - Ledger contábil double-entry (ledger_accounts + ledger_entries)
--   - Webhook outbound + API pública (webhook_subscriptions, webhook_deliveries, api_keys)
--   - Enums auxiliares
--
-- Backward-compat: mantém producers e events.producer_id intactos.
-- O backfill de organizations a partir de producers é separado (script TS).
-- ============================================================

-- ====================
-- ENUMS
-- ====================

CREATE TYPE "OrgType" AS ENUM ('producer', 'venue', 'agency', 'network');

CREATE TYPE "OrgMemberRole" AS ENUM ('owner', 'admin', 'finance', 'operator', 'promoter', 'viewer');

CREATE TYPE "LedgerAccountType" AS ENUM (
  'wallet',
  'event_revenue',
  'pos_sales',
  'platform_fee',
  'refund_clearing',
  'tip_pool',
  'service_charge',
  'bank_settlement'
);

CREATE TYPE "WebhookEventType" AS ENUM (
  'event_published',
  'event_updated',
  'order_paid',
  'order_refunded',
  'ticket_issued',
  'ticket_checked_in',
  'ticket_transferred',
  'cashless_topup',
  'cashless_purchase',
  'cashless_refund',
  'guest_checked_in'
);

CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('pending', 'delivered', 'failed', 'abandoned');

CREATE TYPE "PaymentGatewayProvider" AS ENUM ('asaas', 'pagarme', 'mercadopago', 'stripe');

-- ====================
-- ORGANIZATIONS
-- ====================

CREATE TABLE "organizations" (
  "id"                  UUID            NOT NULL DEFAULT gen_random_uuid(),
  "name"                VARCHAR(255)    NOT NULL,
  "slug"                VARCHAR(100)    NOT NULL,
  "type"                "OrgType"       NOT NULL DEFAULT 'producer',
  "cnpj"                VARCHAR(18),
  "asaas_account_id"    VARCHAR(100),
  "platform_fee_percent" DECIMAL(5,2)   NOT NULL DEFAULT 10.00,
  "domain"              VARCHAR(255),
  "branding"            JSONB,
  "default_currency"    VARCHAR(3)      NOT NULL DEFAULT 'BRL',
  "default_locale"      VARCHAR(10)     NOT NULL DEFAULT 'pt-BR',
  "legacy_producer_id"  UUID,
  "created_at"          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organizations_cnpj_key" ON "organizations"("cnpj");
CREATE UNIQUE INDEX "organizations_asaas_account_id_key" ON "organizations"("asaas_account_id");
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");
CREATE UNIQUE INDEX "organizations_legacy_producer_id_key" ON "organizations"("legacy_producer_id");
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

CREATE TABLE "organization_members" (
  "organization_id" UUID            NOT NULL,
  "user_id"         UUID            NOT NULL,
  "role"            "OrgMemberRole" NOT NULL,
  "invited_by"      UUID,
  "accepted_at"     TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id", "user_id"),
  CONSTRAINT "organization_members_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE INDEX "organization_members_org_role_idx" ON "organization_members"("organization_id", "role");

-- ====================
-- LEDGER
-- ====================

CREATE TABLE "ledger_accounts" (
  "id"               UUID                NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID                NOT NULL,
  "event_id"         UUID,
  "wallet_id"        UUID,
  "type"             "LedgerAccountType" NOT NULL,
  "currency"         VARCHAR(3)          NOT NULL DEFAULT 'BRL',
  "balance_cents"    BIGINT              NOT NULL DEFAULT 0,
  "created_at"       TIMESTAMPTZ         NOT NULL DEFAULT now(),
  CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ledger_accounts_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ledger_accounts_wallet_id_key" ON "ledger_accounts"("wallet_id");
CREATE INDEX "ledger_accounts_org_event_type_idx" ON "ledger_accounts"("organization_id", "event_id", "type");
CREATE INDEX "ledger_accounts_event_idx" ON "ledger_accounts"("event_id");

CREATE TABLE "ledger_entries" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "account_id"     UUID         NOT NULL,
  "group_id"       UUID         NOT NULL,
  "source_type"    VARCHAR(50)  NOT NULL,
  "source_id"      UUID         NOT NULL,
  "direction"      VARCHAR(6)   NOT NULL,
  "amount_cents"   BIGINT       NOT NULL,
  "balance_after"  BIGINT       NOT NULL,
  "currency"       VARCHAR(3)   NOT NULL DEFAULT 'BRL',
  "description"    VARCHAR(500),
  "metadata"       JSONB,
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ledger_entries_account_fk" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id"),
  CONSTRAINT "ledger_entries_direction_chk" CHECK ("direction" IN ('debit', 'credit')),
  CONSTRAINT "ledger_entries_amount_positive_chk" CHECK ("amount_cents" > 0)
);

CREATE INDEX "ledger_entries_account_created_idx" ON "ledger_entries"("account_id", "created_at" DESC);
CREATE INDEX "ledger_entries_group_idx" ON "ledger_entries"("group_id");
CREATE INDEX "ledger_entries_source_idx" ON "ledger_entries"("source_type", "source_id");

-- ====================
-- WEBHOOKS OUTBOUND + API KEYS
-- ====================

CREATE TABLE "webhook_subscriptions" (
  "id"               UUID                 NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID                 NOT NULL,
  "url"              VARCHAR(500)         NOT NULL,
  "secret"           VARCHAR(128)         NOT NULL,
  "event_types"      "WebhookEventType"[] NOT NULL DEFAULT '{}',
  "is_active"        BOOLEAN              NOT NULL DEFAULT true,
  "description"      VARCHAR(255),
  "created_at"       TIMESTAMPTZ          NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ          NOT NULL DEFAULT now(),
  CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_subscriptions_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE INDEX "webhook_subscriptions_org_active_idx" ON "webhook_subscriptions"("organization_id", "is_active");

CREATE TABLE "webhook_deliveries" (
  "id"               UUID                    NOT NULL DEFAULT gen_random_uuid(),
  "subscription_id"  UUID                    NOT NULL,
  "event_type"       "WebhookEventType"      NOT NULL,
  "payload"          JSONB                   NOT NULL,
  "status"           "WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
  "attempts"         INTEGER                 NOT NULL DEFAULT 0,
  "last_error"       TEXT,
  "response_status"  INTEGER,
  "next_attempt_at"  TIMESTAMPTZ,
  "delivered_at"     TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ             NOT NULL DEFAULT now(),
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_deliveries_sub_fk" FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE
);

CREATE INDEX "webhook_deliveries_status_next_idx" ON "webhook_deliveries"("status", "next_attempt_at");
CREATE INDEX "webhook_deliveries_sub_created_idx" ON "webhook_deliveries"("subscription_id", "created_at" DESC);

CREATE TABLE "api_keys" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID         NOT NULL,
  "name"             VARCHAR(100) NOT NULL,
  "prefix"           VARCHAR(12)  NOT NULL,
  "hashed_key"       VARCHAR(128) NOT NULL,
  "scopes"           TEXT[]       NOT NULL DEFAULT '{}',
  "last_used_at"     TIMESTAMPTZ,
  "revoked_at"       TIMESTAMPTZ,
  "expires_at"       TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "api_keys_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "api_keys_prefix_key" ON "api_keys"("prefix");
CREATE UNIQUE INDEX "api_keys_hashed_key_key" ON "api_keys"("hashed_key");
CREATE INDEX "api_keys_org_revoked_idx" ON "api_keys"("organization_id", "revoked_at");

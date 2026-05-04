-- ============================================================
-- Migration: event_org_and_order_gateway
-- Data: 2026-05-03
-- Auditoria CTO 2026-05 — wire-up phase
--
-- Adiciona:
--   - events.organization_id (nullable durante migração)
--   - orders.gateway_provider, orders.gateway_payment_id
--   - Backfill via SQL (executar APÓS rodar scripts/backfill-organizations.ts)
--
-- Backward-compat: events.producer_id e orders.asaas_payment_id continuam existindo.
-- ============================================================

-- ====================
-- EVENTS — organization_id
-- ====================

ALTER TABLE "events" ADD COLUMN "organization_id" UUID;

ALTER TABLE "events"
  ADD CONSTRAINT "events_organization_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;

CREATE INDEX "events_organization_id_idx" ON "events"("organization_id");

-- Backfill: events.organization_id ← producer.user_id → producer.id → organization.legacy_producer_id
-- Executa apenas se a tabela producers existir (rodar depois do backfill-organizations script).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producers') THEN
    UPDATE events e
    SET organization_id = o.id
    FROM producers p
    INNER JOIN organizations o ON o.legacy_producer_id = p.id
    WHERE e.producer_id = p.user_id
      AND e.organization_id IS NULL;
  END IF;
END $$;

-- ====================
-- ORDERS — multi-gateway
-- ====================

ALTER TABLE "orders"
  ADD COLUMN "gateway_provider" "PaymentGatewayProvider",
  ADD COLUMN "gateway_payment_id" VARCHAR(100),
  ADD COLUMN "gateway_raw" JSONB;

CREATE INDEX "orders_gateway_payment_idx" ON "orders"("gateway_provider", "gateway_payment_id");

-- Backfill: pedidos legados são todos Asaas.
UPDATE "orders"
SET gateway_provider = 'asaas',
    gateway_payment_id = asaas_payment_id
WHERE asaas_payment_id IS NOT NULL
  AND gateway_payment_id IS NULL;

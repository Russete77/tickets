-- ============================================================
-- Migration: event_drop_legacy_producer
-- Data: 2026-06-01 (a aplicar APÓS validar dual-state em produção por 30 dias)
-- Auditoria CTO 2026-05 — gap 4.1 fase final
--
-- Esta migration finaliza a transição multi-tenant:
--   1. Garante que TODOS os events têm organizationId preenchido
--   2. Marca organization_id como NOT NULL
--   3. Remove a coluna producer_id legada
--
-- ⚠️ ATENÇÃO: rodar SOMENTE depois de:
--   - Backfill ter populado 100% dos eventos
--   - Aplicação ter dual-write ativo por ≥30 dias
--   - Reads já estarem todos via organizationId
--   - Plano de rollback aprovado pelo time
--
-- Como validar antes:
--   SELECT COUNT(*) FROM events WHERE organization_id IS NULL;
--   -- deve retornar 0
-- ============================================================

-- 1. Defesa: aborta se houver event sem organizationId
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM events WHERE organization_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Existem % events sem organization_id. Rode backfill antes.', orphan_count;
  END IF;
END $$;

-- 2. Marca organization_id como NOT NULL
ALTER TABLE "events" ALTER COLUMN "organization_id" SET NOT NULL;

-- 3. Drop FK legada (caso exista) e a coluna
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_producer_id_fkey";
DROP INDEX IF EXISTS "idx_events_producer_id";

-- Manter producer_id por mais 1 release como buffer (DEPRECATED).
-- Próxima migration removerá efetivamente. Por enquanto:
COMMENT ON COLUMN "events"."producer_id" IS
  'DEPRECATED — use organization_id. Será removido na próxima release.';

-- Para remover de fato (próxima migration):
-- ALTER TABLE "events" DROP COLUMN "producer_id";

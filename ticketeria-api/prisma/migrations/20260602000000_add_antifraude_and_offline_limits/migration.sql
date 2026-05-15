-- Antifraude: device fingerprint por ticket (nullable: tickets legados ficam null)
ALTER TABLE "tickets" ADD COLUMN "device_fp" VARCHAR(128);
CREATE INDEX "tickets_device_fp_idx" ON "tickets"("device_fp");

-- Cashless wallet: limite offline configurável (default R$ 200 = 20000 cents — PRD §4.4.1)
-- + version para optimistic locking em débitos/recargas concorrentes
ALTER TABLE "cashless_wallets"
  ADD COLUMN "offline_limit" INTEGER NOT NULL DEFAULT 20000,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

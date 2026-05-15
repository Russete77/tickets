CREATE TYPE "PosDeviceStatus" AS ENUM ('pending', 'active', 'revoked');

CREATE TABLE "pos_devices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pos_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "device_token_hash" VARCHAR(128),
  "token_prefix" VARCHAR(12),
  "pairing_code" VARCHAR(8),
  "pairing_code_expires_at" TIMESTAMPTZ,
  "status" "PosDeviceStatus" NOT NULL DEFAULT 'pending',
  "paired_at" TIMESTAMPTZ,
  "last_seen_at" TIMESTAMPTZ,
  "app_version" VARCHAR(20),
  "last_ip" VARCHAR(45),
  "created_by" UUID NOT NULL,
  "revoked_by" UUID,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "pos_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pos_devices_pairing_code_key" ON "pos_devices"("pairing_code");
CREATE INDEX "pos_devices_pos_id_idx" ON "pos_devices"("pos_id");
CREATE INDEX "pos_devices_organization_id_idx" ON "pos_devices"("organization_id");
CREATE INDEX "pos_devices_device_token_hash_idx" ON "pos_devices"("device_token_hash");

ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_pos_id_fkey"
  FOREIGN KEY ("pos_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

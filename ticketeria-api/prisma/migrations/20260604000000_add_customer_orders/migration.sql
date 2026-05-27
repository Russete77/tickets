CREATE TYPE "CustomerOrderStatus" AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');

CREATE TABLE "customer_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "pos_id" UUID NOT NULL,
  "wallet_tx_id" UUID,
  "status" "CustomerOrderStatus" NOT NULL DEFAULT 'pending',
  "total_cents" INTEGER NOT NULL,
  "items" JSONB NOT NULL,
  "pickup_code" VARCHAR(8) NOT NULL,
  "preparing_at" TIMESTAMPTZ,
  "ready_at" TIMESTAMPTZ,
  "delivered_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_orders_user_id_idx" ON "customer_orders"("user_id");
CREATE INDEX "customer_orders_pos_id_status_idx" ON "customer_orders"("pos_id", "status");
CREATE INDEX "customer_orders_event_id_idx" ON "customer_orders"("event_id");

ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_pos_id_fkey"
  FOREIGN KEY ("pos_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

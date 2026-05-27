-- Engine 5 Sprint 3 — Mapa do venue
CREATE TABLE "venue_maps" (
  "id"         uuid           NOT NULL DEFAULT gen_random_uuid(),
  "event_id"   uuid           NOT NULL,
  "svg_url"    varchar(500),
  "zones"      jsonb          NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz    NOT NULL DEFAULT now(),
  "updated_at" timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT "venue_maps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "venue_maps_event_id_key" UNIQUE ("event_id"),
  CONSTRAINT "venue_maps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE
);

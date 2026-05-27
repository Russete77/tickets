-- Engine 5 Sprint 5+6 — Social (Friendship) + Gamificação (Achievement)

CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted', 'blocked');

CREATE TABLE "friendships" (
  "id"           uuid              NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" uuid              NOT NULL,
  "addressee_id" uuid              NOT NULL,
  "status"       "FriendshipStatus" NOT NULL DEFAULT 'pending',
  "created_at"   timestamptz       NOT NULL DEFAULT now(),
  "updated_at"   timestamptz       NOT NULL DEFAULT now(),

  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friendships_requester_addressee_unique" UNIQUE ("requester_id", "addressee_id"),
  CONSTRAINT "friendships_requester_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "friendships_addressee_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "friendships_no_self" CHECK ("requester_id" <> "addressee_id")
);
CREATE INDEX "friendships_addressee_status_idx" ON "friendships"("addressee_id", "status");

CREATE TABLE "achievements" (
  "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
  "key"         varchar(64)   NOT NULL,
  "name"        varchar(120)  NOT NULL,
  "description" varchar(500)  NOT NULL,
  "icon_url"    varchar(500),
  "tier"        integer       NOT NULL DEFAULT 1,
  "created_at"  timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT "achievements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "achievements_key_unique" UNIQUE ("key")
);

CREATE TABLE "user_achievements" (
  "id"             uuid         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        uuid         NOT NULL,
  "achievement_id" uuid         NOT NULL,
  "progress"       integer      NOT NULL DEFAULT 0,
  "unlocked_at"    timestamptz,
  "created_at"     timestamptz  NOT NULL DEFAULT now(),
  "updated_at"     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_achievements_user_achievement_unique" UNIQUE ("user_id", "achievement_id"),
  CONSTRAINT "user_achievements_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_achievements_achievement_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE
);
CREATE INDEX "user_achievements_user_unlocked_idx" ON "user_achievements"("user_id", "unlocked_at");

-- CreateEnum
CREATE TYPE "trip_state" AS ENUM ('CREATED', 'OPEN_FOR_REGISTRATION', 'CHECK_IN', 'ACTIVE', 'EXIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "participation_state" AS ENUM ('NOT_REGISTERED', 'REGISTERED', 'CHECKED_IN', 'ACTIVE', 'CHECKED_OUT', 'NO_SHOW', 'LEFT_EARLY');

-- CreateEnum
CREATE TYPE "transition_actor_type" AS ENUM ('USER', 'SCHEDULER', 'RULE');

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "resort_name" TEXT NOT NULL,
    "resort_time_zone" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "cost_cents" INTEGER NOT NULL,
    "state" "trip_state" NOT NULL DEFAULT 'CREATED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "registration_opens_at" TIMESTAMPTZ(3) NOT NULL,
    "registration_closes_at" TIMESTAMPTZ(3) NOT NULL,
    "check_in_starts_at" TIMESTAMPTZ(3) NOT NULL,
    "session_starts_at" TIMESTAMPTZ(3) NOT NULL,
    "exit_starts_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_geofences" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "trip_geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_transitions" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "from_state" "trip_state" NOT NULL,
    "to_state" "trip_state" NOT NULL,
    "actor_type" "transition_actor_type" NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "op_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_memberships" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "participation" "participation_state" NOT NULL DEFAULT 'REGISTERED',
    "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registered_by_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "trip_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_state_idx" ON "trips"("state");

-- CreateIndex
CREATE INDEX "trips_starts_at_idx" ON "trips"("starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "trip_geofences_trip_id_key" ON "trip_geofences"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_transitions_op_id_key" ON "trip_transitions"("op_id");

-- CreateIndex
CREATE INDEX "trip_transitions_trip_id_idx" ON "trip_transitions"("trip_id");

-- CreateIndex
CREATE INDEX "trip_memberships_user_id_idx" ON "trip_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_memberships_trip_id_user_id_key" ON "trip_memberships"("trip_id", "user_id");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_geofences" ADD CONSTRAINT "trip_geofences_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_transitions" ADD CONSTRAINT "trip_transitions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memberships" ADD CONSTRAINT "trip_memberships_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memberships" ADD CONSTRAINT "trip_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memberships" ADD CONSTRAINT "trip_memberships_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

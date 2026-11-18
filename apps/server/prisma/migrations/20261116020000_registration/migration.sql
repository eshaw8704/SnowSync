-- Sprint 4: registration, charges, waitlist, attendance, roster and Sac State SSO.

-- CreateEnum
CREATE TYPE "charge_kind" AS ENUM ('TRIP', 'DUES');

-- CreateEnum
CREATE TYPE "charge_status" AS ENUM ('UNPAID', 'PROCESSING', 'PAID', 'FAILED', 'OVERDUE', 'VOID', 'REFUND_REVIEW', 'REFUNDED', 'NOT_REFUNDED');

-- CreateEnum
CREATE TYPE "check_in_method" AS ENUM ('SELF', 'GEOFENCE', 'OFFICER');

-- CreateEnum
CREATE TYPE "attendance_method" AS ENUM ('SELF', 'OFFICER', 'GEOFENCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "waitlist_status" AS ENUM ('WAITING', 'CONVERTED', 'LEFT');

-- AlterTable
ALTER TABLE "trip_memberships" ADD COLUMN     "cancelled_at" TIMESTAMPTZ(3),
ADD COLUMN     "check_in_method" "check_in_method",
ADD COLUMN     "checked_in_at" TIMESTAMPTZ(3),
ADD COLUMN     "checked_in_by_id" UUID,
ADD COLUMN     "late_minutes" INTEGER;

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "trip_id" UUID,
    "kind" "charge_kind" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" "charge_status" NOT NULL DEFAULT 'UNPAID',
    "due_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "waitlist_status" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" UUID NOT NULL,
    "trip_membership_id" UUID NOT NULL,
    "from_state" "participation_state" NOT NULL,
    "to_state" "participation_state" NOT NULL,
    "method" "attendance_method" NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "late_minutes" INTEGER,
    "op_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_login_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charges_user_id_idx" ON "charges"("user_id");

-- CreateIndex
CREATE INDEX "charges_trip_id_user_id_idx" ON "charges"("trip_id", "user_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_trip_id_status_created_at_idx" ON "waitlist_entries"("trip_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_trip_id_user_id_key" ON "waitlist_entries"("trip_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_op_id_key" ON "attendance_events"("op_id");

-- CreateIndex
CREATE INDEX "attendance_events_trip_membership_id_idx" ON "attendance_events"("trip_membership_id");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_subject_key" ON "user_identities"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "sso_login_codes_code_hash_key" ON "sso_login_codes"("code_hash");

-- CreateIndex
CREATE INDEX "sso_login_codes_user_id_idx" ON "sso_login_codes"("user_id");

-- AddForeignKey
ALTER TABLE "trip_memberships" ADD CONSTRAINT "trip_memberships_checked_in_by_id_fkey" FOREIGN KEY ("checked_in_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_trip_membership_id_fkey" FOREIGN KEY ("trip_membership_id") REFERENCES "trip_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_login_codes" ADD CONSTRAINT "sso_login_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every member already on a priced trip owes an UNPAID trip charge (System Map §08).
INSERT INTO "charges" ("id", "user_id", "trip_id", "kind", "amount_cents", "status", "due_at", "updated_at")
SELECT gen_random_uuid(), m."user_id", t."id", 'TRIP', t."cost_cents", 'UNPAID', t."registration_closes_at", CURRENT_TIMESTAMP
FROM "trip_memberships" m
JOIN "trips" t ON t."id" = m."trip_id"
WHERE t."cost_cents" > 0
  AND t."state" <> 'CANCELLED'
  AND m."participation" IN ('REGISTERED', 'CHECKED_IN', 'ACTIVE', 'CHECKED_OUT', 'LEFT_EARLY');

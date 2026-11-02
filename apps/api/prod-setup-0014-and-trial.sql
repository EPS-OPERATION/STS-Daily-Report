-- STS Daily Report: migration 0014 + trial account (paste into Supabase SQL Editor and Run ONCE)
-- Safe by design: runs in one transaction; stops before changing anything if the database is not at migration 0013.
BEGIN;

DO $guard$
BEGIN
  IF (SELECT max(created_at) FROM drizzle.__drizzle_migrations) IS DISTINCT FROM 1790926866802 THEN
    RAISE EXCEPTION 'Database is not at migration 0013 (already migrated or different version) - nothing was changed';
  END IF;
END
$guard$;

-- ===== 1. Migration 0014 (discipline crews, afternoon manpower) =====
CREATE TABLE "daily_report_crews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"shift" text NOT NULL,
	"discipline" text NOT NULL,
	"thai_male" integer DEFAULT 0 NOT NULL,
	"thai_female" integer DEFAULT 0 NOT NULL,
	"foreign_male" integer DEFAULT 0 NOT NULL,
	"foreign_female" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_report_crews_report_shift_discipline_unique" UNIQUE("report_id","shift","discipline"),
	CONSTRAINT "daily_report_crews_shift_check" CHECK ("daily_report_crews"."shift" IN ('morning', 'evening')),
	CONSTRAINT "daily_report_crews_discipline_check" CHECK ("daily_report_crews"."discipline" IN ('CE', 'ME', 'EE')),
	CONSTRAINT "daily_report_crews_headcount_check" CHECK ("daily_report_crews"."thai_male" >= 0 AND "daily_report_crews"."thai_female" >= 0 AND "daily_report_crews"."foreign_male" >= 0 AND "daily_report_crews"."foreign_female" >= 0)
);

ALTER TABLE "daily_report_positions" DROP CONSTRAINT "daily_report_positions_report_position_unique";
ALTER TABLE "daily_report_allocations" ADD COLUMN "discipline" text DEFAULT 'CE' NOT NULL;
ALTER TABLE "daily_report_positions" ADD COLUMN "shift" text DEFAULT 'morning' NOT NULL;
ALTER TABLE "daily_report_positions" ADD COLUMN "discipline" text DEFAULT 'CE' NOT NULL;
ALTER TABLE "daily_reports" ADD COLUMN "evening_thai_male" integer;
ALTER TABLE "daily_reports" ADD COLUMN "evening_thai_female" integer;
ALTER TABLE "daily_reports" ADD COLUMN "evening_foreign_male" integer;
ALTER TABLE "daily_reports" ADD COLUMN "evening_foreign_female" integer;
ALTER TABLE "daily_report_crews" ADD CONSTRAINT "daily_report_crews_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_report_positions" ADD CONSTRAINT "daily_report_positions_report_shift_disc_position_unique" UNIQUE("report_id","shift","discipline","position");
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_discipline_check" CHECK ("daily_report_allocations"."discipline" IN ('CE', 'ME', 'EE'));
ALTER TABLE "daily_report_positions" ADD CONSTRAINT "daily_report_positions_discipline_check" CHECK ("daily_report_positions"."discipline" IN ('CE', 'ME', 'EE'));
ALTER TABLE "daily_report_positions" ADD CONSTRAINT "daily_report_positions_shift_check" CHECK ("daily_report_positions"."shift" IN ('morning', 'evening'));
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_evening_headcount_check" CHECK (("daily_reports"."evening_thai_male" IS NULL OR "daily_reports"."evening_thai_male" >= 0) AND ("daily_reports"."evening_thai_female" IS NULL OR "daily_reports"."evening_thai_female" >= 0) AND ("daily_reports"."evening_foreign_male" IS NULL OR "daily_reports"."evening_foreign_male" >= 0) AND ("daily_reports"."evening_foreign_female" IS NULL OR "daily_reports"."evening_foreign_female" >= 0));

-- Backfill: rows written before disciplines were split belong to the report's first discipline (CE if none).
UPDATE "daily_report_positions" p SET "discipline" = COALESCE((SELECT r."disciplines"[1] FROM "daily_reports" r WHERE r."id" = p."report_id"), 'CE');
UPDATE "daily_report_allocations" a SET "discipline" = COALESCE((SELECT r."disciplines"[1] FROM "daily_reports" r WHERE r."id" = a."report_id"), 'CE');
INSERT INTO "daily_report_crews" ("report_id", "shift", "discipline", "thai_male", "thai_female", "foreign_male", "foreign_female")
SELECT r."id", 'morning', COALESCE(r."disciplines"[1], 'CE'), r."thai_male", r."thai_female", r."foreign_male", r."foreign_female"
FROM "daily_reports" r WHERE r."morning_status" = 'submitted';

-- ===== 2. Copy of today's data so the trial can be undone later =====
CREATE TABLE "_trial_bak_daily_reports" AS SELECT * FROM "daily_reports";
CREATE TABLE "_trial_bak_daily_report_positions" AS SELECT * FROM "daily_report_positions";
CREATE TABLE "_trial_bak_daily_report_crews" AS SELECT * FROM "daily_report_crews";
CREATE TABLE "_trial_bak_daily_report_allocations" AS SELECT * FROM "daily_report_allocations";
CREATE TABLE "_trial_bak_daily_report_equipment" AS SELECT * FROM "daily_report_equipment";
CREATE TABLE "_trial_bak_daily_report_materials" AS SELECT * FROM "daily_report_materials";
CREATE TABLE "_trial_bak_daily_report_machinery" AS SELECT * FROM "daily_report_machinery";
CREATE TABLE "_trial_bak_daily_report_permits" AS SELECT * FROM "daily_report_permits";
CREATE TABLE "_trial_bak_daily_report_equipment_requests" AS SELECT * FROM "daily_report_equipment_requests";
CREATE TABLE "_trial_bak_daily_report_road_usage" AS SELECT * FROM "daily_report_road_usage";
CREATE TABLE "_trial_bak_daily_report_photos" AS SELECT * FROM "daily_report_photos";
CREATE TABLE "_trial_bak_inspection_requests" AS SELECT * FROM "inspection_requests";
CREATE TABLE "_trial_marker" AS SELECT now() AS started_at, 'trial@sts.local'::text AS trial_user;

-- ===== 3. Trial account: one login that can report for every contractor of the project =====
INSERT INTO users (id, email, display_name, status)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-0000000000f1', 'trial@sts.local', 'Trial (all contractors)', 'active')
ON CONFLICT DO NOTHING;
INSERT INTO contractor_memberships (user_id, contractor_id, status)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-0000000000f1', pc.contractor_id, 'active' FROM project_contractors pc
ON CONFLICT DO NOTHING;

-- ===== 4. Tell drizzle this migration is applied so `bun db:migrate` will not run it again =====
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('20d9cc80d8e31f96211b65ec507d42b12a9a8fa04f102a68a491f9eaef281dc7', 1791359126975);

COMMIT;

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
--> statement-breakpoint
ALTER TABLE "daily_report_positions" DROP CONSTRAINT "daily_report_positions_report_position_unique";--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD COLUMN "discipline" text DEFAULT 'CE' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_positions" ADD COLUMN "shift" text DEFAULT 'morning' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_positions" ADD COLUMN "discipline" text DEFAULT 'CE' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "evening_thai_male" integer;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "evening_thai_female" integer;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "evening_foreign_male" integer;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "evening_foreign_female" integer;--> statement-breakpoint
ALTER TABLE "daily_report_crews" ADD CONSTRAINT "daily_report_crews_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_positions" ADD CONSTRAINT "daily_report_positions_report_shift_disc_position_unique" UNIQUE("report_id","shift","discipline","position");--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_discipline_check" CHECK ("daily_report_allocations"."discipline" IN ('CE', 'ME', 'EE'));--> statement-breakpoint
ALTER TABLE "daily_report_positions" ADD CONSTRAINT "daily_report_positions_discipline_check" CHECK ("daily_report_positions"."discipline" IN ('CE', 'ME', 'EE'));--> statement-breakpoint
ALTER TABLE "daily_report_positions" ADD CONSTRAINT "daily_report_positions_shift_check" CHECK ("daily_report_positions"."shift" IN ('morning', 'evening'));--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_evening_headcount_check" CHECK (("daily_reports"."evening_thai_male" IS NULL OR "daily_reports"."evening_thai_male" >= 0) AND ("daily_reports"."evening_thai_female" IS NULL OR "daily_reports"."evening_thai_female" >= 0) AND ("daily_reports"."evening_foreign_male" IS NULL OR "daily_reports"."evening_foreign_male" >= 0) AND ("daily_reports"."evening_foreign_female" IS NULL OR "daily_reports"."evening_foreign_female" >= 0));
--> statement-breakpoint
-- Backfill: rows written before disciplines were split belong to the report's first discipline (CE if none).
UPDATE "daily_report_positions" p SET "discipline" = COALESCE((SELECT r."disciplines"[1] FROM "daily_reports" r WHERE r."id" = p."report_id"), 'CE');--> statement-breakpoint
UPDATE "daily_report_allocations" a SET "discipline" = COALESCE((SELECT r."disciplines"[1] FROM "daily_reports" r WHERE r."id" = a."report_id"), 'CE');--> statement-breakpoint
INSERT INTO "daily_report_crews" ("report_id", "shift", "discipline", "thai_male", "thai_female", "foreign_male", "foreign_female")
SELECT r."id", 'morning', COALESCE(r."disciplines"[1], 'CE'), r."thai_male", r."thai_female", r."foreign_male", r."foreign_female"
FROM "daily_reports" r WHERE r."morning_status" = 'submitted';

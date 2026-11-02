CREATE TABLE "daily_report_road_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"target_date" date NOT NULL,
	"building_id" uuid NOT NULL,
	"road_location" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_road_usage_window_check" CHECK ("daily_report_road_usage"."start_time" < "daily_report_road_usage"."end_time")
);
--> statement-breakpoint
-- Backfill: rows before 0007 were same-day (morning) requests, so target = report date.
ALTER TABLE "daily_report_machinery" ADD COLUMN "target_date" date;--> statement-breakpoint
UPDATE "daily_report_machinery" SET "target_date" = r."report_date" FROM "daily_reports" r WHERE r."id" = "daily_report_machinery"."report_id";--> statement-breakpoint
ALTER TABLE "daily_report_machinery" ALTER COLUMN "target_date" SET NOT NULL;--> statement-breakpoint
-- Backfill: rows before 0007 were same-day (morning) requests, so target = report date.
ALTER TABLE "daily_report_permits" ADD COLUMN "target_date" date;--> statement-breakpoint
UPDATE "daily_report_permits" SET "target_date" = r."report_date" FROM "daily_reports" r WHERE r."id" = "daily_report_permits"."report_id";--> statement-breakpoint
ALTER TABLE "daily_report_permits" ALTER COLUMN "target_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD CONSTRAINT "daily_report_road_usage_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD CONSTRAINT "daily_report_road_usage_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_road_usage_report_idx" ON "daily_report_road_usage" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "daily_report_road_usage_target_idx" ON "daily_report_road_usage" USING btree ("target_date");--> statement-breakpoint
CREATE INDEX "daily_report_machinery_target_idx" ON "daily_report_machinery" USING btree ("target_date");--> statement-breakpoint
CREATE INDEX "daily_report_permits_target_idx" ON "daily_report_permits" USING btree ("target_date");
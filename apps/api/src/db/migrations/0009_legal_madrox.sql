CREATE TABLE "daily_report_equipment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"target_date" date NOT NULL,
	"building_id" uuid NOT NULL,
	"equipment_type" text NOT NULL,
	"qty" integer NOT NULL,
	"purpose" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_equipment_requests_qty_check" CHECK ("daily_report_equipment_requests"."qty" > 0)
);
--> statement-breakpoint
ALTER TABLE "daily_report_machinery" DROP CONSTRAINT "daily_report_machinery_window_check";--> statement-breakpoint
ALTER TABLE "daily_report_machinery" ALTER COLUMN "start_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_machinery" ALTER COLUMN "end_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_machinery" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "daily_report_equipment_requests" ADD CONSTRAINT "daily_report_equipment_requests_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_equipment_requests" ADD CONSTRAINT "daily_report_equipment_requests_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_equipment_requests_report_idx" ON "daily_report_equipment_requests" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "daily_report_equipment_requests_target_idx" ON "daily_report_equipment_requests" USING btree ("target_date");--> statement-breakpoint
ALTER TABLE "daily_report_machinery" ADD CONSTRAINT "daily_report_machinery_window_check" CHECK (("daily_report_machinery"."start_time" IS NULL AND "daily_report_machinery"."end_time" IS NULL) OR ("daily_report_machinery"."start_time" IS NOT NULL AND "daily_report_machinery"."end_time" IS NOT NULL AND "daily_report_machinery"."start_time" < "daily_report_machinery"."end_time"));
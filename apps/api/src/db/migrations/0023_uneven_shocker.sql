CREATE TABLE "daily_report_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"target_date" date NOT NULL,
	"building_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD COLUMN "high_risk" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD COLUMN "task_name" text;--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD COLUMN "supervisor_name" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "morning_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "evening_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coordination_items" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "daily_report_forecasts" ADD CONSTRAINT "daily_report_forecasts_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_forecasts" ADD CONSTRAINT "daily_report_forecasts_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_forecasts_report_idx" ON "daily_report_forecasts" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "daily_report_forecasts_target_idx" ON "daily_report_forecasts" USING btree ("target_date");
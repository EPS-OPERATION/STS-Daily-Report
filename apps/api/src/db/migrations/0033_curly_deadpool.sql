CREATE TABLE "daily_report_overtime" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	"task" text NOT NULL,
	"workers" integer NOT NULL,
	"hours" numeric(4, 1) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_overtime_workers_check" CHECK ("daily_report_overtime"."workers" >= 1 AND "daily_report_overtime"."workers" <= 1000),
	CONSTRAINT "daily_report_overtime_hours_check" CHECK ("daily_report_overtime"."hours" > 0 AND "daily_report_overtime"."hours" <= 24)
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "ot_man_hours" numeric(8, 1);--> statement-breakpoint
ALTER TABLE "daily_report_overtime" ADD CONSTRAINT "daily_report_overtime_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_overtime" ADD CONSTRAINT "daily_report_overtime_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_overtime_report_idx" ON "daily_report_overtime" USING btree ("report_id");
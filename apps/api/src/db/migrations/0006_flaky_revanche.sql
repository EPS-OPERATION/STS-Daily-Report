CREATE TABLE "daily_report_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"equipment_type" text NOT NULL,
	"qty" integer NOT NULL,
	CONSTRAINT "daily_report_equipment_report_type_unique" UNIQUE("report_id","equipment_type"),
	CONSTRAINT "daily_report_equipment_qty_check" CHECK ("daily_report_equipment"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "daily_report_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"position" text NOT NULL,
	"headcount" integer NOT NULL,
	CONSTRAINT "daily_report_positions_report_position_unique" UNIQUE("report_id","position"),
	CONSTRAINT "daily_report_positions_headcount_check" CHECK ("daily_report_positions"."headcount" > 0)
);
--> statement-breakpoint
CREATE TABLE "inspection_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"inspection_date" date NOT NULL,
	"inspection_time" text NOT NULL,
	"inspection_type" text NOT NULL,
	"work_item" text NOT NULL,
	"location" text,
	"drawing_ref" text,
	"readiness" text DEFAULT 'ready' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"result" text,
	"eps_note" text,
	"created_by" uuid,
	"status_changed_by" uuid,
	"status_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspection_requests_status_check" CHECK ("inspection_requests"."status" IN ('draft', 'requested', 'confirmed', 'inspected', 'closed')),
	CONSTRAINT "inspection_requests_readiness_check" CHECK ("inspection_requests"."readiness" IN ('ready', 'preparing', 'not_ready')),
	CONSTRAINT "inspection_requests_result_check" CHECK ("inspection_requests"."result" IS NULL OR "inspection_requests"."result" IN ('pass', 'fail')),
	CONSTRAINT "inspection_requests_date_check" CHECK ("inspection_requests"."inspection_date" >= "inspection_requests"."report_date")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'contractor' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "end_time" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "work_hours" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "disciplines" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "weather" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "temperature_c" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "humidity_pct" integer;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "accident_occurred" boolean;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "accident_note" text;--> statement-breakpoint
ALTER TABLE "daily_report_equipment" ADD CONSTRAINT "daily_report_equipment_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_positions" ADD CONSTRAINT "daily_report_positions_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_status_changed_by_users_id_fk" FOREIGN KEY ("status_changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspection_requests_project_date_idx" ON "inspection_requests" USING btree ("project_id","inspection_date");--> statement-breakpoint
CREATE INDEX "inspection_requests_contractor_idx" ON "inspection_requests" USING btree ("contractor_id","report_date");--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_work_hours_check" CHECK ("daily_reports"."work_hours" IS NULL OR ("daily_reports"."work_hours" >= 0 AND "daily_reports"."work_hours" <= 24));--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_humidity_check" CHECK ("daily_reports"."humidity_pct" IS NULL OR ("daily_reports"."humidity_pct" BETWEEN 0 AND 100));--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_weather_check" CHECK ("daily_reports"."weather" IS NULL OR "daily_reports"."weather" IN ('thunderstorm', 'rain', 'hot', 'windy', 'normal'));
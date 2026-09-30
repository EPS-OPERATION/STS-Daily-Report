CREATE TABLE "buildings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_th" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buildings_project_code_unique" UNIQUE("project_id","code"),
	CONSTRAINT "buildings_sort_order_check" CHECK ("buildings"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "daily_report_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	"headcount" integer NOT NULL,
	"work_description" text NOT NULL,
	"plan_percent" integer DEFAULT 0 NOT NULL,
	"actual_percent" integer,
	"countermeasure" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_allocations_headcount_check" CHECK ("daily_report_allocations"."headcount" > 0),
	CONSTRAINT "daily_report_allocations_plan_check" CHECK ("daily_report_allocations"."plan_percent" BETWEEN 0 AND 100),
	CONSTRAINT "daily_report_allocations_actual_check" CHECK ("daily_report_allocations"."actual_percent" IS NULL OR "daily_report_allocations"."actual_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "daily_report_machinery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	"machine_type" text NOT NULL,
	"unit_tag" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_machinery_window_check" CHECK ("daily_report_machinery"."start_time" < "daily_report_machinery"."end_time")
);
--> statement-breakpoint
CREATE TABLE "daily_report_permits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	"permit_type" text NOT NULL,
	"other_label" text,
	"workers" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_permits_workers_check" CHECK ("daily_report_permits"."workers" > 0),
	CONSTRAINT "daily_report_permits_type_check" CHECK ("daily_report_permits"."permit_type" IN ('hot_work', 'height', 'lifting', 'loto', 'confined_space', 'live_electrical', 'other'))
);
--> statement-breakpoint
CREATE TABLE "daily_report_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"category" text NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_photos_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "daily_report_photos_category_check" CHECK ("daily_report_photos"."category" IN ('progress', 'safety'))
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"thai_male" integer DEFAULT 0 NOT NULL,
	"thai_female" integer DEFAULT 0 NOT NULL,
	"foreign_male" integer DEFAULT 0 NOT NULL,
	"foreign_female" integer DEFAULT 0 NOT NULL,
	"morning_status" text DEFAULT 'draft' NOT NULL,
	"morning_submitted_at" timestamp with time zone,
	"morning_submitted_by" uuid,
	"ot_hours" numeric(4, 1),
	"evening_status" text DEFAULT 'draft' NOT NULL,
	"evening_submitted_at" timestamp with time zone,
	"evening_submitted_by" uuid,
	"signature_name" text,
	"signature_data" text,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_reports_project_contractor_date_unique" UNIQUE("project_id","contractor_id","report_date"),
	CONSTRAINT "daily_reports_headcount_check" CHECK ("daily_reports"."thai_male" >= 0 AND "daily_reports"."thai_female" >= 0 AND "daily_reports"."foreign_male" >= 0 AND "daily_reports"."foreign_female" >= 0),
	CONSTRAINT "daily_reports_ot_check" CHECK ("daily_reports"."ot_hours" IS NULL OR ("daily_reports"."ot_hours" >= 0 AND "daily_reports"."ot_hours" <= 24)),
	CONSTRAINT "daily_reports_morning_status_check" CHECK ("daily_reports"."morning_status" IN ('draft', 'submitted')),
	CONSTRAINT "daily_reports_evening_status_check" CHECK ("daily_reports"."evening_status" IN ('draft', 'submitted'))
);
--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_machinery" ADD CONSTRAINT "daily_report_machinery_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_machinery" ADD CONSTRAINT "daily_report_machinery_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD CONSTRAINT "daily_report_permits_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD CONSTRAINT "daily_report_permits_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_photos" ADD CONSTRAINT "daily_report_photos_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_photos" ADD CONSTRAINT "daily_report_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_morning_submitted_by_users_id_fk" FOREIGN KEY ("morning_submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_evening_submitted_by_users_id_fk" FOREIGN KEY ("evening_submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_allocations_report_idx" ON "daily_report_allocations" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "daily_report_allocations_building_idx" ON "daily_report_allocations" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "daily_report_machinery_report_idx" ON "daily_report_machinery" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "daily_report_permits_report_idx" ON "daily_report_permits" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "daily_report_photos_report_idx" ON "daily_report_photos" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "daily_reports_project_date_idx" ON "daily_reports" USING btree ("project_id","report_date");
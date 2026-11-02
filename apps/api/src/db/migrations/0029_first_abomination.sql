CREATE TABLE "daily_report_standard_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"building_id" uuid,
	"default_count" integer DEFAULT 1 NOT NULL,
	"permit_type" text,
	"high_risk" boolean DEFAULT false NOT NULL,
	"task_name" text DEFAULT '' NOT NULL,
	"supervisor_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_standard_items_kind_check" CHECK ("daily_report_standard_items"."kind" in ('activity', 'equipment', 'permit')),
	CONSTRAINT "daily_report_standard_items_label_check" CHECK (char_length("daily_report_standard_items"."label") between 1 and 200),
	CONSTRAINT "daily_report_standard_items_count_check" CHECK ("daily_report_standard_items"."default_count" between 1 and 500),
	CONSTRAINT "daily_report_standard_items_shape_check" CHECK (("daily_report_standard_items"."kind" = 'activity' and "daily_report_standard_items"."building_id" is not null and "daily_report_standard_items"."permit_type" is null)
        or ("daily_report_standard_items"."kind" = 'equipment' and "daily_report_standard_items"."building_id" is null and "daily_report_standard_items"."permit_type" is null)
        or ("daily_report_standard_items"."kind" = 'permit' and "daily_report_standard_items"."building_id" is not null and "daily_report_standard_items"."permit_type" is not null))
);
--> statement-breakpoint
ALTER TABLE "daily_report_standard_items" ADD CONSTRAINT "daily_report_standard_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_standard_items" ADD CONSTRAINT "daily_report_standard_items_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_standard_items" ADD CONSTRAINT "daily_report_standard_items_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_standard_items_owner_idx" ON "daily_report_standard_items" USING btree ("project_id","contractor_id","kind");
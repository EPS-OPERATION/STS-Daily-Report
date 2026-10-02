CREATE TABLE "safety_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"item_no" integer NOT NULL,
	"observation" text NOT NULL,
	"building_id" uuid,
	"location_detail" text,
	"action_to_be_taken" text NOT NULL,
	"contractor_id" uuid,
	"inspection_date" date NOT NULL,
	"expected_complete_date" date,
	"status" text DEFAULT 'open' NOT NULL,
	"finding_type" text NOT NULL,
	"finding_photo_key" text,
	"close_photo_key" text,
	"closed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_findings_project_item_unique" UNIQUE("project_id","item_no"),
	CONSTRAINT "safety_findings_status_check" CHECK ("safety_findings"."status" IN ('open', 'done')),
	CONSTRAINT "safety_findings_type_check" CHECK ("safety_findings"."finding_type" IN ('unsafe_act', 'unsafe_condition'))
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "accident_category" text;--> statement-breakpoint
ALTER TABLE "safety_findings" ADD CONSTRAINT "safety_findings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_findings" ADD CONSTRAINT "safety_findings_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_findings" ADD CONSTRAINT "safety_findings_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_findings" ADD CONSTRAINT "safety_findings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "safety_findings_project_date_idx" ON "safety_findings" USING btree ("project_id","inspection_date");--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_accident_category_check" CHECK ("daily_reports"."accident_category" IS NULL OR "daily_reports"."accident_category" IN ('lti', 'non_lti', 'property_damage', 'near_miss', 'emergency'));
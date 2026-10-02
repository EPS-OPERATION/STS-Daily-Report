CREATE TABLE "daily_site_markers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"site_map_view_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"contractor_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"icon_key" text NOT NULL,
	"comment" text NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"facility_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_site_markers_coordinates_check" CHECK ("daily_site_markers"."x" BETWEEN 0 AND 1 AND "daily_site_markers"."y" BETWEEN 0 AND 1),
	CONSTRAINT "daily_site_markers_comment_check" CHECK (length(trim("daily_site_markers"."comment")) BETWEEN 1 AND 2000),
	CONSTRAINT "daily_site_markers_icon_key_check" CHECK ("daily_site_markers"."icon_key" IN ('vehicle', 'truck', 'crane', 'excavator', 'equipment', 'material', 'worker', 'hazard', 'restricted-area', 'work-area', 'other')),
	CONSTRAINT "daily_site_markers_lifecycle_check" CHECK (("daily_site_markers"."status" = 'active' AND "daily_site_markers"."withdrawn_at" IS NULL) OR ("daily_site_markers"."status" = 'withdrawn' AND "daily_site_markers"."withdrawn_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "daily_site_markers" ADD CONSTRAINT "daily_site_markers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_site_markers" ADD CONSTRAINT "daily_site_markers_site_map_view_id_site_map_views_id_fk" FOREIGN KEY ("site_map_view_id") REFERENCES "public"."site_map_views"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_site_markers" ADD CONSTRAINT "daily_site_markers_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_site_markers" ADD CONSTRAINT "daily_site_markers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_site_markers" ADD CONSTRAINT "daily_site_markers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_site_markers" ADD CONSTRAINT "daily_site_markers_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_site_markers_project_view_date_status_idx" ON "daily_site_markers" USING btree ("project_id","site_map_view_id","work_date","status");--> statement-breakpoint
CREATE INDEX "daily_site_markers_contractor_idx" ON "daily_site_markers" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "daily_site_markers_creator_idx" ON "daily_site_markers" USING btree ("created_by");
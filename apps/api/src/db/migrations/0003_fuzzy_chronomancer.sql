CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zones_project_code_unique" UNIQUE("project_id","code"),
	CONSTRAINT "zones_sort_order_check" CHECK ("zones"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "site_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"background_object_key" text,
	"original_width" integer,
	"original_height" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zone_map_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_plan_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"geometry" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zone_map_areas_plan_zone_unique" UNIQUE("site_plan_id","zone_id")
);
--> statement-breakpoint
CREATE TABLE "site_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"manpower" integer DEFAULT 0 NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"start_time" text,
	"end_time" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_activities_manpower_check" CHECK ("site_activities"."manpower" >= 0),
	CONSTRAINT "site_activities_progress_check" CHECK ("site_activities"."progress_percent" >= 0 AND "site_activities"."progress_percent" <= 100)
);
--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_parent_id_zones_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_plans" ADD CONSTRAINT "site_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_map_areas" ADD CONSTRAINT "zone_map_areas_site_plan_id_site_plans_id_fk" FOREIGN KEY ("site_plan_id") REFERENCES "public"."site_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_map_areas" ADD CONSTRAINT "zone_map_areas_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_activities" ADD CONSTRAINT "site_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_activities" ADD CONSTRAINT "site_activities_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_activities" ADD CONSTRAINT "site_activities_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_activities" ADD CONSTRAINT "site_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_activities_project_date_idx" ON "site_activities" USING btree ("project_id","work_date");--> statement-breakpoint
CREATE INDEX "site_activities_zone_idx" ON "site_activities" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "site_activities_contractor_idx" ON "site_activities" USING btree ("contractor_id");
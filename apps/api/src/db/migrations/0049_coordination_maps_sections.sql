CREATE TABLE "coordination_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"map_id" uuid NOT NULL,
	"code" text NOT NULL,
	"work" text NOT NULL,
	"color" text NOT NULL,
	"points" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_sections_map_code_unique" UNIQUE("map_id","code"),
	CONSTRAINT "coordination_sections_code_check" CHECK (char_length("coordination_sections"."code") between 1 and 20),
	CONSTRAINT "coordination_sections_work_check" CHECK (char_length("coordination_sections"."work") between 1 and 300),
	CONSTRAINT "coordination_sections_color_check" CHECK ("coordination_sections"."color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
ALTER TABLE "coordination_maps" DROP CONSTRAINT "coordination_maps_project_id_unique";--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ALTER COLUMN "building_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_forecasts" ALTER COLUMN "building_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_report_forecasts" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "coordination_items" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "coordination_maps" ADD COLUMN "name" text DEFAULT 'Main plant layout' NOT NULL;--> statement-breakpoint
ALTER TABLE "coordination_maps" ADD COLUMN "name_th" text DEFAULT 'ผังโรงไฟฟ้า' NOT NULL;--> statement-breakpoint
ALTER TABLE "coordination_maps" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coordination_maps" ADD COLUMN "object_key" text;--> statement-breakpoint
ALTER TABLE "coordination_sections" ADD CONSTRAINT "coordination_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_sections" ADD CONSTRAINT "coordination_sections_map_id_coordination_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."coordination_maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_sections" ADD CONSTRAINT "coordination_sections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coordination_sections_project_idx" ON "coordination_sections" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_section_id_coordination_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."coordination_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_forecasts" ADD CONSTRAINT "daily_report_forecasts_section_id_coordination_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."coordination_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_items" ADD CONSTRAINT "coordination_items_section_id_coordination_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."coordination_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_allocations_section_idx" ON "daily_report_allocations" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "daily_report_forecasts_section_idx" ON "daily_report_forecasts" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "coordination_maps_project_idx" ON "coordination_maps" USING btree ("project_id","sort_order");--> statement-breakpoint
ALTER TABLE "coordination_maps" ADD CONSTRAINT "coordination_maps_project_name_unique" UNIQUE("project_id","name");--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_location_check" CHECK (("daily_report_allocations"."building_id" IS NULL) <> ("daily_report_allocations"."section_id" IS NULL));--> statement-breakpoint
ALTER TABLE "daily_report_forecasts" ADD CONSTRAINT "daily_report_forecasts_location_check" CHECK (("daily_report_forecasts"."building_id" IS NULL) <> ("daily_report_forecasts"."section_id" IS NULL));
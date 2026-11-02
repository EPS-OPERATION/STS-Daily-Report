CREATE TABLE "coordination_road_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"road" text NOT NULL,
	"name" text NOT NULL,
	"points" jsonb NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_road_segments_road_check" CHECK (char_length("coordination_road_segments"."road") between 1 and 20),
	CONSTRAINT "coordination_road_segments_name_check" CHECK (char_length("coordination_road_segments"."name") between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD COLUMN "segment_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD COLUMN "route" jsonb;--> statement-breakpoint
ALTER TABLE "coordination_road_segments" ADD CONSTRAINT "coordination_road_segments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_road_segments" ADD CONSTRAINT "coordination_road_segments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coordination_road_segments_name_unique" ON "coordination_road_segments" USING btree ("project_id","name");
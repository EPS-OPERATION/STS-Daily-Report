CREATE TABLE "building_part_markers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"view" text NOT NULL,
	"x" numeric(6, 5) NOT NULL,
	"y" numeric(6, 5) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "building_part_markers_part_view_unique" UNIQUE("part_id","view"),
	CONSTRAINT "building_part_markers_view_check" CHECK ("building_part_markers"."view" IN ('overview', 'topview', 'plan')),
	CONSTRAINT "building_part_markers_xy_check" CHECK ("building_part_markers"."x" BETWEEN 0 AND 1 AND "building_part_markers"."y" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "building_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "building_parts_building_code_unique" UNIQUE("building_id","code"),
	CONSTRAINT "building_parts_status_check" CHECK ("building_parts"."status" IN ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "building_markers" DROP CONSTRAINT "building_markers_view_check";--> statement-breakpoint
ALTER TABLE "building_part_markers" ADD CONSTRAINT "building_part_markers_part_id_building_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."building_parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_parts" ADD CONSTRAINT "building_parts_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_markers" ADD CONSTRAINT "building_markers_view_check" CHECK ("building_markers"."view" IN ('overview', 'topview', 'plan'));
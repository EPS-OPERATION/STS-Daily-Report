CREATE TABLE "building_markers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"view" text NOT NULL,
	"x" numeric(6, 5) NOT NULL,
	"y" numeric(6, 5) NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "building_markers_building_view_unique" UNIQUE("building_id","view"),
	CONSTRAINT "building_markers_view_check" CHECK ("building_markers"."view" IN ('overview', 'topview')),
	CONSTRAINT "building_markers_xy_check" CHECK ("building_markers"."x" BETWEEN 0 AND 1 AND "building_markers"."y" BETWEEN 0 AND 1)
);
--> statement-breakpoint
ALTER TABLE "building_markers" ADD CONSTRAINT "building_markers_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_markers" ADD CONSTRAINT "building_markers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
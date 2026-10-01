CREATE TABLE "zone_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"display_color" varchar(7) DEFAULT '#457B9D' NOT NULL,
	"map_x" double precision,
	"map_y" double precision,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zone_parts_zone_code_unique" UNIQUE("zone_id","code"),
	CONSTRAINT "zone_parts_sort_order_check" CHECK ("zone_parts"."sort_order" >= 0),
	CONSTRAINT "zone_parts_display_color_check" CHECK ("zone_parts"."display_color" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "zone_parts_map_point_check" CHECK (("zone_parts"."map_x" IS NULL) = ("zone_parts"."map_y" IS NULL) AND ("zone_parts"."map_x" IS NULL OR "zone_parts"."map_x" BETWEEN 0 AND 1) AND ("zone_parts"."map_y" IS NULL OR "zone_parts"."map_y" BETWEEN 0 AND 1))
);
--> statement-breakpoint
CREATE TABLE "zone_map_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_plan_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"x" double precision,
	"y" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zone_map_points_plan_zone_unique" UNIQUE("site_plan_id","zone_id"),
	CONSTRAINT "zone_map_points_coordinates_check" CHECK (("zone_map_points"."x" IS NULL) = ("zone_map_points"."y" IS NULL) AND ("zone_map_points"."x" IS NULL OR "zone_map_points"."x" BETWEEN 0 AND 1) AND ("zone_map_points"."y" IS NULL OR "zone_map_points"."y" BETWEEN 0 AND 1))
);
--> statement-breakpoint
ALTER TABLE "site_activities" ADD COLUMN "zone_part_id" uuid;--> statement-breakpoint
ALTER TABLE "zone_parts" ADD CONSTRAINT "zone_parts_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_map_points" ADD CONSTRAINT "zone_map_points_site_plan_id_site_plans_id_fk" FOREIGN KEY ("site_plan_id") REFERENCES "public"."site_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_map_points" ADD CONSTRAINT "zone_map_points_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zone_parts_zone_idx" ON "zone_parts" USING btree ("zone_id");--> statement-breakpoint
ALTER TABLE "site_activities" ADD CONSTRAINT "site_activities_zone_part_id_zone_parts_id_fk" FOREIGN KEY ("zone_part_id") REFERENCES "public"."zone_parts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_activities_zone_part_idx" ON "site_activities" USING btree ("zone_part_id");--> statement-breakpoint
-- Preserve legacy polygons and initialize a physical Zone marker at each leaf polygon's visual bounds center.
INSERT INTO "zone_map_points" ("site_plan_id", "zone_id", "x", "y")
SELECT
	a."site_plan_id",
	a."zone_id",
	(min((p.value ->> 'x')::double precision) + max((p.value ->> 'x')::double precision)) / 2,
	(min((p.value ->> 'y')::double precision) + max((p.value ->> 'y')::double precision)) / 2
FROM "zone_map_areas" AS a
JOIN "zones" AS z ON z."id" = a."zone_id"
CROSS JOIN LATERAL jsonb_array_elements(
	CASE WHEN jsonb_typeof(a."geometry" -> 'points') = 'array' THEN a."geometry" -> 'points' ELSE '[]'::jsonb END
) AS p(value)
WHERE p.value ->> 'x' ~ '^(0([.][0-9]+)?|1([.]0+)?)$'
	AND p.value ->> 'y' ~ '^(0([.][0-9]+)?|1([.]0+)?)$'
	AND NOT EXISTS (SELECT 1 FROM "zones" AS child WHERE child."parent_id" = z."id")
GROUP BY a."site_plan_id", a."zone_id", a."geometry"
HAVING count(*) >= 3;

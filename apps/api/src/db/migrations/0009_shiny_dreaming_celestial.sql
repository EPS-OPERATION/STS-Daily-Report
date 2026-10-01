CREATE TABLE "site_marker_definitions" (
	"site_plan_id" uuid NOT NULL,
	"key" text NOT NULL,
	"no" integer NOT NULL,
	"name" text NOT NULL,
	"zone_id" uuid,
	CONSTRAINT "site_marker_definitions_site_plan_id_key_pk" PRIMARY KEY("site_plan_id","key"),
	CONSTRAINT "site_marker_definitions_plan_no_unique" UNIQUE("site_plan_id","no"),
	CONSTRAINT "site_marker_definitions_no_check" CHECK ("site_marker_definitions"."no" > 0)
);
--> statement-breakpoint
ALTER TABLE "site_marker_definitions" ADD CONSTRAINT "site_marker_definitions_site_plan_id_site_plans_id_fk" FOREIGN KEY ("site_plan_id") REFERENCES "public"."site_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_marker_definitions" ADD CONSTRAINT "site_marker_definitions_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Authoritative display definitions; resolve only existing physical Zones. TR stays unlinked.
INSERT INTO "site_marker_definitions" ("site_plan_id", "no", "key", "name", "zone_id")
SELECT plan."id", definition.no, definition.key, definition.name, zone."id"
FROM "site_plans" plan
CROSS JOIN (VALUES
  (1, 'raw-water-pond-and-pump', 'Raw Water Pond and Pump', '6.1'),
  (2, 'water-tank-and-pump-house', 'Water Tank and Pump House', '6.2'),
  (3, 'water-treatment-plant', 'Water Treatment Plant', '6.3'),
  (4, 'auxiliary-cooling-tower', 'Auxiliary Cooling Tower', '6.4'),
  (5, 'compressor-room', 'Compressor Room', '6.5'),
  (6, 'acc', 'ACC', '5.1'),
  (7, 'tg-building', 'TG Building', '4.1'),
  (8, 'tr', 'TR', NULL),
  (9, 'boiler', 'Boiler', '2.1'),
  (10, 'biomass-transport', 'Biomass Transport', '1.2'),
  (11, 'bottom-ash-bunker', 'Bottom Ash Bunker', '2.3'),
  (12, 'fly-ash-silo', 'Fly Ash Silo', '2.4'),
  (13, 'diesel-oil-tank', 'Diesel Oil Tank', '2.2'),
  (14, 'fgt', 'FGT', '3.1'),
  (15, 'stack', 'Stack', '3.2')
) definition(no, key, name, zone_code)
LEFT JOIN "zones" zone ON zone."project_id" = plan."project_id" AND zone."code" = definition.zone_code
  AND NOT EXISTS (SELECT 1 FROM "zones" child WHERE child."parent_id" = zone."id")
WHERE plan."project_id" = '11111111-1111-4111-8111-111111111111' AND plan."is_default" = true;
--> statement-breakpoint
-- Remove obsolete spatial configuration only; Zones, activities and legacy polygons are preserved.
DELETE FROM "zone_map_points" point USING "site_plans" plan
WHERE point."site_plan_id" = plan."id" AND plan."project_id" = '11111111-1111-4111-8111-111111111111'
AND NOT EXISTS (SELECT 1 FROM "site_marker_definitions" definition WHERE definition."site_plan_id" = plan."id" AND definition."zone_id" = point."zone_id");

ALTER TABLE "site_marker_definitions" ADD COLUMN "overview_x" double precision;--> statement-breakpoint
ALTER TABLE "site_marker_definitions" ADD COLUMN "overview_y" double precision;--> statement-breakpoint
ALTER TABLE "site_marker_definitions" ADD COLUMN "top_view_x" double precision;--> statement-breakpoint
ALTER TABLE "site_marker_definitions" ADD COLUMN "top_view_y" double precision;--> statement-breakpoint
ALTER TABLE "site_marker_definitions" ADD CONSTRAINT "site_marker_definitions_overview_point_check" CHECK (("site_marker_definitions"."overview_x" IS NULL) = ("site_marker_definitions"."overview_y" IS NULL) AND ("site_marker_definitions"."overview_x" IS NULL OR "site_marker_definitions"."overview_x" BETWEEN 0 AND 1) AND ("site_marker_definitions"."overview_y" IS NULL OR "site_marker_definitions"."overview_y" BETWEEN 0 AND 1));--> statement-breakpoint
ALTER TABLE "site_marker_definitions" ADD CONSTRAINT "site_marker_definitions_top_view_point_check" CHECK (("site_marker_definitions"."top_view_x" IS NULL) = ("site_marker_definitions"."top_view_y" IS NULL) AND ("site_marker_definitions"."top_view_x" IS NULL OR "site_marker_definitions"."top_view_x" BETWEEN 0 AND 1) AND ("site_marker_definitions"."top_view_y" IS NULL OR "site_marker_definitions"."top_view_y" BETWEEN 0 AND 1));
-- Copy retained marker coordinates to canonical facility rows before applying current image anchors.
UPDATE "site_marker_definitions" d SET "overview_x" = p."x", "overview_y" = p."y"
FROM "zone_map_points" p
WHERE p."site_plan_id" = d."site_plan_id" AND p."zone_id" = d."zone_id" AND p."view" = 'overview';
--> statement-breakpoint
UPDATE "site_marker_definitions" d SET "top_view_x" = p."x", "top_view_y" = p."y"
FROM "zone_map_points" p
WHERE p."site_plan_id" = d."site_plan_id" AND p."zone_id" = d."zone_id" AND p."view" = 'top';
--> statement-breakpoint
-- Seed manually located initial anchors from the two actual unlabeled images. Retain positions already stored.
UPDATE "site_marker_definitions" d SET
  "overview_x" = COALESCE(d."overview_x", a.overview_x), "overview_y" = COALESCE(d."overview_y", a.overview_y),
  "top_view_x" = COALESCE(d."top_view_x", a.top_view_x), "top_view_y" = COALESCE(d."top_view_y", a.top_view_y)
FROM (VALUES
  (1, 'raw-water-pond-and-pump', 0.564, 0.150, 0.70595, 0.7604),
  (2, 'water-tank-and-pump-house', 0.354, 0.321, 0.710, 0.240),
  (3, 'water-treatment-plant', 0.377, 0.292, 0.744, 0.486),
  (4, 'auxiliary-cooling-tower', 0.311, 0.390, 0.700, 0.380),
  (5, 'compressor-room', 0.229, 0.426, 0.665, 0.480),
  (6, 'acc', 0.165, 0.559, 0.635, 0.239),
  (7, 'tg-building', 0.400, 0.395, 0.6295, 0.413),
  (8, 'tr', 0.238, 0.735, 0.245, 0.718),
  (9, 'boiler', 0.824, 0.415, 0.5085, 0.440),
  (10, 'biomass-transport', 0.948, 0.459, 0.3749, 0.6197),
  (11, 'bottom-ash-bunker', 0.855, 0.612, 0.558, 0.612),
  (12, 'fly-ash-silo', 0.486, 0.808, 0.548, 0.526),
  (13, 'diesel-oil-tank', 0.695, 0.593, 0.468, 0.555),
  (14, 'fgt', 0.610, 0.780, 0.510, 0.200),
  (15, 'stack', 0.565, 0.505, 0.525, 0.260)
) a(no,key,overview_x,overview_y,top_view_x,top_view_y)
WHERE d."site_plan_id" = '11111111-1111-4111-8111-111111111111' AND d."key" = a.key;

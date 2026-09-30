-- Remove the unchanged, evenly partitioned demo areas. Keep any geometry
-- already edited by a project administrator and clear its synthetic reset target.
UPDATE "zone_map_areas"
SET "default_geometry" = NULL
WHERE "zone_id" IN (
  'd6200001-6666-4666-8666-666666666666',
  'd6300001-6666-4666-8666-666666666666',
  'd6500001-6666-4666-8666-666666666666'
)
AND "geometry" <> "default_geometry";
--> statement-breakpoint
DELETE FROM "zone_map_areas"
WHERE "zone_id" IN (
  'd6200001-6666-4666-8666-666666666666',
  'd6300001-6666-4666-8666-666666666666',
  'd6500001-6666-4666-8666-666666666666'
)
AND "geometry" = "default_geometry";
--> statement-breakpoint
UPDATE "site_activities"
SET "zone_id" = 'd2100001-2222-4222-8222-222222222222'
WHERE "project_id" = '11111111-1111-4111-8111-111111111111'
  AND "zone_id" = 'a2222222-2222-4222-8222-222222222222'
  AND "id" IN (
    'c1111111-1111-4111-8111-111111111111',
    'c2222222-2222-4222-8222-222222222222',
    'c3333333-3333-4333-8333-333333333333'
  );
--> statement-breakpoint
UPDATE "site_plans"
SET "original_width" = 1586, "original_height" = 992
WHERE "id" = 'b1111111-1111-4111-8111-111111111111'
  AND "original_width" IS NULL
  AND "original_height" IS NULL;

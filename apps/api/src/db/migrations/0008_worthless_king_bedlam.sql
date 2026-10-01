ALTER TABLE "zone_map_points" DROP CONSTRAINT "zone_map_points_plan_zone_unique";--> statement-breakpoint
ALTER TABLE "zone_map_points" ADD COLUMN "view" text DEFAULT 'top' NOT NULL;--> statement-breakpoint
ALTER TABLE "zone_map_points" ADD CONSTRAINT "zone_map_points_plan_zone_view_unique" UNIQUE("site_plan_id","zone_id","view");--> statement-breakpoint
ALTER TABLE "zone_map_points" ADD CONSTRAINT "zone_map_points_view_check" CHECK ("zone_map_points"."view" IN ('overview', 'top'));
--> statement-breakpoint
-- Manually positioned anchors on the unlabeled STS Overview image; never reuse Top coordinates.
INSERT INTO "zone_map_points" ("site_plan_id", "zone_id", "view", "x", "y")
SELECT p."id", z."id", anchor.view, anchor.x, anchor.y
FROM (VALUES
  ('1.1', 'overview', 0.950, 0.780),
  ('1.2', 'overview', 0.948, 0.459),
  ('2.1', 'overview', 0.824, 0.415),
  ('2.4', 'overview', 0.486, 0.808),
  ('3.1', 'overview', 0.610, 0.780),
  ('3.2', 'overview', 0.565, 0.505),
  ('4.1', 'overview', 0.400, 0.395),
  ('5.1', 'overview', 0.165, 0.559),
  ('6.1', 'overview', 0.564, 0.150),
  ('5.1', 'top', 0.635, 0.239)
) AS anchor(code, view, x, y)
JOIN "zones" z ON z."code" = anchor.code AND z."project_id" = '11111111-1111-4111-8111-111111111111'
JOIN "site_plans" p ON p."project_id" = z."project_id" AND p."is_default" = true
WHERE NOT EXISTS (SELECT 1 FROM "zones" child WHERE child."parent_id" = z."id")
ON CONFLICT ("site_plan_id", "zone_id", "view") DO NOTHING;

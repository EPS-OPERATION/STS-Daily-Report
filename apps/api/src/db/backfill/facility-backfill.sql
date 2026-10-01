-- Re-runnable conversion of persisted legacy data; this creates no demo data.
WITH candidates AS (
  SELECT p.project_id, d.key, d.name, d.no, p.is_default, p.created_at, p.id AS plan_id,
    CASE WHEN z.project_id = p.project_id AND NOT EXISTS (SELECT 1 FROM zones child WHERE child.parent_id = z.id)
      THEN z.id ELSE NULL END AS physical_zone_id
  FROM site_marker_definitions d JOIN site_plans p ON p.id = d.site_plan_id
  LEFT JOIN zones z ON z.id = d.zone_id
  WHERE length(trim(d.key)) > 0
), names AS (
  SELECT DISTINCT ON (project_id,key) project_id,key,name,no FROM candidates
  ORDER BY project_id,key,is_default DESC,created_at,plan_id
), links AS (
  SELECT project_id,key, CASE WHEN count(DISTINCT physical_zone_id) = 1
    THEN (array_agg(DISTINCT physical_zone_id) FILTER (WHERE physical_zone_id IS NOT NULL))[1] ELSE NULL END AS zone_id
  FROM candidates GROUP BY project_id,key
)
INSERT INTO facilities(project_id,key,name,sort_order,legacy_zone_id)
SELECT n.project_id,n.key,n.name,n.no,l.zone_id FROM names n JOIN links l USING(project_id,key)
ON CONFLICT (project_id,key) DO NOTHING;
--> statement-breakpoint
-- Recover persisted physical locations absent from the old display catalog.
INSERT INTO facilities(project_id,key,name,sort_order,legacy_zone_id)
SELECT z.project_id,'legacy-zone-' || z.id::text,z.name,z.sort_order,z.id FROM zones z
WHERE NOT EXISTS (SELECT 1 FROM zones child WHERE child.parent_id=z.id)
  AND NOT EXISTS (SELECT 1 FROM facilities f WHERE f.project_id=z.project_id AND f.legacy_zone_id=z.id)
  AND NOT EXISTS (SELECT 1 FROM site_marker_definitions d JOIN site_plans p ON p.id=d.site_plan_id WHERE p.project_id=z.project_id AND d.zone_id=z.id)
  AND (EXISTS (SELECT 1 FROM zone_parts part WHERE part.zone_id=z.id)
    OR EXISTS (SELECT 1 FROM site_activities a WHERE a.zone_id=z.id)
    OR EXISTS (SELECT 1 FROM zone_map_points point WHERE point.zone_id=z.id)
    OR EXISTS (SELECT 1 FROM zone_map_areas area WHERE area.zone_id=z.id))
ON CONFLICT (project_id,key) DO NOTHING;
--> statement-breakpoint
INSERT INTO site_map_views(site_plan_id,key,name,image_object_key,legacy_asset_url,width,height,sort_order)
SELECT p.id,'top','Top View',p.background_object_key,
  CASE WHEN p.background_object_key IS NULL AND p.id='b1111111-1111-4111-8111-111111111111'
    THEN '/site-plan/master-layout-map.png' ELSE NULL END,
  CASE WHEN p.original_width > 0 AND p.original_height > 0 THEN p.original_width ELSE NULL END,
  CASE WHEN p.original_width > 0 AND p.original_height > 0 THEN p.original_height ELSE NULL END,1
FROM site_plans p WHERE
  p.id='b1111111-1111-4111-8111-111111111111' OR p.background_object_key IS NOT NULL
  OR (p.original_width > 0 AND p.original_height > 0)
  OR EXISTS (SELECT 1 FROM site_marker_definitions d WHERE d.site_plan_id=p.id)
  OR EXISTS (SELECT 1 FROM zone_map_points point WHERE point.site_plan_id=p.id)
  OR EXISTS (SELECT 1 FROM zone_map_areas area WHERE area.site_plan_id=p.id)
ON CONFLICT (site_plan_id,key) DO NOTHING;
--> statement-breakpoint
INSERT INTO site_map_views(site_plan_id,key,name,legacy_asset_url,width,height,sort_order)
SELECT p.id,'overview','Overview',
  CASE WHEN p.project_id='11111111-1111-4111-8111-111111111111' THEN '/site-plan/master-layout-map-above.png' ELSE NULL END,
  CASE WHEN p.project_id='11111111-1111-4111-8111-111111111111' THEN 1513 ELSE NULL END,
  CASE WHEN p.project_id='11111111-1111-4111-8111-111111111111' THEN 1039 ELSE NULL END,0
FROM site_plans p WHERE
  p.id='b1111111-1111-4111-8111-111111111111'
  OR EXISTS (SELECT 1 FROM site_marker_definitions d WHERE d.site_plan_id=p.id AND d.overview_x IS NOT NULL)
  OR EXISTS (SELECT 1 FROM zone_map_points point WHERE point.site_plan_id=p.id AND point.view='overview')
ON CONFLICT (site_plan_id,key) DO NOTHING;
--> statement-breakpoint
INSERT INTO facility_map_markers(facility_id,site_map_view_id,x,y)
SELECT f.id,v.id,anchor.x,anchor.y FROM site_marker_definitions d
JOIN site_plans p ON p.id=d.site_plan_id
JOIN facilities f ON f.project_id=p.project_id AND f.key=d.key
CROSS JOIN LATERAL (VALUES ('overview',d.overview_x,d.overview_y),('top',d.top_view_x,d.top_view_y)) anchor(key,x,y)
JOIN site_map_views v ON v.site_plan_id=p.id AND v.key=anchor.key
WHERE anchor.x IS NOT NULL AND anchor.y IS NOT NULL
ON CONFLICT (facility_id,site_map_view_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO facility_map_markers(facility_id,site_map_view_id,x,y)
SELECT f.id,v.id,point.x,point.y FROM zone_map_points point
JOIN site_plans p ON p.id=point.site_plan_id
JOIN facilities f ON f.project_id=p.project_id AND f.legacy_zone_id=point.zone_id
JOIN site_map_views v ON v.site_plan_id=p.id AND v.key=point.view
WHERE point.x IS NOT NULL AND point.y IS NOT NULL
  AND (SELECT count(*) FROM facilities candidate WHERE candidate.project_id=p.project_id AND candidate.legacy_zone_id=point.zone_id)=1
  AND NOT EXISTS (SELECT 1 FROM site_marker_definitions d WHERE d.site_plan_id=p.id AND d.zone_id=point.zone_id)
ON CONFLICT (facility_id,site_map_view_id) DO NOTHING;
--> statement-breakpoint
-- A null saved point or definition is a deliberate removal, not a fallback opportunity.
INSERT INTO facility_map_markers(facility_id,site_map_view_id,x,y)
SELECT f.id,v.id,
  (min((coordinate.value->>'x')::double precision)+max((coordinate.value->>'x')::double precision))/2,
  (min((coordinate.value->>'y')::double precision)+max((coordinate.value->>'y')::double precision))/2
FROM zone_map_areas area JOIN site_plans p ON p.id=area.site_plan_id
JOIN facilities f ON f.project_id=p.project_id AND f.legacy_zone_id=area.zone_id
JOIN site_map_views v ON v.site_plan_id=p.id AND v.key='top'
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(area.geometry->'points')='array' THEN area.geometry->'points' ELSE '[]'::jsonb END) coordinate(value)
WHERE coordinate.value->>'x' ~ '^(0([.][0-9]+)?|1([.]0+)?)$'
  AND coordinate.value->>'y' ~ '^(0([.][0-9]+)?|1([.]0+)?)$'
  AND (SELECT count(*) FROM facilities candidate WHERE candidate.project_id=p.project_id AND candidate.legacy_zone_id=area.zone_id)=1
  AND NOT EXISTS (SELECT 1 FROM zone_map_points point WHERE point.site_plan_id=p.id AND point.zone_id=area.zone_id AND point.view='top')
  AND NOT EXISTS (SELECT 1 FROM site_marker_definitions d WHERE d.site_plan_id=p.id AND d.zone_id=area.zone_id)
GROUP BY f.id,v.id HAVING count(*) >= 3
ON CONFLICT (facility_id,site_map_view_id) DO NOTHING;
--> statement-breakpoint
UPDATE zone_parts part SET facility_id=resolved.id
FROM (SELECT legacy_zone_id,(array_agg(id))[1] AS id FROM facilities WHERE legacy_zone_id IS NOT NULL GROUP BY legacy_zone_id HAVING count(*)=1) resolved
WHERE part.facility_id IS NULL AND part.zone_id=resolved.legacy_zone_id;
--> statement-breakpoint
UPDATE site_activities activity SET facility_id=resolved.id
FROM (SELECT project_id,legacy_zone_id,(array_agg(id))[1] AS id FROM facilities WHERE legacy_zone_id IS NOT NULL GROUP BY project_id,legacy_zone_id HAVING count(*)=1) resolved
WHERE activity.facility_id IS NULL AND activity.zone_id=resolved.legacy_zone_id AND activity.project_id=resolved.project_id;
--> statement-breakpoint
UPDATE site_activities activity SET facility_part_id=part.id FROM zone_parts part
WHERE activity.facility_part_id IS NULL AND activity.zone_part_id=part.id AND activity.facility_id=part.facility_id;

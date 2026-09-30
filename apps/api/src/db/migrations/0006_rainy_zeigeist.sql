ALTER TABLE "zones" ADD COLUMN "display_color" varchar(7) DEFAULT '#457B9D' NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "default_display_color" varchar(7) DEFAULT '#457B9D' NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_display_color_check" CHECK ("zones"."display_color" ~ '^#[0-9A-F]{6}$');--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_default_display_color_check" CHECK ("zones"."default_display_color" ~ '^#[0-9A-F]{6}$');--> statement-breakpoint
WITH RECURSIVE root_order AS (
  SELECT id, project_id, row_number() OVER (PARTITION BY project_id ORDER BY sort_order, code) AS root_number
  FROM zones
  WHERE parent_id IS NULL
),
root_colors AS (
  SELECT
    id,
    CASE ((root_number - 1) % 10)
      WHEN 0 THEN '#E76F51'
      WHEN 1 THEN '#457B9D'
      WHEN 2 THEN '#2A9D8F'
      WHEN 3 THEN '#8E6CBB'
      WHEN 4 THEN '#D18B47'
      WHEN 5 THEN '#577590'
      WHEN 6 THEN '#6B8E23'
      WHEN 7 THEN '#BC6C25'
      WHEN 8 THEN '#6D597A'
      ELSE '#3A7D44'
    END AS color
  FROM root_order
),
zone_roots AS (
  SELECT id, id AS root_id FROM zones WHERE parent_id IS NULL
  UNION ALL
  SELECT child.id, parent.root_id
  FROM zones AS child
  JOIN zone_roots AS parent ON child.parent_id = parent.id
)
UPDATE zones AS zone
SET display_color = root_color.color,
    default_display_color = root_color.color
FROM zone_roots
JOIN root_colors AS root_color ON root_color.id = zone_roots.root_id
WHERE zone.id = zone_roots.id;

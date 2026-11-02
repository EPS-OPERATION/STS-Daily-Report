ALTER TABLE "zone_map_areas" ADD COLUMN "default_geometry" jsonb;
--> statement-breakpoint
UPDATE "zone_map_areas" SET "default_geometry" = "geometry" WHERE "default_geometry" IS NULL;
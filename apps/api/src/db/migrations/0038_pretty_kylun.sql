DROP INDEX "coordination_road_segments_name_unique";--> statement-breakpoint
CREATE INDEX "coordination_road_segments_name_idx" ON "coordination_road_segments" USING btree ("project_id","name");
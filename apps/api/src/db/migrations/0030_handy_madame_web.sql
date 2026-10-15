ALTER TABLE "coordination_items" DROP CONSTRAINT "coordination_items_icon_check";--> statement-breakpoint
ALTER TABLE "coordination_items" DROP CONSTRAINT "coordination_items_area_kind_check";--> statement-breakpoint
ALTER TABLE "coordination_items" ADD CONSTRAINT "coordination_items_icon_check" CHECK ("coordination_items"."icon" IN ('crane','machinery','truck','weld','pipe','box','pin','road','text'));--> statement-breakpoint
ALTER TABLE "coordination_items" ADD CONSTRAINT "coordination_items_area_kind_check" CHECK ("coordination_items"."area_kind" IN ('rectangle','polygon','route'));
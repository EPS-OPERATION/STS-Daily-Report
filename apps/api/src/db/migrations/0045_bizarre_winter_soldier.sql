ALTER TABLE "daily_report_photos" DROP CONSTRAINT "daily_report_photos_category_check";--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD COLUMN "photo_key" uuid;--> statement-breakpoint
ALTER TABLE "daily_report_photos" ADD COLUMN "permit_key" uuid;--> statement-breakpoint
ALTER TABLE "daily_report_photos" ADD CONSTRAINT "daily_report_photos_category_check" CHECK ("daily_report_photos"."category" IN ('progress', 'safety', 'permit'));
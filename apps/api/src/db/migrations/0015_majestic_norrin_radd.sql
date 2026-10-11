ALTER TABLE "daily_report_allocations" DROP CONSTRAINT "daily_report_allocations_plan_check";--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ALTER COLUMN "plan_percent" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ALTER COLUMN "plan_percent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD COLUMN "end_time" text;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD COLUMN "day_share" numeric(4, 3) DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_window_check" CHECK (("daily_report_allocations"."start_time" IS NULL AND "daily_report_allocations"."end_time" IS NULL) OR ("daily_report_allocations"."start_time" IS NOT NULL AND "daily_report_allocations"."end_time" IS NOT NULL AND "daily_report_allocations"."start_time" < "daily_report_allocations"."end_time"));--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_share_check" CHECK ("daily_report_allocations"."day_share" > 0 AND "daily_report_allocations"."day_share" <= 1);--> statement-breakpoint
ALTER TABLE "daily_report_allocations" ADD CONSTRAINT "daily_report_allocations_plan_check" CHECK ("daily_report_allocations"."plan_percent" IS NULL OR "daily_report_allocations"."plan_percent" BETWEEN 0 AND 100);
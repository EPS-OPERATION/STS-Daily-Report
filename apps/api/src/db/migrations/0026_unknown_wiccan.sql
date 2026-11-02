ALTER TABLE "daily_report_road_usage" ADD COLUMN "adjusted_start_time" text;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD COLUMN "adjusted_end_time" text;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD COLUMN "adjusted_by" uuid;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD COLUMN "adjusted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD CONSTRAINT "daily_report_road_usage_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_road_usage" ADD CONSTRAINT "daily_report_road_usage_adjusted_check" CHECK (("daily_report_road_usage"."adjusted_at" IS NULL AND "daily_report_road_usage"."adjusted_start_time" IS NULL AND "daily_report_road_usage"."adjusted_end_time" IS NULL)
        OR ("daily_report_road_usage"."adjusted_at" IS NOT NULL AND "daily_report_road_usage"."adjusted_start_time" < "daily_report_road_usage"."adjusted_end_time"));
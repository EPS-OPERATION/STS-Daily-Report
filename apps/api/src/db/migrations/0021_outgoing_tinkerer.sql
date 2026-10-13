ALTER TABLE "daily_report_permits" ADD COLUMN "high_risk" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD COLUMN "task_name" text;--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD COLUMN "supervisor_name" text;
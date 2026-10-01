ALTER TABLE "daily_reports" ADD COLUMN "review_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_review_status_check" CHECK ("daily_reports"."review_status" IN ('pending', 'approved', 'rejected'));
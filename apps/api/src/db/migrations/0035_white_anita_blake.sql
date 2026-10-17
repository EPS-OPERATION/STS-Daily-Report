CREATE TABLE "rain_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"stoppage_hours" numeric(4, 1) NOT NULL,
	"intensity" text,
	"rainfall_mm" numeric(6, 1),
	"impact_summary" text DEFAULT '' NOT NULL,
	"delay_claim_note" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rain_logs_time_check" CHECK ("rain_logs"."start_time" < "rain_logs"."end_time"),
	CONSTRAINT "rain_logs_hours_check" CHECK ("rain_logs"."stoppage_hours" >= 0 AND "rain_logs"."stoppage_hours" <= 24),
	CONSTRAINT "rain_logs_intensity_check" CHECK ("rain_logs"."intensity" IS NULL OR "rain_logs"."intensity" IN ('light', 'moderate', 'heavy', 'storm'))
);
--> statement-breakpoint
ALTER TABLE "rain_logs" ADD CONSTRAINT "rain_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rain_logs" ADD CONSTRAINT "rain_logs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rain_logs_project_date_idx" ON "rain_logs" USING btree ("project_id","log_date");
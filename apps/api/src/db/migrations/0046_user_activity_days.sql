CREATE TABLE "user_activity_days" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active_minutes" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "user_activity_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "user_activity_days" ADD CONSTRAINT "user_activity_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_activity_days_day_idx" ON "user_activity_days" USING btree ("day");--> statement-breakpoint
-- Backfill: days each user is known to have used the app before this log existed
-- (session start / last seen, report submissions). active_minutes = 0 marks them as recovered.
INSERT INTO "user_activity_days" ("user_id", "day", "first_seen_at", "last_seen_at", "active_minutes")
SELECT "user_id", ("ts" AT TIME ZONE 'Asia/Bangkok')::date, min("ts"), max("ts"), 0
FROM (
  SELECT "user_id", "created_at" AS "ts" FROM "sessions"
  UNION ALL SELECT "user_id", "last_seen_at" FROM "sessions"
  UNION ALL SELECT "morning_submitted_by", "morning_submitted_at" FROM "daily_reports" WHERE "morning_submitted_by" IS NOT NULL AND "morning_submitted_at" IS NOT NULL
  UNION ALL SELECT "evening_submitted_by", "evening_submitted_at" FROM "daily_reports" WHERE "evening_submitted_by" IS NOT NULL AND "evening_submitted_at" IS NOT NULL
) AS "seen"
GROUP BY 1, 2
ON CONFLICT DO NOTHING;

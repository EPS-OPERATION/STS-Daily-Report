CREATE TABLE "weather_hourly" (
	"project_id" uuid NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"temperature_c" numeric(4, 1),
	"humidity_pct" integer,
	"precipitation_mm" numeric(5, 1),
	"wind_kmh" numeric(5, 1),
	"gust_kmh" numeric(5, 1),
	"weather_code" integer,
	"source" text DEFAULT 'open-meteo' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weather_hourly_project_id_hour_pk" PRIMARY KEY("project_id","hour")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "weather_hourly" ADD CONSTRAINT "weather_hourly_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weather_hourly_fetched_idx" ON "weather_hourly" USING btree ("project_id","fetched_at");
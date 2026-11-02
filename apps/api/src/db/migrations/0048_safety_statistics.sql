CREATE TABLE "safety_baseline_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"confirmed_name" text,
	"user_id" uuid,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_baseline_versions_project_version_unique" UNIQUE("project_id","version")
);
--> statement-breakpoint
CREATE TABLE "safety_baselines" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"man_hours_before" numeric(14, 1) DEFAULT 0 NOT NULL,
	"last_lti_date" date,
	"project_start_date" date,
	"confirmed_name" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_baselines_man_hours_check" CHECK ("safety_baselines"."man_hours_before" >= 0)
);
--> statement-breakpoint
CREATE TABLE "safety_stat_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"near_miss" integer DEFAULT 0 NOT NULL,
	"inspections" integer DEFAULT 0 NOT NULL,
	"lti" integer DEFAULT 0 NOT NULL,
	"non_lti" integer DEFAULT 0 NOT NULL,
	"property_damage" integer DEFAULT 0 NOT NULL,
	"emergency" integer DEFAULT 0 NOT NULL,
	"man_hours" numeric(10, 1) DEFAULT 0 NOT NULL,
	"days_without_accident" integer,
	"highest_days_without_accident" integer,
	"note" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_stat_entries_project_date_unique" UNIQUE("project_id","entry_date"),
	CONSTRAINT "safety_stat_entries_counts_check" CHECK ("safety_stat_entries"."near_miss" >= 0 AND "safety_stat_entries"."inspections" >= 0 AND "safety_stat_entries"."lti" >= 0 AND "safety_stat_entries"."non_lti" >= 0 AND "safety_stat_entries"."property_damage" >= 0 AND "safety_stat_entries"."emergency" >= 0 AND "safety_stat_entries"."man_hours" >= 0)
);
--> statement-breakpoint
CREATE TABLE "safety_stat_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"action" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"confirmed_name" text,
	"user_id" uuid,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_stat_versions_entry_version_unique" UNIQUE("entry_id","version"),
	CONSTRAINT "safety_stat_versions_action_check" CHECK ("safety_stat_versions"."action" IN ('create', 'edit'))
);
--> statement-breakpoint
CREATE TABLE "safety_stat_year_overrides" (
	"project_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"code" text NOT NULL,
	"value" integer NOT NULL,
	"confirmed_name" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_stat_year_overrides_project_id_year_code_pk" PRIMARY KEY("project_id","year","code"),
	CONSTRAINT "safety_stat_year_overrides_code_check" CHECK ("safety_stat_year_overrides"."code" IN ('lti', 'non_lti', 'property_damage', 'near_miss', 'emergency')),
	CONSTRAINT "safety_stat_year_overrides_value_check" CHECK ("safety_stat_year_overrides"."value" >= 0)
);
--> statement-breakpoint
ALTER TABLE "safety_baseline_versions" ADD CONSTRAINT "safety_baseline_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_baseline_versions" ADD CONSTRAINT "safety_baseline_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_baselines" ADD CONSTRAINT "safety_baselines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_baselines" ADD CONSTRAINT "safety_baselines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_stat_entries" ADD CONSTRAINT "safety_stat_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_stat_entries" ADD CONSTRAINT "safety_stat_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_stat_entries" ADD CONSTRAINT "safety_stat_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_stat_versions" ADD CONSTRAINT "safety_stat_versions_entry_id_safety_stat_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."safety_stat_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_stat_versions" ADD CONSTRAINT "safety_stat_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_stat_year_overrides" ADD CONSTRAINT "safety_stat_year_overrides_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_stat_year_overrides" ADD CONSTRAINT "safety_stat_year_overrides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "safety_stat_entries_project_date_idx" ON "safety_stat_entries" USING btree ("project_id","entry_date");--> statement-breakpoint
CREATE INDEX "safety_stat_versions_entry_idx" ON "safety_stat_versions" USING btree ("entry_id");
-- Append-only edit histories: a saved version can never be changed (rows go only with their entry / project).
CREATE OR REPLACE FUNCTION safety_stat_versions_no_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'safety_stat_versions is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER safety_stat_versions_no_update BEFORE UPDATE ON "safety_stat_versions"
  FOR EACH ROW EXECUTE FUNCTION safety_stat_versions_no_update();--> statement-breakpoint
CREATE OR REPLACE FUNCTION safety_baseline_versions_no_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'safety_baseline_versions is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER safety_baseline_versions_no_update BEFORE UPDATE ON "safety_baseline_versions"
  FOR EACH ROW EXECUTE FUNCTION safety_baseline_versions_no_update();

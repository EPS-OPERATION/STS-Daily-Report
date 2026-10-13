CREATE TABLE "coordination_day_notes" (
	"project_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"note" text NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_day_notes_project_id_work_date_pk" PRIMARY KEY("project_id","work_date")
);
--> statement-breakpoint
ALTER TABLE "coordination_day_notes" ADD CONSTRAINT "coordination_day_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_day_notes" ADD CONSTRAINT "coordination_day_notes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
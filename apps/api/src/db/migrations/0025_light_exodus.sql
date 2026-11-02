CREATE TABLE "coordination_day_locks" (
	"project_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"locked_by" uuid,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_day_locks_project_id_work_date_pk" PRIMARY KEY("project_id","work_date")
);
--> statement-breakpoint
ALTER TABLE "coordination_day_locks" ADD CONSTRAINT "coordination_day_locks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_day_locks" ADD CONSTRAINT "coordination_day_locks_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
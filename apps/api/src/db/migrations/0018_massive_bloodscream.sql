ALTER TABLE "contractor_memberships" DROP CONSTRAINT "contractor_memberships_user_contractor_unique";--> statement-breakpoint
ALTER TABLE "contractor_memberships" ADD COLUMN "project_id" uuid;--> statement-breakpoint
-- Backfill: existing memberships belong to the contractor's project (the app was single-project).
UPDATE "contractor_memberships" m SET "project_id" = pc."project_id" FROM "project_contractors" pc WHERE pc."contractor_id" = m."contractor_id" AND m."project_id" IS NULL;--> statement-breakpoint
-- Fallback for contractors without a project link: the first project, if any row is left.
UPDATE "contractor_memberships" SET "project_id" = (SELECT "id" FROM "projects" ORDER BY "created_at", "id" LIMIT 1) WHERE "project_id" IS NULL;--> statement-breakpoint
ALTER TABLE "contractor_memberships" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_memberships" ADD CONSTRAINT "contractor_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_memberships" ADD CONSTRAINT "contractor_memberships_user_contractor_project_unique" UNIQUE("user_id","contractor_id","project_id");

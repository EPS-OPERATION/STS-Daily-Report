ALTER TABLE "users" DROP CONSTRAINT "users_status_check";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_role_check";--> statement-breakpoint
-- Existing "eps" accounts are the seeded bootstrap administrators; operations-only staff get eps_site.
UPDATE "users" SET "role" = 'eps_admin' WHERE "role" = 'eps';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" IN ('active', 'pending', 'rejected', 'disabled'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('contractor', 'eps_site', 'eps_admin'));
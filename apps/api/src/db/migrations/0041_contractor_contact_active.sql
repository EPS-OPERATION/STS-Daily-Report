ALTER TABLE "contractors" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "active" boolean DEFAULT true NOT NULL;
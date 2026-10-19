CREATE TABLE "contractor_aliases" (
	"code" text PRIMARY KEY NOT NULL,
	"contractor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "is_contractor" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_aliases" ADD CONSTRAINT "contractor_aliases_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contractor_aliases_contractor_idx" ON "contractor_aliases" USING btree ("contractor_id");
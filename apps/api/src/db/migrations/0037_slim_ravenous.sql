CREATE TABLE "permit_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"label_th" text NOT NULL,
	"icon_key" text DEFAULT 'other' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permit_types_project_code_unique" UNIQUE("project_id","code")
);
--> statement-breakpoint
ALTER TABLE "daily_report_permits" DROP CONSTRAINT "daily_report_permits_type_check";--> statement-breakpoint
ALTER TABLE "permit_types" ADD CONSTRAINT "permit_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "permit_types_project_idx" ON "permit_types" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "daily_report_permits" ADD CONSTRAINT "daily_report_permits_type_check" CHECK (char_length("daily_report_permits"."permit_type") > 0);
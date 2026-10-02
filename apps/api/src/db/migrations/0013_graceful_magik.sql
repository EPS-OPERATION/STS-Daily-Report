CREATE TABLE "daily_report_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"material_name" text NOT NULL,
	"qty" numeric NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	CONSTRAINT "daily_report_materials_report_name_unit_unique" UNIQUE("report_id","material_name","unit"),
	CONSTRAINT "daily_report_materials_qty_check" CHECK ("daily_report_materials"."qty" > 0)
);
--> statement-breakpoint
ALTER TABLE "daily_report_materials" ADD CONSTRAINT "daily_report_materials_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_report_materials_report_idx" ON "daily_report_materials" USING btree ("report_id");
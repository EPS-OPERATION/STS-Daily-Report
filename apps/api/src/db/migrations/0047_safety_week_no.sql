ALTER TABLE "safety_findings" ADD COLUMN "week_start" date GENERATED ALWAYS AS (inspection_date - (extract(isodow from inspection_date)::int - 1)) STORED;--> statement-breakpoint
ALTER TABLE "safety_findings" ADD COLUMN "week_no" integer;--> statement-breakpoint
-- Existing findings: number 1..N inside each ISO week (Mon–Sun) by inspection date, then the old running number.
UPDATE "safety_findings" f SET "week_no" = n.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "project_id", "week_start" ORDER BY "inspection_date", "item_no") AS rn
  FROM "safety_findings"
) n
WHERE f."id" = n."id";--> statement-breakpoint
ALTER TABLE "safety_findings" ALTER COLUMN "week_no" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "safety_findings" ADD CONSTRAINT "safety_findings_project_week_no_unique" UNIQUE("project_id","week_start","week_no");--> statement-breakpoint
ALTER TABLE "safety_findings" ADD CONSTRAINT "safety_findings_week_no_check" CHECK ("safety_findings"."week_no" >= 1);

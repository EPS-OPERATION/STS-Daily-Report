CREATE TABLE "coordination_item_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"label_th" text NOT NULL,
	"icon_key" text DEFAULT 'map-pin' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_item_types_project_code_unique" UNIQUE("project_id","code"),
	CONSTRAINT "coordination_item_types_code_check" CHECK (char_length("coordination_item_types"."code") between 1 and 50)
);
--> statement-breakpoint
ALTER TABLE "coordination_items" DROP CONSTRAINT "coordination_items_icon_check";--> statement-breakpoint
ALTER TABLE "coordination_item_types" ADD CONSTRAINT "coordination_item_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coordination_item_types_project_idx" ON "coordination_item_types" USING btree ("project_id");--> statement-breakpoint
INSERT INTO "coordination_item_types" ("project_id", "code", "label", "label_th", "icon_key", "sort_order", "is_system")
SELECT p."id", v."code", v."label", v."label_th", v."icon_key", v."sort_order", true
FROM "projects" p
CROSS JOIN (VALUES
  ('crane', 'Crane', 'รถเครน', 'crane', 10),
  ('machinery', 'Machinery', 'เครื่องจักร', 'bulldozer', 20),
  ('truck', 'Truck', 'รถขนส่ง', 'truck', 30),
  ('weld', 'Welding', 'งานเชื่อม', 'fire', 40),
  ('pipe', 'Piping', 'งานท่อ', 'pipe', 50),
  ('box', 'Material laydown', 'จุดวางของ', 'package', 60),
  ('pin', 'Work point', 'จุดงาน', 'map-pin', 70),
  ('road', 'Road use', 'ใช้ถนน', 'road-horizon', 80),
  ('text', 'Text', 'ข้อความ', 'text-t', 90)
) AS v("code", "label", "label_th", "icon_key", "sort_order")
ON CONFLICT ("project_id", "code") DO NOTHING;
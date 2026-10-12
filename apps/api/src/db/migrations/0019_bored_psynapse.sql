CREATE TABLE "coordination_colors" (
	"project_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"color" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_colors_project_id_contractor_id_pk" PRIMARY KEY("project_id","contractor_id"),
	CONSTRAINT "coordination_colors_hex_check" CHECK ("coordination_colors"."color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "coordination_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"title" text NOT NULL,
	"icon" text NOT NULL,
	"x" numeric(9, 8) NOT NULL,
	"y" numeric(9, 8) NOT NULL,
	"rotation" numeric(7, 3) DEFAULT 0 NOT NULL,
	"area_kind" text NOT NULL,
	"geometry" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_items_xy_check" CHECK ("coordination_items"."x" BETWEEN 0 AND 1 AND "coordination_items"."y" BETWEEN 0 AND 1),
	CONSTRAINT "coordination_items_revision_check" CHECK ("coordination_items"."revision" > 0),
	CONSTRAINT "coordination_items_icon_check" CHECK ("coordination_items"."icon" IN ('crane','machinery','truck','weld','pipe','box','pin')),
	CONSTRAINT "coordination_items_area_kind_check" CHECK ("coordination_items"."area_kind" IN ('rectangle','polygon'))
);
--> statement-breakpoint
CREATE TABLE "coordination_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"image_path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coordination_maps_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "coordination_maps_dimensions_check" CHECK ("coordination_maps"."width" > 0 AND "coordination_maps"."height" > 0)
);
--> statement-breakpoint
ALTER TABLE "coordination_colors" ADD CONSTRAINT "coordination_colors_project_id_contractor_id_project_contractors_project_id_contractor_id_fk" FOREIGN KEY ("project_id","contractor_id") REFERENCES "public"."project_contractors"("project_id","contractor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_items" ADD CONSTRAINT "coordination_items_map_id_coordination_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."coordination_maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_items" ADD CONSTRAINT "coordination_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_items" ADD CONSTRAINT "coordination_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_items" ADD CONSTRAINT "coordination_items_project_id_contractor_id_project_contractors_project_id_contractor_id_fk" FOREIGN KEY ("project_id","contractor_id") REFERENCES "public"."project_contractors"("project_id","contractor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordination_maps" ADD CONSTRAINT "coordination_maps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coordination_items_project_date_idx" ON "coordination_items" USING btree ("project_id","work_date");
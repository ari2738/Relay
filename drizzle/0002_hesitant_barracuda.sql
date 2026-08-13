CREATE TABLE "saved_places" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"report_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"high_contrast" boolean DEFAULT false NOT NULL,
	"reduce_motion" boolean DEFAULT false NOT NULL,
	"notify_nearby_issues" boolean DEFAULT true NOT NULL,
	"notify_report_resolved" boolean DEFAULT true NOT NULL,
	"notify_volunteer_confirmed" boolean DEFAULT true NOT NULL,
	"notify_new_accessible_place" boolean DEFAULT false NOT NULL,
	"default_categories" text[],
	"default_statuses" text[],
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visited_places" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"report_id" integer NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visited_places" ADD CONSTRAINT "visited_places_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_places_user_report_idx" ON "saved_places" USING btree ("user_id","report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visited_places_user_report_idx" ON "visited_places" USING btree ("user_id","report_id");
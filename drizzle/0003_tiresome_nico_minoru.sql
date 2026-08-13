ALTER TABLE "reports" ADD COLUMN "ai_suggested_score" integer;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "ai_score_reasoning" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "ai_flagged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "ai_flag_reason" text;
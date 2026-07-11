CREATE TYPE "public"."filing_status" AS ENUM('received', 'under_review', 'approved', 'denied', 'lost');--> statement-breakpoint
CREATE TABLE "bureau_filings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"form_code" varchar(16) NOT NULL,
	"body" text NOT NULL,
	"status" "filing_status" DEFAULT 'received' NOT NULL,
	"clerk_note" text,
	"stamp_label" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_awards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" varchar(8) DEFAULT 'stamp' NOT NULL,
	"label" varchar(64) NOT NULL,
	"flavor" varchar(200),
	"source" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "submissions" CASCADE;--> statement-breakpoint
ALTER TABLE "mod_actions" DROP CONSTRAINT IF EXISTS "mod_actions_submission_id_submissions_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "mod_actions_submission_idx";--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "spirit_reply" text;--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "spirit_replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bureau_filings" ADD CONSTRAINT "bureau_filings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bureau_filings_user_idx" ON "bureau_filings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bureau_filings_status_idx" ON "bureau_filings" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "user_awards_user_idx" ON "user_awards" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "mod_actions" DROP COLUMN "submission_id";--> statement-breakpoint
DROP TYPE "public"."submission_medium";
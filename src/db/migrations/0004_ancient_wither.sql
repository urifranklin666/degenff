CREATE TYPE "public"."board_session_status" AS ENUM('live', 'locked');--> statement-breakpoint
CREATE TABLE "board_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"char" varchar(8) NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"text" varchar(200) DEFAULT '' NOT NULL,
	"status" "board_session_status" DEFAULT 'live' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"posted_message_id" varchar(32)
);
--> statement-breakpoint
ALTER TABLE "board_letters" ADD CONSTRAINT "board_letters_session_id_board_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_letters" ADD CONSTRAINT "board_letters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_letters_session_idx" ON "board_letters" USING btree ("session_id","at");--> statement-breakpoint
CREATE INDEX "board_letters_user_idx" ON "board_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "board_sessions_status_idx" ON "board_sessions" USING btree ("status","started_at");
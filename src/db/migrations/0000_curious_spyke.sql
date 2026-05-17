CREATE TYPE "public"."mod_action_kind" AS ENUM('approve', 'reject', 'edit', 'feature', 'unfeature', 'withdraw');--> statement-breakpoint
CREATE TYPE "public"."submission_medium" AS ENUM('image', 'audio', 'video', 'text', 'code', 'link', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('visitor', 'contributor', 'mod', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "discord_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" varchar(32) NOT NULL,
	"channel_name" varchar(100),
	"message_id" varchar(32) NOT NULL,
	"author_id" varchar(32) NOT NULL,
	"author_name" varchar(100),
	"author_avatar" text,
	"content_excerpt" varchar(280),
	"has_attachments" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feats" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"slug" varchar(96) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" varchar(320),
	"body_md" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"hero_image_path" text,
	"repo_url" text,
	"demo_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mod_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text,
	"feat_id" text,
	"mod_user_id" text,
	"action" "mod_action_kind" NOT NULL,
	"reason" text,
	"source" varchar(16) DEFAULT 'site' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"resets_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"medium" "submission_medium" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"body_html" text,
	"link_url" text,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nsfw" boolean DEFAULT false NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"submitter_ip" varchar(64),
	"submitter_ua" text,
	"discord_message_id" varchar(32),
	"discord_channel_id" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"discord_id" varchar(32) NOT NULL,
	"handle" varchar(64) NOT NULL,
	"display_name" varchar(96),
	"avatar_url" text,
	"email" varchar(255),
	"role" "user_role" DEFAULT 'contributor' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"banned_reason" text,
	"discord_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feats" ADD CONSTRAINT "feats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mod_actions" ADD CONSTRAINT "mod_actions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mod_actions" ADD CONSTRAINT "mod_actions_feat_id_feats_id_fk" FOREIGN KEY ("feat_id") REFERENCES "public"."feats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mod_actions" ADD CONSTRAINT "mod_actions_mod_user_id_users_id_fk" FOREIGN KEY ("mod_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_activity_msg_unique" ON "discord_activity" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "discord_activity_recent_idx" ON "discord_activity" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "feats_slug_unique" ON "feats" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "feats_status_idx" ON "feats" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "mod_actions_submission_idx" ON "mod_actions" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "mod_actions_feat_idx" ON "mod_actions" USING btree ("feat_id");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "submissions_medium_idx" ON "submissions" USING btree ("medium","created_at");--> statement-breakpoint
CREATE INDEX "submissions_user_idx" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_featured_idx" ON "submissions" USING btree ("featured","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_id_unique" ON "users" USING btree ("discord_id");--> statement-breakpoint
CREATE INDEX "users_handle_idx" ON "users" USING btree ("handle");
ALTER TABLE "users" ALTER COLUMN "discord_id" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "handle" SET DEFAULT 'anon';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp with time zone;
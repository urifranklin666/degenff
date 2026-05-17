ALTER TABLE "users" ALTER COLUMN "discord_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "discord_id" DROP NOT NULL;
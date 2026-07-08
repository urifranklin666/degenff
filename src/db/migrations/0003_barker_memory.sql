CREATE TABLE "barker_memory" (
	"channel_id" varchar(32) PRIMARY KEY NOT NULL,
	"gist" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

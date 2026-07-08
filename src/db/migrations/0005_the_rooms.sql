CREATE TABLE "room_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"user_id" text,
	"body" varchar(2000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" varchar(48) NOT NULL,
	"name" varchar(64) NOT NULL,
	"topic" varchar(200),
	"position" integer DEFAULT 0 NOT NULL,
	"mod_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_messages_room_idx" ON "room_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "room_messages_user_idx" ON "room_messages" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_slug_unique" ON "rooms" USING btree ("slug");--> statement-breakpoint
CREATE FUNCTION notify_room_message() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('room_msg', json_build_object('id', NEW.id, 'roomId', NEW.room_id)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER room_messages_notify AFTER INSERT ON "room_messages" FOR EACH ROW EXECUTE FUNCTION notify_room_message();--> statement-breakpoint
INSERT INTO "rooms" ("id", "slug", "name", "topic", "position") VALUES
  ('room-general-00', 'general', 'General', 'the arguing-about-fonts room. everyone is here. the dog is fine.', 0),
  ('room-lobby-0000', 'lobby', 'Lobby', 'first arrivals, greeted slowly, suspiciously.', 1),
  ('room-machine-00', 'machine-room', 'Machine Room', 'infrastructure talk. the R630 can hear you.', 2)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "users" ("id", "handle", "display_name", "role")
  VALUES ('the-barker-resident-1', 'the-barker', 'The Barker', 'contributor')
ON CONFLICT DO NOTHING;

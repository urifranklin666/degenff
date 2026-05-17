import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/* ── enums ─────────────────────────────────────────────────────────── */

export const submissionMedium = pgEnum("submission_medium", [
  "image",
  "audio",
  "video",
  "text",
  "code",
  "link",
  "mixed",
]);

export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

export const modActionKind = pgEnum("mod_action_kind", [
  "approve",
  "reject",
  "edit",
  "feature",
  "unfeature",
  "withdraw",
]);

export const userRole = pgEnum("user_role", ["visitor", "contributor", "mod", "admin"]);

/* ── core ──────────────────────────────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid(21)),
    discordId: varchar("discord_id", { length: 32 }).notNull(),
    handle: varchar("handle", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 96 }),
    avatarUrl: text("avatar_url"),
    email: varchar("email", { length: 255 }),
    role: userRole("role").notNull().default("contributor"),
    banned: boolean("banned").notNull().default(false),
    bannedReason: text("banned_reason"),
    discordRoles: jsonb("discord_roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_discord_id_unique").on(t.discordId),
    index("users_handle_idx").on(t.handle),
  ],
);

/* ── auth.js v5 tables (drizzle-adapter) ───────────────────────────── */

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ── submissions ───────────────────────────────────────────────────── */

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid(14)),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    medium: submissionMedium("medium").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    bodyHtml: text("body_html"),
    linkUrl: text("link_url"),
    /** array of { path, mime, bytes, width, height, durationMs } */
    files: jsonb("files").$type<Array<{
      path: string;
      mime: string;
      bytes: number;
      width?: number;
      height?: number;
      durationMs?: number;
    }>>().notNull().default(sql`'[]'::jsonb`),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    nsfw: boolean("nsfw").notNull().default(false),
    status: submissionStatus("status").notNull().default("pending"),
    featured: boolean("featured").notNull().default(false),
    submitterIp: varchar("submitter_ip", { length: 64 }),
    submitterUa: text("submitter_ua"),
    discordMessageId: varchar("discord_message_id", { length: 32 }),
    discordChannelId: varchar("discord_channel_id", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
  },
  (t) => [
    index("submissions_status_idx").on(t.status, t.createdAt),
    index("submissions_medium_idx").on(t.medium, t.createdAt),
    index("submissions_user_idx").on(t.userId),
    index("submissions_featured_idx").on(t.featured, t.createdAt),
  ],
);

/* ── feats (long-form coding showcases) ────────────────────────────── */

export const feats = pgTable(
  "feats",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid(14)),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    slug: varchar("slug", { length: 96 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 320 }),
    bodyMd: text("body_md").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    heroImagePath: text("hero_image_path"),
    repoUrl: text("repo_url"),
    demoUrl: text("demo_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    status: submissionStatus("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("feats_slug_unique").on(t.slug),
    index("feats_status_idx").on(t.status, t.publishedAt),
  ],
);

/* ── moderation audit ──────────────────────────────────────────────── */

export const modActions = pgTable(
  "mod_actions",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid(21)),
    submissionId: text("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
    featId: text("feat_id").references(() => feats.id, { onDelete: "cascade" }),
    modUserId: text("mod_user_id").references(() => users.id, { onDelete: "set null" }),
    action: modActionKind("action").notNull(),
    reason: text("reason"),
    source: varchar("source", { length: 16 }).notNull().default("site"), // 'site' | 'discord'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mod_actions_submission_idx").on(t.submissionId),
    index("mod_actions_feat_idx").on(t.featId),
  ],
);

/* ── discord activity cache (for the live pulse on the homepage) ───── */

export const discordActivity = pgTable(
  "discord_activity",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid(21)),
    channelId: varchar("channel_id", { length: 32 }).notNull(),
    channelName: varchar("channel_name", { length: 100 }),
    messageId: varchar("message_id", { length: 32 }).notNull(),
    authorId: varchar("author_id", { length: 32 }).notNull(),
    authorName: varchar("author_name", { length: 100 }),
    authorAvatar: text("author_avatar"),
    contentExcerpt: varchar("content_excerpt", { length: 280 }),
    hasAttachments: boolean("has_attachments").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("discord_activity_msg_unique").on(t.messageId),
    index("discord_activity_recent_idx").on(t.createdAt),
  ],
);

/* ── rate limiting ─────────────────────────────────────────────────── */

export const rateLimit = pgTable(
  "rate_limit",
  {
    key: varchar("key", { length: 128 }).primaryKey(),
    count: integer("count").notNull().default(0),
    resetsAt: timestamp("resets_at", { withTimezone: true }).notNull(),
  },
);

/* ── relations ─────────────────────────────────────────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  feats: many(feats),
  modActions: many(modActions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  author: one(users, { fields: [submissions.userId], references: [users.id] }),
  decider: one(users, { fields: [submissions.decidedBy], references: [users.id] }),
  actions: many(modActions),
}));

export const featsRelations = relations(feats, ({ one, many }) => ({
  author: one(users, { fields: [feats.userId], references: [users.id] }),
  actions: many(modActions),
}));

export const modActionsRelations = relations(modActions, ({ one }) => ({
  submission: one(submissions, { fields: [modActions.submissionId], references: [submissions.id] }),
  feat: one(feats, { fields: [modActions.featId], references: [feats.id] }),
  mod: one(users, { fields: [modActions.modUserId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Feat = typeof feats.$inferSelect;
export type NewFeat = typeof feats.$inferInsert;
export type ModAction = typeof modActions.$inferSelect;
export type DiscordActivity = typeof discordActivity.$inferSelect;

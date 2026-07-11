import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { users, boardSessions, boardLetters } = schema;

/**
 * REST-only Discord notification used by the web app (server actions).
 * No discord.js import on this side — discord.js drags in optional native
 * modules Turbopack can't bundle. Plain fetch + JSON is cheap and avoids
 * pinning the web bundle to discord.js internals.
 */
const SITE = "https://degeneratefuckface.com";

function buildFeatEmbed(f: (typeof schema)["feats"]["$inferSelect"], authorHandle: string) {
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "by", value: `@${authorHandle}`, inline: true },
    { name: "slug", value: `\`${f.slug}\``, inline: true },
  ];
  if (f.repoUrl) fields.push({ name: "repo", value: f.repoUrl });
  if (f.demoUrl) fields.push({ name: "demo", value: f.demoUrl });
  if (f.tags?.length) fields.push({
    name: "tags",
    value: f.tags.slice(0, 12).map((t) => `\`${t}\``).join(" "),
  });

  const embed: Record<string, unknown> = {
    title: `⬢  ${f.title}`,
    url: `${SITE}/feats/${f.slug}`,
    description: (f.summary ?? f.bodyMd.slice(0, 600)).slice(0, 1900),
    color: 0xcc0000,
    fields,
    footer: { text: `feat id ${f.id} · ${new Date(f.createdAt).toISOString()}` },
  };
  if (f.heroImagePath) {
    embed.image = { url: `${SITE}/uploads/${f.heroImagePath}` };
  }
  return embed;
}

function buildFeatModRow(featId: string) {
  return {
    type: 1,
    components: [
      { type: 2, style: 3, label: "Approve", custom_id: `feat:approve:${featId}` },
      { type: 2, style: 1, label: "Feature", custom_id: `feat:feature:${featId}` },
      { type: 2, style: 4, label: "Reject",  custom_id: `feat:reject:${featId}` },
      { type: 2, style: 5, label: "Open on site", url: `${SITE}/feats` },
    ],
  };
}

export async function notifyNewFeat(featId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_MOD_QUEUE_CHANNEL_ID;
  if (!token || !channelId) return;

  const f = await db.query.feats.findFirst({
    where: eq(schema.feats.id, featId),
  });
  if (!f) return;
  const author = f.userId
    ? await db.query.users.findFirst({ where: eq(users.id, f.userId) })
    : null;

  const r = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [buildFeatEmbed(f, author?.handle ?? "anon")],
        components: [buildFeatModRow(f.id)],
      }),
    },
  );
  if (!r.ok) throw new Error(`discord feat post ${r.status}`);
}

export async function notifyBoardLocked(sessionId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId =
    process.env.DISCORD_BOARD_CHANNEL_ID || process.env.DISCORD_SHOWCASE_CHANNEL_ID;
  if (!token || !channelId) return;

  const sess = await db.query.boardSessions.findFirst({
    where: eq(boardSessions.id, sessionId),
  });
  if (!sess) return;

  const letterRows = await db
    .select({ userId: boardLetters.userId, handle: users.handle })
    .from(boardLetters)
    .innerJoin(users, eq(boardLetters.userId, users.id))
    .where(eq(boardLetters.sessionId, sessionId));

  const seen = new Set<string>();
  const cosigners: string[] = [];
  for (const row of letterRows) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    cosigners.push(`@${row.handle}`);
  }

  const embed = {
    title: "▒  The planchette stopped.",
    url: `${SITE}/board`,
    description: `> ${sess.text}`,
    color: 0xcc0000,
    fields: cosigners.length
      ? [{ name: "fingers on it", value: cosigners.slice(0, 25).join(" · ") }]
      : [],
    footer: { text: `session ${sess.id} · ${new Date(sess.lockedAt ?? sess.startedAt).toISOString()}` },
  };

  const r = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    },
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`discord board post ${r.status}: ${text.slice(0, 200)}`);
  }
  const message = (await r.json()) as { id: string };
  await db
    .update(boardSessions)
    .set({ postedMessageId: message.id })
    .where(eq(boardSessions.id, sessionId));
}


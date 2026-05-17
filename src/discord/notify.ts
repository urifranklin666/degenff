import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { submissions, users } = schema;

/**
 * REST-only Discord notification used by the web app (server actions).
 * No discord.js import on this side — discord.js drags in optional native
 * modules Turbopack can't bundle. Plain fetch + JSON is cheap and avoids
 * pinning the web bundle to discord.js internals.
 */
const SITE = "https://degeneratefuckface.com";

const MEDIUM_GLYPH: Record<string, string> = {
  image: "◈", audio: "◐", video: "▶",
  text: "✎", code: "⌬", link: "↗", mixed: "✻",
};

type Submission = (typeof schema)["submissions"]["$inferSelect"];

function buildEmbed(s: Submission, authorHandle: string) {
  const glyph = MEDIUM_GLYPH[s.medium] ?? "◇";
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "by", value: `@${authorHandle}`, inline: true },
    { name: "medium", value: s.medium, inline: true },
    { name: "nsfw", value: s.nsfw ? "yes" : "no", inline: true },
  ];
  if (s.tags && s.tags.length > 0) {
    fields.push({
      name: "tags",
      value: s.tags.slice(0, 12).map((t) => `\`${t}\``).join(" "),
    });
  }
  if (s.linkUrl) fields.push({ name: "link", value: s.linkUrl });

  const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));
  const embed: Record<string, unknown> = {
    title: `${glyph}  ${s.title}`,
    url: `${SITE}/submissions/${s.id}`,
    description: (s.body ?? "_no body_").slice(0, 1900),
    color: 0xcc0000,
    fields,
    footer: { text: `id ${s.id} · ${new Date(s.createdAt).toISOString()}` },
  };
  if (firstImage) {
    embed.image = { url: `${SITE}/uploads/${firstImage.path}` };
  }
  return embed;
}

function buildModRow(submissionId: string) {
  return {
    type: 1, // ACTION_ROW
    components: [
      { type: 2, style: 3, label: "Approve", custom_id: `sub:approve:${submissionId}` },
      { type: 2, style: 1, label: "Feature", custom_id: `sub:feature:${submissionId}` },
      { type: 2, style: 4, label: "Reject",  custom_id: `sub:reject:${submissionId}` },
      { type: 2, style: 5, label: "Open on site", url: `${SITE}/mod` },
    ],
  };
}

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

export async function notifyNewSubmission(submissionId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_MOD_QUEUE_CHANNEL_ID;
  if (!token || !channelId) return;

  const s = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!s) return;
  const author = s.userId
    ? await db.query.users.findFirst({ where: eq(users.id, s.userId) })
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
        embeds: [buildEmbed(s, author?.handle ?? "anon")],
        components: [buildModRow(s.id)],
      }),
    },
  );

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`discord post ${r.status}: ${text.slice(0, 200)}`);
  }

  const message = (await r.json()) as { id: string };
  await db.update(submissions)
    .set({ discordMessageId: message.id, discordChannelId: channelId })
    .where(eq(submissions.id, submissionId));
}

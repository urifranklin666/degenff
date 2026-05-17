import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import type { schema } from "@/db";

type Submission = (typeof schema)["submissions"]["$inferSelect"];
type Feat = (typeof schema)["feats"]["$inferSelect"];

const COLORS = {
  pending: 0xcc0000,
  approved: 0xff2222,
  rejected: 0x4a0000,
  featured: 0xff2e7c,
};

const MEDIUM_GLYPH: Record<string, string> = {
  image: "◈",
  audio: "◐",
  video: "▶",
  text: "✎",
  code: "⌬",
  link: "↗",
  mixed: "✻",
};

export function submissionQueueEmbed(s: Submission, authorHandle: string) {
  const glyph = MEDIUM_GLYPH[s.medium] ?? "◇";
  const e = new EmbedBuilder()
    .setColor(COLORS.pending)
    .setTitle(`${glyph}  ${s.title}`)
    .setURL(`https://degeneratefuckface.com/submissions/${s.id}`)
    .setDescription((s.body ?? "_no body_").slice(0, 1900))
    .addFields(
      { name: "by", value: `@${authorHandle}`, inline: true },
      { name: "medium", value: s.medium, inline: true },
      { name: "nsfw", value: s.nsfw ? "yes" : "no", inline: true },
    )
    .setFooter({ text: `id ${s.id} · ${new Date(s.createdAt).toISOString()}` });

  if (s.tags && s.tags.length > 0) {
    e.addFields({
      name: "tags",
      value: s.tags.slice(0, 12).map((t) => `\`${t}\``).join(" "),
    });
  }
  if (s.linkUrl) {
    e.addFields({ name: "link", value: s.linkUrl });
  }
  const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));
  if (firstImage) {
    e.setImage(`https://degeneratefuckface.com/uploads/${firstImage.path}`);
  }

  return e;
}

export function modActionRow(submissionId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`sub:approve:${submissionId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`sub:feature:${submissionId}`)
      .setLabel("Feature")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`sub:reject:${submissionId}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`sub:view:${submissionId}`)
      .setLabel("Open on site")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://degeneratefuckface.com/mod/${submissionId}`),
  );
}

export function showcaseEmbed(s: Submission, authorHandle: string) {
  return submissionQueueEmbed(s, authorHandle)
    .setColor(s.featured ? COLORS.featured : COLORS.approved)
    .setURL(`https://degeneratefuckface.com/submissions/${s.id}`);
}

/** Buttons attached to a submission's showcase mirror message.
 * Always has Withdraw + Open. Adds Unfeature if currently featured. */
export function submissionShowcaseRow(submissionId: string, featured: boolean) {
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (featured) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`sub:unfeature:${submissionId}`)
        .setLabel("Unfeature")
        .setStyle(ButtonStyle.Secondary),
    );
  }
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`sub:withdraw:${submissionId}`)
      .setLabel("Withdraw")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setLabel("Open on site")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://degeneratefuckface.com/submissions/${submissionId}`),
  );
  return row;
}

/** Buttons attached to a feat's showcase mirror message. Feats have no
 * 'featured' flag, so just Withdraw + Open. */
export function featShowcaseRow(featSlug: string, featId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`feat:withdraw:${featId}`)
      .setLabel("Withdraw")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setLabel("Open on site")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://degeneratefuckface.com/feats/${featSlug}`),
  );
}

export function featQueueEmbed(f: Feat, authorHandle: string) {
  return new EmbedBuilder()
    .setColor(COLORS.pending)
    .setTitle(`⬢  ${f.title}`)
    .setURL(`https://degeneratefuckface.com/feats/${f.slug}`)
    .setDescription((f.summary ?? "").slice(0, 1900))
    .addFields(
      { name: "by", value: `@${authorHandle}`, inline: true },
      f.repoUrl ? { name: "repo", value: f.repoUrl, inline: true } : { name: "​", value: "​", inline: true },
      f.demoUrl ? { name: "demo", value: f.demoUrl, inline: true } : { name: "​", value: "​", inline: true },
    )
    .setFooter({ text: `id ${f.id}` });
}

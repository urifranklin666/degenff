import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import type { schema } from "@/db";

type Feat = (typeof schema)["feats"]["$inferSelect"];

const COLORS = {
  pending: 0xcc0000,
  approved: 0xff2222,
  rejected: 0x4a0000,
  featured: 0xff2e7c,
};

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

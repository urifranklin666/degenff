import {
  type GuildMember,
  type PartialGuildMember,
  EmbedBuilder,
  type TextChannel,
  ChannelType,
} from "discord.js";

/**
 * The Doorman — manifesto-voice welcome for new members. Posts to
 * DISCORD_WELCOME_CHANNEL_ID. No-ops if the env var is missing.
 */

const WELCOME_LINES = [
  "the door was locked from the inside · we have already let you in",
  "shoes off · no attorney present · consent implied",
  "you were not invited · the invitation was sent to the wrong address · on purpose",
  "step right up · proceed voluntarily · do not feed the moderators",
  "subject enrolled · file open · evidence pending",
  "we have been expecting you for some time",
  "the carpet is older than you are · please be careful with it",
  "no refunds. no escorts. no comment.",
];

export async function onGuildMemberAdd(member: GuildMember | PartialGuildMember) {
  const channelId = process.env.DISCORD_WELCOME_CHANNEL_ID;
  if (!channelId) return;
  if (member.partial) {
    try { await member.fetch(); } catch { return; }
  }
  const full = member as GuildMember;

  const ch = await full.client.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return;

  const line = WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)];
  const fileNo = ((Date.now() >>> 0) % 1000).toString().padStart(3, "0");

  const embed = new EmbedBuilder()
    .setColor(0xcc0000)
    .setTitle(`◆ subject · @${full.user.username} has entered the room`)
    .setDescription(line)
    .setThumbnail(full.user.displayAvatarURL({ size: 128 }))
    .setFooter({ text: `// file no·${fileNo} · evidence locker open` })
    .setTimestamp();

  await (ch as TextChannel).send({
    content: `<@${full.id}> ↗`,
    embeds: [embed],
  }).catch((err) => console.error("[doorman] send failed:", err));
}

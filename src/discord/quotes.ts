import {
  type MessageReaction,
  type PartialMessageReaction,
  type User,
  type PartialUser,
  EmbedBuilder,
  type TextChannel,
  ChannelType,
} from "discord.js";

/**
 * The Steno — react with the quote emoji on any message, the bot reposts
 * it as a stamped embed to DISCORD_QUOTE_CHANNEL_ID. Default emoji is 📋
 * (configurable via DISCORD_QUOTE_EMOJI). In-memory dedup; resets on
 * bot restart.
 */

const quoted = new Set<string>();
const MAX_TRACK = 5000;

function trackQuoted(id: string) {
  quoted.add(id);
  if (quoted.size > MAX_TRACK) {
    // simple eviction: drop the oldest half
    const arr = Array.from(quoted);
    quoted.clear();
    for (const k of arr.slice(MAX_TRACK / 2)) quoted.add(k);
  }
}

export async function onMessageReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) {
  const channelId = process.env.DISCORD_QUOTE_CHANNEL_ID;
  if (!channelId) return;
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  const targetEmoji = process.env.DISCORD_QUOTE_EMOJI || "📋";
  // Normalize the U+FE0F "emoji-presentation" variation selector on both
  // sides — Discord sometimes returns reactions with or without it, and
  // env files saved in different editors can lose it.
  const stripVS = (s: string) => s.replace(/️/g, "");
  if (stripVS(reaction.emoji.name ?? "") !== stripVS(targetEmoji)) return;

  const msg = reaction.message;
  if (msg.partial) {
    try { await msg.fetch(); } catch { return; }
  }
  if (!msg.id) return;
  if (msg.author?.bot) return;
  if (quoted.has(msg.id)) return;
  trackQuoted(msg.id);

  const ch = await msg.client.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return;

  const author = msg.author;
  const channelName =
    msg.channel && "name" in msg.channel ? msg.channel.name : "channel";

  const embed = new EmbedBuilder()
    .setColor(0xff2222)
    .setAuthor({
      name: author ? `@${author.username}` : "anon",
      iconURL: author?.displayAvatarURL({ size: 64 }),
    })
    .setDescription((msg.content || "_(no text · attachment only)_").slice(0, 1900))
    .addFields({
      name: "⛓",
      value: `[jump to message](${msg.url})`,
      inline: true,
    })
    .setFooter({ text: `on the record · #${channelName}` })
    .setTimestamp(msg.createdAt ?? new Date());

  const firstImage = msg.attachments?.first();
  if (firstImage?.contentType?.startsWith("image/")) {
    embed.setImage(firstImage.url);
  }

  await (ch as TextChannel).send({ embeds: [embed] })
    .catch((err) => console.error("[steno] send failed:", err));

  // stamp the original with a *different* emoji so users can tell their
  // react landed (vs. just seeing their own trigger emoji echo back)
  await msg.react("📌").catch(() => {});
}

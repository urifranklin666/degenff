import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type ButtonInteraction,
  type GuildMember,
  type GuildMemberRoleManager,
  type TextChannel,
} from "discord.js";

/**
 * Verification gate. Drive-by raid scripts mass-join + spam; they don't
 * click buttons or read context. A single click-through + one-question
 * pick removes 99%+ of drive-by spam at near-zero friction for humans.
 *
 *   1. Admin runs /setup-verify once → bot posts the gate message.
 *   2. New user clicks "proceed voluntarily" → ephemeral question.
 *   3. Right answer → bot grants DISCORD_VERIFIED_ROLE_ID.
 *
 * Discord-side config (not in code): @everyone sees only #verify;
 * @verified unlocks the rest of the server.
 */

type Question = { q: string; options: { label: string; correct: boolean }[] };

const QUESTIONS: Question[] = [
  {
    q: "what does the goose say?",
    options: [
      { label: "the goose has spoken", correct: true },
      { label: "GET HACKED LOL", correct: false },
      { label: "click here for free nitro", correct: false },
      { label: "honk honk im a normal goose", correct: false },
    ],
  },
  {
    q: "what was found on the body?",
    options: [
      { label: "the receipts", correct: true },
      { label: "an itemized invoice from heaven", correct: false },
      { label: "my wallet seed phrase", correct: false },
      { label: "definitely not the rest of him", correct: false },
    ],
  },
  {
    q: "the door is locked from which side?",
    options: [
      { label: "the inside", correct: true },
      { label: "the outside", correct: false },
      { label: "the bot side", correct: false },
      { label: "all sides at once", correct: false },
    ],
  },
  {
    q: "boring is a what?",
    options: [
      { label: "a moderation reason", correct: true },
      { label: "an aesthetic", correct: false },
      { label: "vibe", correct: false },
      { label: "compliment", correct: false },
    ],
  },
  {
    q: "what is implied by your continued scrolling?",
    options: [
      { label: "consent", correct: true },
      { label: "a binding contract", correct: false },
      { label: "subscription to our newsletter", correct: false },
      { label: "we now own your firstborn", correct: false },
    ],
  },
];

export function buildVerifyMessage() {
  const embed = new EmbedBuilder()
    .setColor(0xcc0000)
    .setTitle("◆ checkpoint · degenerate or death")
    .setDescription(
      "you have arrived at a door.\n" +
      "the door is locked from the inside.\n" +
      "you will not be let in unless you say so.\n\n" +
      "**click below to proceed voluntarily.**\n" +
      "*(one question. takes ten seconds. no attorney present.)*",
    )
    .setFooter({ text: "// shoes off · consent implied" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("verify:start")
      .setLabel("proceed voluntarily")
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

export async function onVerifyStart(interaction: ButtonInteraction) {
  const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
  if (!roleId) {
    await interaction.reply({
      content: "verified role not configured. tell an admin.",
      ephemeral: true,
    });
    return;
  }

  // already verified? short-circuit
  const member = interaction.member as GuildMember | null;
  if (member && (member.roles as GuildMemberRoleManager).cache?.has(roleId)) {
    await interaction.reply({
      content: "already enrolled. proceed.",
      ephemeral: true,
    });
    return;
  }

  const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const shuffled = [...question.options].sort(() => Math.random() - 0.5);

  const embed = new EmbedBuilder()
    .setColor(0xff2222)
    .setTitle("◆ checkpoint · question")
    .setDescription(`*${question.q}*`)
    .setFooter({ text: "// pick one · no attorney present" });

  // All buttons styled identically so the user can't pick the right answer
  // by looking at the button color.
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const opt of shuffled) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`verify:ans:${opt.correct ? "yes" : "no"}`)
        .setLabel(opt.label.slice(0, 80))
        .setStyle(ButtonStyle.Secondary),
    );
  }

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

export async function onVerifyAnswer(interaction: ButtonInteraction) {
  const correct = interaction.customId === "verify:ans:yes";

  if (!correct) {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x4a0000)
          .setTitle("◆ wrong door")
          .setDescription("try again. there is no penalty. proceed voluntarily.")
          .setFooter({ text: "// click 'proceed voluntarily' to re-roll" }),
      ],
      components: [],
    });
    return;
  }

  const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
  if (!roleId) {
    await interaction.update({
      content: "verified role not configured. tell an admin.",
      embeds: [],
      components: [],
    });
    return;
  }

  const member = interaction.member as GuildMember | null;
  if (!member) {
    await interaction.update({
      content: "couldn't read your membership. try again from the verify channel.",
      embeds: [],
      components: [],
    });
    return;
  }

  try {
    await member.roles.add(roleId, "verified via /verify gate");
  } catch (err) {
    console.error("[verify] role grant failed:", err);
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x4a0000)
          .setTitle("◆ couldn't file you")
          .setDescription(
            "the bot couldn't add the verified role. tell an admin — likely a permission/role-hierarchy issue.",
          ),
      ],
      components: [],
    });
    return;
  }

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0xff2222)
        .setTitle("◆ enrolled")
        .setDescription(
          "you are filed. the rest of the room is now visible to you.\n\n" +
          "**proceed voluntarily.**",
        )
        .setFooter({ text: "// no refunds were issued. none requested." }),
    ],
    components: [],
  });
}

/** Posts the verification message to DISCORD_VERIFY_CHANNEL_ID. Called by /setup-verify. */
export async function postVerifyMessage(interaction: import("discord.js").ChatInputCommandInteraction) {
  const channelId = process.env.DISCORD_VERIFY_CHANNEL_ID;
  if (!channelId) {
    await interaction.reply({
      content: "DISCORD_VERIFY_CHANNEL_ID not set in /etc/degenff/env.",
      ephemeral: true,
    });
    return;
  }

  const ch = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "verify channel not found or not a text channel.",
      ephemeral: true,
    });
    return;
  }

  await (ch as TextChannel).send(buildVerifyMessage());
  await interaction.reply({
    content: `verification gate posted in <#${channelId}>. pin it if you haven't.`,
    ephemeral: true,
  });
}

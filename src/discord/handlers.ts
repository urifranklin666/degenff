import {
  type ButtonInteraction,
  type Client,
  type GuildMember,
  EmbedBuilder,
  type TextChannel,
  ChannelType,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { showcaseEmbed, submissionQueueEmbed } from "./embeds";

const { submissions, modActions, users } = schema;

export async function onSubmissionButton(interaction: ButtonInteraction) {
  const [, action, submissionId] = interaction.customId.split(":");
  if (!submissionId) return;

  // identify the acting mod via the discord user id of the click
  const actingDiscordId = interaction.user.id;
  const mod = await db.query.users.findFirst({
    where: eq(users.discordId, actingDiscordId),
  });
  const modUserId = mod?.id ?? null;

  if (action === "approve") return approve(interaction, submissionId, modUserId);
  if (action === "feature") return approve(interaction, submissionId, modUserId, true);
  if (action === "reject")  return reject(interaction, submissionId, modUserId);
}

async function approve(
  interaction: ButtonInteraction,
  submissionId: string,
  modUserId: string | null,
  feature = false,
) {
  const s = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!s) return interaction.reply({ content: "Submission missing.", ephemeral: true });
  if (s.status === "approved")
    return interaction.reply({ content: "Already approved.", ephemeral: true });

  await db.update(submissions)
    .set({
      status: "approved",
      featured: feature,
      decidedAt: new Date(),
      decidedBy: modUserId,
    })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId,
    action: feature ? "feature" : "approve",
    source: "discord",
  });

  // mirror to #showcase
  const showcaseChannelId = process.env.DISCORD_SHOWCASE_CHANNEL_ID;
  if (showcaseChannelId) {
    const ch = await interaction.client.channels.fetch(showcaseChannelId);
    if (ch && ch.type === ChannelType.GuildText) {
      const author = await db.query.users.findFirst({ where: eq(users.id, s.userId!) });
      const embed = showcaseEmbed({ ...s, featured: feature, status: "approved" }, author?.handle ?? "anon");
      await (ch as TextChannel).send({ embeds: [embed] });
    }
  }

  await interaction.update({
    embeds: [
      submissionQueueEmbed(
        { ...s, status: "approved", featured: feature },
        (await db.query.users.findFirst({ where: eq(users.id, s.userId!) }))?.handle ?? "anon",
      ).setColor(feature ? 0xff2e7c : 0xff2222),
    ],
    components: [],
    content: `✔ ${feature ? "FEATURED" : "Approved"} by <@${interaction.user.id}>`,
  });
}

async function reject(
  interaction: ButtonInteraction,
  submissionId: string,
  modUserId: string | null,
) {
  const s = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!s) return interaction.reply({ content: "Submission missing.", ephemeral: true });

  await db.update(submissions)
    .set({
      status: "rejected",
      decidedAt: new Date(),
      decidedBy: modUserId,
      rejectionReason: "Rejected via Discord (no reason given)",
    })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId,
    action: "reject",
    source: "discord",
  });

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x4a0000)
        .setTitle("✘ Rejected")
        .setDescription(`Rejected by <@${interaction.user.id}>`)
        .setFooter({ text: `id ${submissionId}` }),
    ],
    components: [],
  });
}

export async function onGuildMemberUpdate(_oldMember: GuildMember, newMember: GuildMember) {
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
  const modRoleId = process.env.DISCORD_MOD_ROLE_ID;

  const roleIds = newMember.roles.cache.map((r) => r.id);
  let role: "admin" | "mod" | "contributor" = "contributor";
  if (adminRoleId && roleIds.includes(adminRoleId)) role = "admin";
  else if (modRoleId && roleIds.includes(modRoleId)) role = "mod";

  await db.update(users)
    .set({ role, discordRoles: roleIds })
    .where(eq(users.discordId, newMember.user.id));
}

export function registerHandlers(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("sub:")) return;
    try {
      await onSubmissionButton(interaction);
    } catch (err) {
      console.error("[bot] interaction failed:", err);
      if (!interaction.replied) {
        await interaction.reply({ content: "Something went wrong.", ephemeral: true });
      }
    }
  });

  client.on("guildMemberUpdate", async (oldM, newM) => {
    try {
      await onGuildMemberUpdate(oldM as GuildMember, newM as GuildMember);
    } catch (err) {
      console.error("[bot] member update failed:", err);
    }
  });

  client.on("ready", (c) => {
    console.log(`[bot] logged in as ${c.user.tag}`);
  });
}

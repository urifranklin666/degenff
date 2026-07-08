import {
  type ButtonInteraction,
  type Client,
  type GuildMember,
  EmbedBuilder,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { submissionQueueEmbed, showcaseEmbed, submissionShowcaseRow } from "./embeds";
import { onGuildMemberAdd } from "./welcome";
import { onMessageReactionAdd } from "./quotes";
import { registerSlashCommands, onChatInputCommand } from "./slashCommands";
import { startScheduler } from "./scheduler";
import { onVerifyStart, onVerifyAnswer } from "./verify";
import { registerConverse } from "./converse";
import { onVoiceStateUpdate, registerVoiceChat } from "./voicechat";
import {
  approveSubmission,
  rejectSubmission,
  withdrawSubmission,
  unfeatureSubmission,
  approveFeat,
  rejectFeat,
  withdrawFeat,
  type ActionContext,
} from "./actions";

const { submissions, users } = schema;

const COLOR = {
  approved: 0xff2222,
  featured: 0xff2e7c,
  rejected: 0x4a0000,
  withdrawn: 0x2b0000,
};

/** Look up the clicking Discord user and assert they have mod/admin role.
 * Returns the local users.id on success, null otherwise (and sends an
 * ephemeral reply). Use the return value as your modUserId for audit rows. */
async function requireMod(interaction: ButtonInteraction): Promise<string | null> {
  const mod = await db.query.users.findFirst({
    where: eq(users.discordId, interaction.user.id),
  });
  if (!mod || (mod.role !== "mod" && mod.role !== "admin")) {
    await interaction.reply({
      content: "You don't have the role for that.",
      ephemeral: true,
    });
    return null;
  }
  return mod.id;
}

/* ── submissions ─────────────────────────────────────────────────────── */

export async function onSubmissionButton(interaction: ButtonInteraction) {
  const [, action, submissionId] = interaction.customId.split(":");
  if (!submissionId) return;

  const modUserId = await requireMod(interaction);
  if (!modUserId) return;

  if (action === "approve")   return approve(interaction, submissionId, modUserId);
  if (action === "feature")   return approve(interaction, submissionId, modUserId, true);
  if (action === "reject")    return reject(interaction, submissionId, modUserId);
  if (action === "withdraw")  return withdraw(interaction, submissionId, modUserId);
  if (action === "unfeature") return unfeature(interaction, submissionId, modUserId);
}

async function approve(
  interaction: ButtonInteraction,
  submissionId: string,
  modUserId: string,
  feature = false,
) {
  const ctx: ActionContext = { client: interaction.client, modUserId, source: "discord" };
  const result = await approveSubmission(ctx, submissionId, { feature });
  if (!result.ok) return interaction.reply({ content: result.error, ephemeral: true });

  // Re-fetch to re-render the queue card in place.
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return;
  await interaction.update({
    embeds: [
      submissionQueueEmbed(
        { ...s, status: "approved", featured: feature },
        result.data.authorHandle,
      ).setColor(feature ? COLOR.featured : COLOR.approved),
    ],
    components: [],
    content: `✔ ${feature ? "FEATURED" : "Approved"} by <@${interaction.user.id}>`,
  });
}

async function reject(
  interaction: ButtonInteraction,
  submissionId: string,
  modUserId: string,
) {
  const ctx: ActionContext = { client: interaction.client, modUserId, source: "discord" };
  const result = await rejectSubmission(ctx, submissionId);
  if (!result.ok) return interaction.reply({ content: result.error, ephemeral: true });

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR.rejected)
        .setTitle("✘ Rejected")
        .setDescription(`Rejected by <@${interaction.user.id}>`)
        .setFooter({ text: `id ${submissionId}` }),
    ],
    components: [],
  });
}

async function withdraw(
  interaction: ButtonInteraction,
  submissionId: string,
  modUserId: string,
) {
  const ctx: ActionContext = { client: interaction.client, modUserId, source: "discord" };
  const result = await withdrawSubmission(ctx, submissionId);
  if (!result.ok) return interaction.reply({ content: result.error, ephemeral: true });

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR.withdrawn)
        .setTitle(`↘ Withdrawn: ${result.data.title}`)
        .setDescription(`Pulled from public gallery by <@${interaction.user.id}>.`)
        .setFooter({ text: `id ${submissionId}` }),
    ],
    components: [],
  });
}

async function unfeature(
  interaction: ButtonInteraction,
  submissionId: string,
  modUserId: string,
) {
  const ctx: ActionContext = { client: interaction.client, modUserId, source: "discord" };
  const result = await unfeatureSubmission(ctx, submissionId);
  if (!result.ok) return interaction.reply({ content: result.error, ephemeral: true });

  // Re-fetch & re-render the showcase card with the "approved (not featured)"
  // palette and a row that no longer has the Unfeature button.
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return;
  const updated = showcaseEmbed(
    { ...s, featured: false },
    result.data.authorHandle,
  ).setColor(COLOR.approved);

  await interaction.update({
    embeds: [updated],
    components: [submissionShowcaseRow(submissionId, false)],
    content: `↘ Unfeatured by <@${interaction.user.id}>`,
  });
}

/* ── feats ───────────────────────────────────────────────────────────── */

export async function onFeatButton(interaction: ButtonInteraction) {
  const [, action, featId] = interaction.customId.split(":");
  if (!featId) return;

  const modUserId = await requireMod(interaction);
  if (!modUserId) return;

  const ctx: ActionContext = { client: interaction.client, modUserId, source: "discord" };

  if (action === "approve" || action === "feature") {
    const result = await approveFeat(ctx, featId, { feature: action === "feature" });
    if (!result.ok) return interaction.reply({ content: result.error, ephemeral: true });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(action === "feature" ? COLOR.featured : COLOR.approved)
          .setTitle(`✔ ${action === "feature" ? "FEATURED" : "Approved"}: ${result.data.title}`)
          .setDescription(`by <@${interaction.user.id}> · /feats/${result.data.slug}`)
          .setURL(result.data.url),
      ],
      components: [],
    });
    return;
  }

  if (action === "reject") {
    const result = await rejectFeat(ctx, featId);
    if (!result.ok) return interaction.reply({ content: result.error, ephemeral: true });
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR.rejected)
          .setTitle("✘ Rejected")
          .setDescription(`Rejected by <@${interaction.user.id}>`)
          .setFooter({ text: `feat id ${featId}` }),
      ],
      components: [],
    });
    return;
  }

  if (action === "withdraw") {
    const result = await withdrawFeat(ctx, featId);
    if (!result.ok) return interaction.reply({ content: result.error, ephemeral: true });
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR.withdrawn)
          .setTitle(`↘ Withdrawn: ${result.data.title}`)
          .setDescription(`Pulled by <@${interaction.user.id}>. /feats/${result.data.slug} no longer public.`)
          .setFooter({ text: `feat id ${featId}` }),
      ],
      components: [],
    });
  }
}

/* ── role sync on Discord role changes ───────────────────────────────── */

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

/* ── wiring ──────────────────────────────────────────────────────────── */

export function registerHandlers(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await onChatInputCommand(interaction);
        return;
      }
      if (interaction.isButton()) {
        const id = interaction.customId;
        if (id.startsWith("sub:"))         { await onSubmissionButton(interaction); return; }
        if (id.startsWith("feat:"))        { await onFeatButton(interaction); return; }
        if (id === "verify:start")         { await onVerifyStart(interaction); return; }
        if (id.startsWith("verify:ans:"))  { await onVerifyAnswer(interaction); return; }
      }
    } catch (err) {
      console.error("[bot] interaction failed:", err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Something went wrong.", ephemeral: true }).catch(() => {});
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

  client.on("guildMemberAdd", async (member) => {
    try {
      await onGuildMemberAdd(member);
    } catch (err) {
      console.error("[bot] member add failed:", err);
    }
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    try {
      await onMessageReactionAdd(reaction, user);
    } catch (err) {
      console.error("[bot] reaction add failed:", err);
    }
  });

  client.on("voiceStateUpdate", async (oldState) => {
    try {
      await onVoiceStateUpdate(oldState);
    } catch (err) {
      console.error("[bot] voice state update failed:", err);
    }
  });

  registerConverse(client);
  registerVoiceChat();

  client.once("ready", async (c) => {
    console.log(`[bot] logged in as ${c.user.tag}`);
    await registerSlashCommands(c);
    startScheduler(c);
  });
}

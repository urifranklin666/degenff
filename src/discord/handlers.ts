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
import {
  showcaseEmbed,
  submissionQueueEmbed,
  submissionShowcaseRow,
  featShowcaseRow,
} from "./embeds";
import { onGuildMemberAdd } from "./welcome";
import { onMessageReactionAdd } from "./quotes";
import { registerSlashCommands, onChatInputCommand } from "./slashCommands";
import { logAudit } from "./audit";
import { startScheduler } from "./scheduler";
import { onVerifyStart, onVerifyAnswer } from "./verify";

const SITE = "https://degeneratefuckface.com";

const { submissions, feats, modActions, users } = schema;

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

  // Mirror to #showcase WITH withdraw/unfeature controls, then thread it
  const showcaseChannelId = process.env.DISCORD_SHOWCASE_CHANNEL_ID;
  if (showcaseChannelId) {
    const ch = await interaction.client.channels.fetch(showcaseChannelId);
    if (ch && ch.type === ChannelType.GuildText) {
      const author = await db.query.users.findFirst({ where: eq(users.id, s.userId!) });
      const embed = showcaseEmbed(
        { ...s, featured: feature, status: "approved" },
        author?.handle ?? "anon",
      );
      const showMsg = await (ch as TextChannel).send({
        embeds: [embed],
        components: [submissionShowcaseRow(submissionId, feature)],
      });
      // auto-thread for discussion (7 day auto-archive)
      await showMsg.startThread({
        name: `discuss · ${s.title.slice(0, 80)}`,
        autoArchiveDuration: 10080,
      }).catch((err) => console.error("[thread] start failed:", err));
    }
  }

  await logAudit(interaction.client, {
    modUserId,
    action: feature ? "feature" : "approve",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
    itemUrl: `${SITE}/submissions/${submissionId}`,
  });

  // Update the mod-queue message in place
  const author = await db.query.users.findFirst({ where: eq(users.id, s.userId!) });
  await interaction.update({
    embeds: [
      submissionQueueEmbed(
        { ...s, status: "approved", featured: feature },
        author?.handle ?? "anon",
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

  await logAudit(interaction.client, {
    modUserId,
    action: "reject",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
  });

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
  const s = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!s) return interaction.reply({ content: "Submission missing.", ephemeral: true });
  if (s.status === "withdrawn") {
    return interaction.reply({ content: "Already withdrawn.", ephemeral: true });
  }

  await db.update(submissions)
    .set({ status: "withdrawn", featured: false })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId,
    action: "withdraw",
    source: "discord",
  });

  await logAudit(interaction.client, {
    modUserId,
    action: "withdraw",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
  });

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR.withdrawn)
        .setTitle(`↘ Withdrawn: ${s.title}`)
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
  const s = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!s) return interaction.reply({ content: "Submission missing.", ephemeral: true });
  if (!s.featured) {
    return interaction.reply({ content: "Already unfeatured.", ephemeral: true });
  }

  await db.update(submissions)
    .set({ featured: false })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId,
    action: "unfeature",
    source: "discord",
  });

  await logAudit(interaction.client, {
    modUserId,
    action: "unfeature",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
    itemUrl: `${SITE}/submissions/${submissionId}`,
  });

  // Re-render the showcase embed with the approved (not featured) palette
  // and a row that no longer has the Unfeature button.
  const author = await db.query.users.findFirst({ where: eq(users.id, s.userId!) });
  const updated = showcaseEmbed(
    { ...s, featured: false },
    author?.handle ?? "anon",
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

  const f = await db.query.feats.findFirst({ where: eq(feats.id, featId) });
  if (!f) return interaction.reply({ content: "Feat missing.", ephemeral: true });

  if (action === "approve" || action === "feature") {
    if (f.status === "approved") {
      return interaction.reply({ content: "Already approved.", ephemeral: true });
    }
    await db.update(feats)
      .set({ status: "approved", publishedAt: new Date() })
      .where(eq(feats.id, featId));
    await db.insert(modActions).values({
      featId,
      modUserId,
      action: action === "feature" ? "feature" : "approve",
      source: "discord",
    });

    // Mirror to #feats showcase channel WITH a Withdraw control, then thread it
    const featsChannelId = process.env.DISCORD_FEATS_CHANNEL_ID;
    if (featsChannelId) {
      const ch = await interaction.client.channels.fetch(featsChannelId);
      if (ch && ch.type === ChannelType.GuildText) {
        const author = await db.query.users.findFirst({ where: eq(users.id, f.userId!) });
        const handle = author?.handle ?? "anon";
        const embed = new EmbedBuilder()
          .setColor(action === "feature" ? COLOR.featured : COLOR.approved)
          .setTitle(`⬢  ${f.title}`)
          .setURL(`https://degeneratefuckface.com/feats/${f.slug}`)
          .setDescription((f.summary ?? "").slice(0, 1900))
          .addFields(
            { name: "by", value: `@${handle}`, inline: true },
            f.repoUrl ? { name: "repo", value: f.repoUrl, inline: true } : { name: "​", value: "​", inline: true },
            f.demoUrl ? { name: "demo", value: f.demoUrl, inline: true } : { name: "​", value: "​", inline: true },
          );
        if (f.heroImagePath) embed.setImage(`https://degeneratefuckface.com/uploads/${f.heroImagePath}`);
        const featMsg = await (ch as TextChannel).send({
          embeds: [embed],
          components: [featShowcaseRow(f.slug, f.id)],
        });
        await featMsg.startThread({
          name: `discuss · ${f.title.slice(0, 80)}`,
          autoArchiveDuration: 10080,
        }).catch((err) => console.error("[thread] start failed:", err));
      }
    }

    await logAudit(interaction.client, {
      modUserId,
      action: action === "feature" ? "feature" : "approve",
      kind: "feat",
      itemId: featId,
      itemTitle: f.title,
      itemUrl: `${SITE}/feats/${f.slug}`,
    });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(action === "feature" ? COLOR.featured : COLOR.approved)
          .setTitle(`✔ ${action === "feature" ? "FEATURED" : "Approved"}: ${f.title}`)
          .setDescription(`by <@${interaction.user.id}> · /feats/${f.slug}`)
          .setURL(`https://degeneratefuckface.com/feats/${f.slug}`),
      ],
      components: [],
    });
    return;
  }

  if (action === "reject") {
    await db.update(feats)
      .set({ status: "rejected" })
      .where(eq(feats.id, featId));
    await db.insert(modActions).values({
      featId,
      modUserId,
      action: "reject",
      source: "discord",
    });
    await logAudit(interaction.client, {
      modUserId,
      action: "reject",
      kind: "feat",
      itemId: featId,
      itemTitle: f.title,
    });
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
    if (f.status === "withdrawn") {
      return interaction.reply({ content: "Already withdrawn.", ephemeral: true });
    }
    await db.update(feats)
      .set({ status: "withdrawn" })
      .where(eq(feats.id, featId));
    await db.insert(modActions).values({
      featId,
      modUserId,
      action: "withdraw",
      source: "discord",
    });
    await logAudit(interaction.client, {
      modUserId,
      action: "withdraw",
      kind: "feat",
      itemId: featId,
      itemTitle: f.title,
    });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR.withdrawn)
          .setTitle(`↘ Withdrawn: ${f.title}`)
          .setDescription(`Pulled by <@${interaction.user.id}>. /feats/${f.slug} no longer public.`)
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

  client.once("ready", async (c) => {
    console.log(`[bot] logged in as ${c.user.tag}`);
    await registerSlashCommands(c);
    startScheduler(c);
  });
}

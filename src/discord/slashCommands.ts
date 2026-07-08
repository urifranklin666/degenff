import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type Client,
  type GuildMember,
} from "discord.js";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { postVerifyMessage } from "./verify";
import { GOOSE_LINES } from "@/lib/oracle";
import {
  enqueue,
  startRadio,
  skip as musicSkip,
  stop as musicStop,
  leave as musicLeave,
  snapshot as musicSnapshot,
  formatDuration,
} from "./music";
import { joinVoiceChat, leaveVoiceChat, say } from "./voicechat";

export { GOOSE_LINES };

const { submissions, feats, users, modActions } = schema;

const SITE = "https://degeneratefuckface.com";

const MEDIUM_GLYPH: Record<string, string> = {
  image: "◈", audio: "◐", video: "▶",
  text: "✎", code: "⌬", link: "↗", mixed: "✻",
};

async function isMod(discordId: string): Promise<{ ok: boolean; userId?: string }> {
  const u = await db.query.users.findFirst({ where: eq(users.discordId, discordId) });
  if (!u || (u.role !== "mod" && u.role !== "admin")) return { ok: false };
  return { ok: true, userId: u.id };
}

// GOOSE_LINES moved to @/lib/oracle so the website + bot share one source.

const REDACT_BLOCK = "█";

export const commandDefs = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("what the bot does, and how to make it do it."),
  new SlashCommandBuilder()
    .setName("goose")
    .setDescription("the goose has something to say."),
  new SlashCommandBuilder()
    .setName("redact")
    .setDescription("classify a thing.")
    .addStringOption((o) =>
      o.setName("text").setDescription("the thing to be classified").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("receipt")
    .setDescription("issue an evidence receipt.")
    .addUserOption((o) =>
      o.setName("subject").setDescription("subject of the receipt (default: you)").setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("case-file")
    .setDescription("dm yourself a dossier of your submissions and feats."),
  new SlashCommandBuilder()
    .setName("wheel")
    .setDescription("the prize wheel spins. a random approved submission gets aired."),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("vital signs · site and server numbers."),
  new SlashCommandBuilder()
    .setName("modstats")
    .setDescription("mod action counts per moderator. mods only."),
  new SlashCommandBuilder()
    .setName("audit-trail")
    .setDescription("recent mod actions on a subject's content. mods only.")
    .addUserOption((o) =>
      o.setName("subject").setDescription("whose case to pull up").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("setup-verify")
    .setDescription("post the verification gate in the configured channel. admin only. run once.")
    .setDefaultMemberPermissions(0),
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("queue a YouTube link or search term in your voice channel.")
    .addStringOption((o) =>
      o.setName("query").setDescription("YouTube URL or search").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("radio")
    .setDescription("start the pirate radio — auto-shuffles approved audio submissions."),
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("skip the current track."),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("clear the queue and leave the voice channel."),
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("show what's queued."),
  new SlashCommandBuilder()
    .setName("np")
    .setDescription("now playing."),
  new SlashCommandBuilder()
    .setName("voice")
    .setDescription("the Barker joins your voice channel to listen and talk back.")
    .addSubcommand((s) =>
      s.setName("join").setDescription("join your voice channel and start listening."),
    )
    .addSubcommand((s) => s.setName("leave").setDescription("step out of voice chat.")),
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("make the Barker say something aloud (must already be in voice).")
    .addStringOption((o) =>
      o.setName("text").setDescription("what to say").setRequired(true),
    ),
];

export async function registerSlashCommands(client: Client) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    console.warn("[bot] DISCORD_GUILD_ID not set — skipping slash command registration");
    return;
  }
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(commandDefs.map((c) => c.toJSON()));
    console.log(`[bot] registered ${commandDefs.length} slash commands to guild ${guild.name}`);
  } catch (err) {
    console.error("[bot] slash command registration failed:", err);
  }
}

export async function onChatInputCommand(interaction: ChatInputCommandInteraction) {
  const name = interaction.commandName;
  if (name === "help")        return handleHelp(interaction);
  if (name === "goose")       return handleGoose(interaction);
  if (name === "redact")      return handleRedact(interaction);
  if (name === "receipt")     return handleReceipt(interaction);
  if (name === "case-file")   return handleCaseFile(interaction);
  if (name === "wheel")       return handleWheel(interaction);
  if (name === "stats")       return handleStats(interaction);
  if (name === "modstats")    return handleModStats(interaction);
  if (name === "audit-trail") return handleAuditTrail(interaction);
  if (name === "setup-verify") return handleSetupVerify(interaction);
  if (name === "play")        return handlePlay(interaction);
  if (name === "radio")       return handleRadio(interaction);
  if (name === "skip")        return handleSkip(interaction);
  if (name === "stop")        return handleStop(interaction);
  if (name === "queue")       return handleQueue(interaction);
  if (name === "np")          return handleNowPlaying(interaction);
  if (name === "voice")       return handleVoice(interaction);
  if (name === "say")         return handleSay(interaction);
}

/* ── music handlers ─────────────────────────────────────────────────── */

function requireVoiceMember(interaction: ChatInputCommandInteraction): GuildMember | null {
  const member = interaction.member as GuildMember | null;
  if (!member || !("voice" in member)) return null;
  return member;
}

async function handlePlay(interaction: ChatInputCommandInteraction) {
  const member = requireVoiceMember(interaction);
  if (!member?.voice.channel) {
    return interaction.reply({ content: "join a voice channel first.", ephemeral: true });
  }
  const query = interaction.options.getString("query", true);
  await interaction.deferReply();
  try {
    const { track, position } = await enqueue(
      member,
      query,
      `${interaction.user.username}`,
    );
    const isFirst = position <= 1;
    const embed = new EmbedBuilder()
      .setColor(0xcc0000)
      .setTitle(isFirst ? "◍  now broadcasting" : `↗  queued · #${position}`)
      .setDescription(`**${track.title}**`)
      .setFooter({ text: `requested by @${track.requestedBy} · ${formatDuration(track.durationSec)}` });
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "play failed.";
    await interaction.editReply({ content: msg });
  }
}

async function handleRadio(interaction: ChatInputCommandInteraction) {
  const member = requireVoiceMember(interaction);
  if (!member?.voice.channel) {
    return interaction.reply({ content: "join a voice channel first.", ephemeral: true });
  }
  await interaction.deferReply();
  try {
    const current = await startRadio(member);
    const embed = new EmbedBuilder()
      .setColor(0xff2222)
      .setTitle("📻  pirate radio · live")
      .setDescription(
        current
          ? `now: **${current.title}**${current.submitterHandle ? ` — @${current.submitterHandle}` : ""}`
          : "no approved audio submissions found. drop something at /submit.",
      )
      .setFooter({ text: "shuffles forever. /stop to silence." });
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "radio failed.";
    await interaction.editReply({ content: msg });
  }
}

async function handleSkip(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;
  const skipped = musicSkip(interaction.guildId);
  if (!skipped) {
    return interaction.reply({ content: "nothing to skip.", ephemeral: true });
  }
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x4a0000)
        .setDescription(`▷▷  skipped **${skipped.title}**`),
    ],
  });
}

async function handleStop(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;
  const ok = musicStop(interaction.guildId);
  if (!ok) return interaction.reply({ content: "not in a voice channel.", ephemeral: true });
  await musicLeave(interaction.guildId);
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b0000)
        .setDescription("■  transmission terminated."),
    ],
  });
}

async function handleQueue(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;
  const snap = musicSnapshot(interaction.guildId);
  if (!snap) return interaction.reply({ content: "not in a voice channel.", ephemeral: true });

  const lines: string[] = [];
  if (snap.current) {
    lines.push(`**now** · ${snap.current.title}${snap.current.submitterHandle ? ` — @${snap.current.submitterHandle}` : ""}`);
  }
  snap.queue.slice(0, 15).forEach((t, i) => {
    lines.push(`\`${String(i + 1).padStart(2, "0")}\` ${t.title} · _${t.requestedBy}_`);
  });
  if (snap.queue.length > 15) {
    lines.push(`\n_… +${snap.queue.length - 15} more_`);
  }
  if (snap.radio) {
    lines.push("\n📻  radio is on — queue auto-refills from approved audio.");
  }

  const embed = new EmbedBuilder()
    .setColor(0xcc0000)
    .setTitle("◇  queue")
    .setDescription(lines.join("\n") || "_silence_");
  await interaction.reply({ embeds: [embed] });
}

async function handleNowPlaying(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;
  const snap = musicSnapshot(interaction.guildId);
  if (!snap?.current) {
    return interaction.reply({ content: "nothing is playing.", ephemeral: true });
  }
  const t = snap.current;
  const embed = new EmbedBuilder()
    .setColor(0xff2222)
    .setTitle("◍  now")
    .setDescription(`**${t.title}**${t.submitterHandle ? `\n— @${t.submitterHandle}` : ""}`)
    .setFooter({ text: `requested by @${t.requestedBy} · ${formatDuration(t.durationSec)}` });
  await interaction.reply({ embeds: [embed] });
}

/* ── voice chat handlers ────────────────────────────────────────────── */

async function handleVoice(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "guild only.", ephemeral: true });
  }
  const sub = interaction.options.getSubcommand();
  if (sub === "leave") {
    const left = await leaveVoiceChat(interaction.guildId);
    return interaction.reply({
      content: left ? "◇ stepped out of voice." : "wasn't in voice.",
      ephemeral: true,
    });
  }
  const member = requireVoiceMember(interaction);
  if (!member?.voice.channel) {
    return interaction.reply({ content: "join a voice channel first.", ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const { channelName } = await joinVoiceChat(member);
    await interaction.editReply(`◉ listening in **${channelName}**. talk to me.`);
  } catch (err) {
    await interaction.editReply(err instanceof Error ? err.message : "couldn't join voice.");
  }
}

async function handleSay(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "guild only.", ephemeral: true });
  }
  const text = interaction.options.getString("text", true);
  await interaction.deferReply({ ephemeral: true });
  try {
    await say(interaction.guildId, text);
    await interaction.editReply("◇ said.");
  } catch (err) {
    await interaction.editReply(err instanceof Error ? err.message : "couldn't speak.");
  }
}

async function handleSetupVerify(interaction: ChatInputCommandInteraction) {
  const u = await db.query.users.findFirst({ where: eq(users.discordId, interaction.user.id) });
  if (!u || u.role !== "admin") {
    return interaction.reply({ content: "admin only.", ephemeral: true });
  }
  await postVerifyMessage(interaction);
}

async function handleHelp(interaction: ChatInputCommandInteraction) {
  const quoteEmoji = process.env.DISCORD_QUOTE_EMOJI || "📋";
  const embed = new EmbedBuilder()
    .setColor(0xcc0000)
    .setTitle("◆ operating instructions")
    .setDescription(
      "*everything the bot will do, and how to make it.*\n" +
      "*type `/` in any channel to see slash commands inline.*",
    )
    .addFields(
      {
        name: "slash commands · everyone",
        value: [
          "**`/goose`** — the goose has something to say.",
          "**`/redact <text>`** — classifies a thing. publicly.",
          "**`/receipt [@user]`** — issues an evidence receipt for the named subject.",
          "**`/case-file`** — DMs you a dossier of your own submissions + feats.",
          "**`/wheel`** — the prize wheel airs a random approved submission.",
          "**`/stats`** — site + server vital signs.",
          "**`/help`** — this.",
        ].join("\n"),
      },
      {
        name: "voice · pirate radio",
        value: [
          "**`/play <yt url|search>`** — queue a track in your voice channel.",
          "**`/radio`** — auto-shuffle approved audio submissions until you stop it.",
          "**`/np`** · **`/queue`** · **`/skip`** · **`/stop`**",
        ].join("\n"),
      },
      {
        name: "slash commands · mods only",
        value: [
          "**`/modstats`** — approve/feature/reject counts per moderator.",
          "**`/audit-trail @user`** — recent mod actions on that subject's content.",
          "*(plus the existing approve/feature/reject buttons in #mod-queue.)*",
        ].join("\n"),
      },
      {
        name: "the steno · on-the-record",
        value:
          `react to any message with ${quoteEmoji} and the bot mirrors it to the on-the-record channel as a stamped quote. ` +
          "first reaction wins; subsequent ones are ignored.",
      },
      {
        name: "the doorman · welcome",
        value:
          "fires automatically when a new subject joins the server. nothing to do — proceed voluntarily.",
      },
      {
        name: "the mod queue",
        value:
          "submissions and feats from the site land in the mod queue with approve / feature / reject buttons. " +
          "mod role required; the bot re-checks on every click.",
      },
      {
        name: "the showcase mirrors + auto-threads",
        value:
          "anything approved lands in #showcase (submissions) or #feats (writeups) automatically, " +
          "with persistent withdraw / unfeature controls and a discussion thread already open on the post.",
      },
    )
    .setFooter({ text: "// no attorney present · shoes off" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleGoose(interaction: ChatInputCommandInteraction) {
  const line = GOOSE_LINES[Math.floor(Math.random() * GOOSE_LINES.length)];
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xcc0000)
        .setDescription(`▮  *${line}*`)
        .setFooter({ text: "— the goose" }),
    ],
  });
}

async function handleRedact(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("text", true);
  const redacted = input
    .split("")
    .map((c) => (/\s/.test(c) ? c : REDACT_BLOCK))
    .join("");
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x4a0000)
        .setTitle("◆ CLASSIFIED · LEVEL 7")
        .setDescription("```\n" + redacted.slice(0, 1900) + "\n```")
        .setFooter({ text: "// no attorney present" }),
    ],
  });
}

async function handleReceipt(interaction: ChatInputCommandInteraction) {
  const subject = interaction.options.getUser("subject") || interaction.user;
  const serial = Date.now().toString(36).toUpperCase().slice(-8);
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    "** evidence receipt **",
    "═══════════════════════════════",
    `DATE        ${date}`,
    `TERMINAL    T-007 // R630`,
    `OPERATOR    deadplug`,
    `SUBJECT     @${subject.username}`,
    "═══════════════════════════════",
    "LINE                  QTY",
    "page view             ×1",
    "soul                  forfeit",
    "guilt                 billed",
    "dignity               past tense",
    "consent               implied",
    "attention             splintered",
    "posture               concerning",
    "next of kin           uninformed",
    "refunds               denied",
    "═══════════════════════════════",
    `SERIAL      DEGEN-${serial}`,
    "",
    "— please do not thank us —",
  ];
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xcc0000)
        .setDescription("```\n" + lines.join("\n") + "\n```"),
    ],
  });
}

async function handleCaseFile(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const u = await db.query.users.findFirst({
    where: eq(users.discordId, interaction.user.id),
  });
  if (!u) {
    await interaction.editReply(
      "you don't have a case file yet — sign in once at degeneratefuckface.com first (top-right Submit button kicks off OAuth).",
    );
    return;
  }
  const mySubs = await db.select().from(submissions)
    .where(eq(submissions.userId, u.id))
    .orderBy(desc(submissions.createdAt))
    .limit(10);
  const myFeats = await db.select().from(feats)
    .where(eq(feats.userId, u.id))
    .orderBy(desc(feats.createdAt))
    .limit(10);

  const meta: string[] = [
    `SUBJECT     @${u.handle}`,
    `SITE ID     ${u.id}`,
    `ROLE        ${u.role}${u.banned ? " // banned" : ""}`,
    `ENROLLED    ${new Date(u.createdAt).toISOString().slice(0, 10)}`,
    `SUBMITTED   ${mySubs.length}`,
    `FEATS       ${myFeats.length}`,
  ];

  const embed = new EmbedBuilder()
    .setColor(0xff2222)
    .setTitle(`◆ case file · @${u.handle}`)
    .setDescription("```\n" + meta.join("\n") + "\n```")
    .setFooter({ text: "// for your eyes only · do not distribute" })
    .setTimestamp();

  if (mySubs.length > 0) {
    embed.addFields({
      name: "submissions",
      value: mySubs.map((s) =>
        `• [${s.status.toUpperCase()}]${s.featured ? " ★" : ""} ${s.title.slice(0, 60)} · ${s.medium}`,
      ).join("\n").slice(0, 1024),
    });
  }
  if (myFeats.length > 0) {
    embed.addFields({
      name: "feats",
      value: myFeats.map((f) =>
        `• [${f.status.toUpperCase()}] ${f.title.slice(0, 60)} · /feats/${f.slug}`,
      ).join("\n").slice(0, 1024),
    });
  }

  // Try to DM the user; fall back to ephemeral reply if their DMs are closed.
  try {
    await interaction.user.send({ embeds: [embed] });
    await interaction.editReply("case file sent to your dms.");
  } catch {
    await interaction.editReply({ embeds: [embed] });
  }
}

/* ── /wheel — random approved submission ─────────────────────────────── */

async function handleWheel(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const [picked] = await db.select().from(submissions)
    .where(eq(submissions.status, "approved"))
    .orderBy(sql`random()`)
    .limit(1);

  if (!picked) {
    await interaction.editReply("the wheel turned. nothing was on it. submit a work first.");
    return;
  }

  const author = picked.userId
    ? await db.query.users.findFirst({ where: eq(users.id, picked.userId) })
    : null;
  const glyph = MEDIUM_GLYPH[picked.medium] ?? "◇";

  const embed = new EmbedBuilder()
    .setColor(picked.featured ? 0xff2e7c : 0xff2222)
    .setTitle(`◆ the prize wheel landed on · ${glyph}  ${picked.title}`)
    .setURL(`${SITE}/submissions/${picked.id}`)
    .setDescription((picked.body ?? "_no body_").slice(0, 1500))
    .addFields(
      { name: "by",     value: `@${author?.handle ?? "anon"}`, inline: true },
      { name: "medium", value: picked.medium,                  inline: true },
      { name: "filed",  value: new Date(picked.createdAt).toISOString().slice(0, 10), inline: true },
    )
    .setFooter({ text: "// found on a body" });

  const firstImage = (picked.files ?? []).find((f) => f.mime.startsWith("image/"));
  if (firstImage) embed.setImage(`${SITE}/uploads/${firstImage.path}`);

  await interaction.editReply({ embeds: [embed] });
}

/* ── /stats — site + server vital signs ──────────────────────────────── */

async function handleStats(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const [{ c: subCount }]   = await db.select({ c: count() }).from(submissions).where(eq(submissions.status, "approved"));
  const [{ c: featCount }]  = await db.select({ c: count() }).from(feats).where(eq(feats.status, "approved"));
  const [{ c: pendingCount }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.status, "pending"));
  const [{ c: featuredCount }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.featured, true));
  const [{ c: usersCount }] = await db.select({ c: count() }).from(users);

  const guild = interaction.guild;
  const members = guild?.memberCount ?? "?";

  const lines: string[] = [
    `SUBMISSIONS LIVE          ${subCount}`,
    `SUBMISSIONS FEATURED      ${featuredCount}`,
    `SUBMISSIONS PENDING       ${pendingCount}`,
    `FEATS CATALOGUED          ${featCount}`,
    `ENROLLED SUBJECTS         ${usersCount}`,
    `DISCORD MEMBERS           ${members}`,
    `R630s                     1`,
    `APPETITE                  ∞`,
    `REGRETS                   0`,
  ];

  const embed = new EmbedBuilder()
    .setColor(0xcc0000)
    .setTitle("◆ vital signs")
    .setDescription("```\n" + lines.join("\n") + "\n```")
    .setFooter({ text: "// hand-built on one dell r630 · zero saas bills" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

/* ── /modstats — action counts per moderator ─────────────────────────── */

async function handleModStats(interaction: ChatInputCommandInteraction) {
  const me = await isMod(interaction.user.id);
  if (!me.ok) {
    return interaction.reply({ content: "you don't have the role for that.", ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const rows = await db.select({
    modUserId: modActions.modUserId,
    action: modActions.action,
    c: count(),
  }).from(modActions).groupBy(modActions.modUserId, modActions.action);

  // collapse into { modUserId: { handle, counts } } — modUserId is nullable
  // in the schema (orphaned rows if a user is hard-deleted), so we skip nulls.
  const byMod = new Map<string, { handle: string; counts: Record<string, number> }>();
  for (const r of rows) {
    if (!r.modUserId) continue;
    let entry = byMod.get(r.modUserId);
    if (!entry) {
      const u = await db.query.users.findFirst({ where: eq(users.id, r.modUserId) });
      entry = { handle: u?.handle ?? "?", counts: {} };
      byMod.set(r.modUserId, entry);
    }
    entry.counts[r.action] = r.c;
  }

  const header = "@handle           appr  feat  rej   wd    unf";
  const lines = Array.from(byMod.values()).map(({ handle, counts }) => {
    const h = ("@" + handle).padEnd(17);
    const n = (k: string) => String(counts[k] ?? 0).padEnd(5);
    return `${h} ${n("approve")} ${n("feature")} ${n("reject")} ${n("withdraw")} ${n("unfeature")}`;
  });

  const body = lines.length > 0 ? "```\n" + header + "\n" + lines.join("\n") + "\n```" : "_(no mod actions logged yet)_";

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xff2e7c)
        .setTitle("◆ mod action log")
        .setDescription(body),
    ],
  });
}

/* ── /audit-trail @user — recent actions on a subject's content ──────── */

async function handleAuditTrail(interaction: ChatInputCommandInteraction) {
  const me = await isMod(interaction.user.id);
  if (!me.ok) {
    return interaction.reply({ content: "you don't have the role for that.", ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("subject", true);
  const targetLocal = await db.query.users.findFirst({ where: eq(users.discordId, target.id) });
  if (!targetLocal) {
    return interaction.editReply(`@${target.username} has no site account.`);
  }

  const targetSubs = await db.select({ id: submissions.id, title: submissions.title })
    .from(submissions).where(eq(submissions.userId, targetLocal.id));
  const targetFeats = await db.select({ id: feats.id, title: feats.title })
    .from(feats).where(eq(feats.userId, targetLocal.id));
  const subTitleById = new Map(targetSubs.map((s) => [s.id, s.title]));
  const featTitleById = new Map(targetFeats.map((f) => [f.id, f.title]));

  if (subTitleById.size === 0 && featTitleById.size === 0) {
    return interaction.editReply(`@${target.username} has no submissions or feats on file.`);
  }

  // pull recent mod actions, filter to ones touching this user's content
  const recent = await db.select().from(modActions)
    .orderBy(desc(modActions.createdAt))
    .limit(200);
  const relevant = recent.filter((a) =>
    (a.submissionId && subTitleById.has(a.submissionId)) ||
    (a.featId && featTitleById.has(a.featId))
  ).slice(0, 12);

  if (relevant.length === 0) {
    return interaction.editReply(`no recorded actions on @${target.username}'s content.`);
  }

  // resolve mod handles in one batch — modUserId is nullable in schema so
  // we narrow explicitly before passing it back to drizzle
  const modIds = Array.from(new Set(
    relevant.map((a) => a.modUserId).filter((x): x is string => x !== null)
  ));
  const modUsers = await Promise.all(modIds.map((id) =>
    db.query.users.findFirst({ where: eq(users.id, id) })
  ));
  const modHandle = new Map<string, string>();
  for (const u of modUsers) {
    if (u) modHandle.set(u.id, u.handle);
  }

  const lines = relevant.map((a) => {
    const when = new Date(a.createdAt).toISOString().slice(5, 16).replace("T", " ");
    const mh = modHandle.get(a.modUserId ?? "") ?? "?";
    const what = a.submissionId
      ? `sub · ${subTitleById.get(a.submissionId)?.slice(0, 50) ?? "?"}`
      : `feat · ${featTitleById.get(a.featId!)?.slice(0, 50) ?? "?"}`;
    return `${when}  ${a.action.padEnd(9)}  @${mh.padEnd(14)}  ${what}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xff2222)
    .setTitle(`◆ audit trail · @${target.username}`)
    .setDescription("```\n" + lines.join("\n") + "\n```")
    .setFooter({ text: `subs: ${subTitleById.size} · feats: ${featTitleById.size} · last 12 actions` });

  await interaction.editReply({ embeds: [embed] });
}

"use server";

import { auth } from "@/auth";
import { grantAward, type AwardWire } from "@/lib/awards";
import { consumeRateLimit, formatRetryAfter } from "@/lib/ratelimit";
import { drawScratchCard, pullFromJar, WHEEL_WEDGES } from "@/lib/midway";

const DAY_MS = 24 * 3600 * 1000;

export type MidwayResult =
  | {
      ok: true;
      wedgeIndex?: number;
      reveal?: string;
      tooth?: string;
      message: string;
      award: AwardWire | null;
    }
  | { ok: false; error: string };

async function gate(
  game: "wheel" | "scratch" | "tooth",
  max: number,
): Promise<{ error: string } | { userId: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Sign in to play. The house needs a name for the paperwork." };
  }
  if (session?.user?.role === "visitor") {
    return { error: "Banned hands don't spin." };
  }
  const rl = await consumeRateLimit({
    key: `midway:${game}:${userId}`,
    max,
    windowMs: DAY_MS,
  });
  if (!rl.ok) {
    return { error: `The ${game === "wheel" ? "wheel" : game === "scratch" ? "card rack" : "jar"} is closed to you for ${formatRetryAfter(rl.retryAfterSec)}.` };
  }
  return { userId };
}

export async function spinWheel(): Promise<MidwayResult> {
  const g = await gate("wheel", 1);
  if ("error" in g) return { ok: false, error: g.error };

  const wedgeIndex = Math.floor(Math.random() * WHEEL_WEDGES.length);
  const wedge = WHEEL_WEDGES[wedgeIndex];

  let award: AwardWire | null = null;
  if (wedge.prize) {
    award = await grantAward({
      userId: g.userId,
      kind: wedge.prize.kind,
      label: wedge.prize.label,
      flavor: wedge.prize.flavor,
      source: "midway-wheel",
    });
  }
  return {
    ok: true,
    wedgeIndex,
    message: wedge.prize
      ? `${wedge.label}. ${wedge.prize.flavor}`
      : `${wedge.label}. ${wedge.consolation}`,
    award,
  };
}

export async function scratchCard(): Promise<MidwayResult> {
  const g = await gate("scratch", 3);
  if ("error" in g) return { ok: false, error: g.error };

  const outcome = drawScratchCard();
  let award: AwardWire | null = null;
  if (outcome.prize) {
    award = await grantAward({
      userId: g.userId,
      kind: outcome.prize.kind,
      label: outcome.prize.label,
      flavor: outcome.prize.flavor,
      source: "midway-scratch",
    });
  }
  return {
    ok: true,
    reveal: outcome.reveal,
    message: outcome.prize ? outcome.prize.flavor : "the card keeps its money.",
    award,
  };
}

export async function pullTooth(): Promise<MidwayResult> {
  const g = await gate("tooth", 1);
  if ("error" in g) return { ok: false, error: g.error };

  const outcome = pullFromJar();
  const award = await grantAward({
    userId: g.userId,
    kind: outcome.prize.kind,
    label: outcome.prize.label,
    flavor: outcome.prize.flavor,
    source: "midway-tooth",
  });
  return {
    ok: true,
    tooth: outcome.tooth,
    message: outcome.prize.flavor,
    award,
  };
}

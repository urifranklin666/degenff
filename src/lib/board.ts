// Shared constants + types for /board.
// Lives outside the "use server" action file so the client component can
// import these without Next 16's server-action export-shape errors.

export const MAX_CHARS = 80;
export const PER_USER_COOLDOWN_SEC = 60;

export type LetterAction =
  | { kind: "letter"; char: string }
  | { kind: "space" }
  | { kind: "delete" };

export type BoardSnapshot = {
  sessionId: string;
  text: string;
  status: "live" | "locked";
  startedAt: string;
  contributors: Array<{ handle: string; image: string | null; count: number }>;
  recent: Array<{ id: string; text: string; lockedAt: string; contributors: string[] }>;
  remainingCooldownSec: number;
};

export type SubmitLetterResult =
  | { ok: true; snapshot: BoardSnapshot }
  | { ok: false; error: string; snapshot?: BoardSnapshot };

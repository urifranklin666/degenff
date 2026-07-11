/**
 * The Midway's prize economy. Client-safe: no server imports — the wheel
 * client renders wedge labels from this table. Every prize is worthless, permanent, and
 * public. Wedge order must match the conic-gradient in PrizeWheel /
 * .prize-wheel (0deg = top, clockwise, 45° wedges).
 */

export type WheelWedge = {
  label: string;
  prize: { kind: "stamp" | "title"; label: string; flavor: string } | null;
  consolation: string; // shown when prize is null
};

export const WHEEL_WEDGES: WheelWedge[] = [
  {
    label: "LOSE",
    prize: { kind: "stamp", label: "OFFICIAL LOSER", flavor: "lost fair and square. witnessed." },
    consolation: "",
  },
  {
    label: "WATCHED",
    prize: { kind: "stamp", label: "UNDER OBSERVATION", flavor: "the wheel saw you first." },
    consolation: "",
  },
  {
    label: "AGAIN",
    prize: null,
    consolation: "the wheel wants you back tomorrow. it said so.",
  },
  {
    label: "DECEASED",
    prize: { kind: "stamp", label: "DECLARED LEGALLY DEAD", flavor: "per wheel ruling. appeal at the bureau." },
    consolation: "",
  },
  {
    label: "PUNISHED",
    prize: { kind: "stamp", label: "PUNISHMENT ACCEPTED", flavor: "you spun voluntarily. that counts." },
    consolation: "",
  },
  {
    label: "MISSING",
    prize: { kind: "title", label: "THE MISSING", flavor: "last seen at the midway. presumed enjoying it." },
    consolation: "",
  },
  {
    label: "BLEED",
    prize: { kind: "stamp", label: "BLED ON THE PREMISES", flavor: "thank you for your donation." },
    consolation: "",
  },
  {
    label: "WAIT",
    prize: null,
    consolation: "the wheel says wait. it did not say for what.",
  },
];

export type ScratchOutcome = {
  reveal: string; // text under the foil
  prize: { kind: "stamp" | "title"; label: string; flavor: string } | null;
};

const SCRATCH_LOSERS: string[] = [
  "NOTHING. AS FORETOLD.",
  "A FAINT SMELL OF COINS.",
  "TRY AGAIN. OR DON'T. WE'RE NOT YOUR DAD.",
  "THIS CARD WAS ALREADY SCRATCHED. BY WHOM.",
  "VOID WHERE PROHIBITED. PROHIBITED HERE.",
  "THE FOIL WAS THE PRIZE.",
];

const SCRATCH_STAMPS: Array<{ label: string; flavor: string }> = [
  { label: "FOIL SNIFFER", flavor: "scratched with visible hunger." },
  { label: "CERTIFIED SCRATCHED", flavor: "the card scratched back." },
  { label: "SMALL WIN, BIG FILE", flavor: "logged. laminated. loved." },
  { label: "LUCKY-ADJACENT", flavor: "stood near luck once." },
];

const SCRATCH_TITLE = {
  label: "MIDWAY ROYALTY",
  flavor: "three cents of foil, a lifetime of status.",
};

export function drawScratchCard(): ScratchOutcome {
  const roll = Math.random();
  if (roll < 0.02) {
    return { reveal: `◈ ${SCRATCH_TITLE.label} ◈`, prize: { kind: "title", ...SCRATCH_TITLE } };
  }
  if (roll < 0.4) {
    const s = SCRATCH_STAMPS[Math.floor(Math.random() * SCRATCH_STAMPS.length)];
    return { reveal: `◆ ${s.label} ◆`, prize: { kind: "stamp", ...s } };
  }
  return {
    reveal: SCRATCH_LOSERS[Math.floor(Math.random() * SCRATCH_LOSERS.length)],
    prize: null,
  };
}

export type ToothOutcome = {
  tooth: string;
  prize: { kind: "stamp" | "title"; label: string; flavor: string };
};

const TEETH: Array<{ tooth: string; label: string; flavor: string }> = [
  { tooth: "molar", label: "TOOTH: MOLAR", flavor: "ground down. relatable." },
  { tooth: "canine", label: "TOOTH: CANINE", flavor: "still sharp. handle accordingly." },
  { tooth: "incisor", label: "TOOTH: INCISOR", flavor: "took a bite out of something once." },
  { tooth: "wisdom", label: "TOOTH: WISDOM", flavor: "extracted. the wisdom stayed behind." },
  { tooth: "baby", label: "TOOTH: BABY", flavor: "whose? don't ask. it's yours now." },
  { tooth: "unidentified", label: "TOOTH: UNIDENTIFIED", flavor: "not human. not not-human." },
];

const GOLD_TOOTH = {
  label: "THE GOLD TOOTH",
  flavor: "the jar's one treasure. everyone will know.",
};

export function pullFromJar(): ToothOutcome {
  if (Math.random() < 0.05) {
    return { tooth: "gold", prize: { kind: "title", ...GOLD_TOOTH } };
  }
  const t = TEETH[Math.floor(Math.random() * TEETH.length)];
  return { tooth: t.tooth, prize: { kind: "stamp", label: t.label, flavor: t.flavor } };
}


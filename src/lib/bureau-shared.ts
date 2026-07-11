/* The Bureau's form catalog. Client-safe: no server imports.
 * Codes are load-bearing — they appear on stamps and in clerk rulings. */

export type BureauForm = {
  code: string;
  title: string;
  blurb: string;
  prompt: string; // label over the free-text field
};

export const BUREAU_FORMS: BureauForm[] = [
  {
    code: "13-B",
    title: "REQUEST FOR ACKNOWLEDGMENT",
    blurb: "for citizens who did a thing and require the house to know.",
    prompt: "State the thing you did and why the house should care.",
  },
  {
    code: "22-K",
    title: "PERMIT TO LOITER",
    blurb: "authorizes standing around in the rooms with no purpose.",
    prompt: "Describe where you intend to loiter and your qualifications.",
  },
  {
    code: "7-A",
    title: "DECLARATION OF INTENT TO LURK",
    blurb: "read-only status, formalized. lurking without a permit is still legal, which upsets the clerk.",
    prompt: "Declare how long you have lurked and what you have seen.",
  },
  {
    code: "99-X",
    title: "APPEAL OF MIDWAY RULING",
    blurb: "for the legally dead, the punished, and the observed. appeals are heard in the order they are lost.",
    prompt: "Name the ruling you are appealing and your excuse.",
  },
  {
    code: "4-D",
    title: "REPORT OF PARANORMAL ACTIVITY",
    blurb: "the séance is not paranormal. everything else might be.",
    prompt: "Describe the activity. Be specific. The clerk was probably there.",
  },
];

export const MAX_FILING_CHARS = 600;

export function bureauFormByCode(code: string): BureauForm | null {
  return BUREAU_FORMS.find((f) => f.code === code) ?? null;
}

export const FILING_STATUS_LABEL: Record<string, string> = {
  received: "RECEIVED — in the tray",
  under_review: "UNDER REVIEW — the clerk has it",
  approved: "APPROVED",
  denied: "DENIED",
  lost: "LOST — misfiled, condolences",
};

// DeGENERATE — shared editor types. No Pixi imports here so the UI can use these freely.

export type BlendName =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "add"
  | "difference"
  | "exclusion"
  | "hard-light"
  | "color-dodge";

export const BLEND_NAMES: BlendName[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "add",
  "difference",
  "exclusion",
  "hard-light",
  "color-dodge",
];

export type TextAlign = "left" | "center" | "right";

/** One text layer. Coordinates are in document space; (x,y) is the layer's centre. */
export type TextLayer = {
  id: string;
  name: string;
  text: string;
  fontId: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number; // multiplier of fontSize; 1 = tight
  align: TextAlign;
  fill: string; // hex
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowDistance: number;
  shadowAngle: number; // degrees
  shadowAlpha: number; // 0..1
  glowColor: string;
  glowStrength: number; // 0 = off
  opacity: number; // 0..1
  blend: BlendName;
  x: number;
  y: number;
  rotation: number; // degrees
  visible: boolean;
  locked: boolean;
};

/** Global colour-grade pass applied to the base image. All values are neutral at 0. */
export type GradeState = {
  exposure: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
  gamma: number; // -0.9..2
  temperature: number; // -1..1  (cool ⇢ warm)
  tint: number; // -1..1  (magenta ⇢ green)
  hue: number; // -180..180 degrees
};

/** One instance of an effect from the EFFECTS registry. */
export type EffectInstance = {
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, number>;
};

/** The full serialisable editor document (everything but the source image bytes). */
export type DocState = {
  layers: TextLayer[];
  grade: GradeState;
  effects: EffectInstance[];
};

export const NEUTRAL_GRADE: GradeState = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  gamma: 0,
  temperature: 0,
  tint: 0,
  hue: 0,
};

export type ExportFormat = "png" | "jpeg" | "webp";

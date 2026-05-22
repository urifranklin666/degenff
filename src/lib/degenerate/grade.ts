// DeGENERATE — colour grading. AdjustmentFilter carries exposure/contrast/etc.;
// ColorMatrixFilter carries hue rotation. No custom GLSL — keeps it deterministic.
import { ColorMatrixFilter } from "pixi.js";
import { AdjustmentFilter } from "pixi-filters";
import type { GradeState } from "./types";
import { NEUTRAL_GRADE } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Push a GradeState into the two grade filters. */
export function applyGrade(adjust: AdjustmentFilter, hueMatrix: ColorMatrixFilter, g: GradeState) {
  adjust.brightness = clamp(1 + g.exposure, 0, 3);
  adjust.contrast = clamp(1 + g.contrast, 0, 3);
  adjust.saturation = clamp(1 + g.saturation, 0, 3);
  adjust.gamma = clamp(1 + g.gamma, 0.1, 3);
  adjust.red = clamp(1 + g.temperature * 0.5, 0, 2);
  adjust.blue = clamp(1 - g.temperature * 0.5, 0, 2);
  adjust.green = clamp(1 + g.tint * 0.5, 0, 2);
  hueMatrix.reset();
  if (g.hue !== 0) hueMatrix.hue(g.hue, false);
}

export type GradePreset = { id: string; label: string; grade: GradeState };

/** Named looks. Each is a full GradeState so selecting one is a clean overwrite. */
export const GRADE_PRESETS: GradePreset[] = [
  { id: "raw", label: "Raw", grade: { ...NEUTRAL_GRADE } },
  {
    id: "morgue",
    label: "Morgue",
    grade: { exposure: -0.08, contrast: 0.22, saturation: -0.55, gamma: 0.1, temperature: -0.55, tint: 0.12, hue: 0 },
  },
  {
    id: "embalmed",
    label: "Embalmed",
    grade: { exposure: -0.05, contrast: 0.15, saturation: -0.2, gamma: 0.05, temperature: -0.15, tint: 0.6, hue: 0 },
  },
  {
    id: "cathode",
    label: "Cathode",
    grade: { exposure: 0.06, contrast: 0.3, saturation: 0.35, gamma: -0.1, temperature: -0.4, tint: 0.3, hue: -12 },
  },
  {
    id: "carrion",
    label: "Carrion",
    grade: { exposure: -0.04, contrast: 0.4, saturation: -0.1, gamma: 0.18, temperature: 0.55, tint: -0.15, hue: 6 },
  },
  {
    id: "bloodbath",
    label: "Bloodbath",
    grade: { exposure: -0.12, contrast: 0.5, saturation: 0.25, gamma: 0.25, temperature: 0.7, tint: -0.4, hue: -8 },
  },
  {
    id: "latent",
    label: "Latent",
    grade: { exposure: 0.1, contrast: -0.3, saturation: -0.35, gamma: -0.15, temperature: 0.1, tint: 0.05, hue: 0 },
  },
  {
    id: "static",
    label: "Static",
    grade: { exposure: 0, contrast: 0.65, saturation: -1, gamma: 0.05, temperature: 0, tint: 0, hue: 0 },
  },
];

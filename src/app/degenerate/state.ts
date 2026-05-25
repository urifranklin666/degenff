// DeGENERATE — document state factories.
import { nanoid } from "nanoid";
import { defaultParams } from "@/lib/degenerate/filters";
import type { EffectInstance, TextLayer } from "@/lib/degenerate/types";
import { DEFAULT_FONT_ID } from "./fonts";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A fresh text layer, sized relative to the document and dropped in the centre. */
export function createTextLayer(docW: number, docH: number, index: number): TextLayer {
  const size = clamp(Math.round(Math.min(docW, docH) * 0.16), 24, 420);
  return {
    id: nanoid(8),
    name: `TEXT ${String(index + 1).padStart(2, "0")}`,
    text: "DEGENERATE",
    fontId: DEFAULT_FONT_ID,
    fontSize: size,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.1,
    align: "center",
    fill: "#e6e3df",
    strokeColor: "#030303",
    strokeWidth: 0,
    shadowColor: "#cc0000",
    shadowBlur: 0,
    shadowDistance: 0,
    shadowAngle: 90,
    shadowAlpha: 0.85,
    glowColor: "#ff2222",
    glowStrength: 0,
    opacity: 1,
    blend: "normal",
    x: docW / 2,
    y: docH / 2,
    rotation: 0,
    visible: true,
    locked: false,
  };
}

export function createEffectInstance(type: string): EffectInstance {
  return { id: nanoid(8), type, enabled: true, params: defaultParams(type) };
}

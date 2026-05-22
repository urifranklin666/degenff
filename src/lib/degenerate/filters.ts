// DeGENERATE — effect registry. Each entry wraps a pixi-filter with a numeric
// param schema the inspector can render generically.
import type { Filter } from "pixi.js";
import {
  GlitchFilter,
  RGBSplitFilter,
  CRTFilter,
  OldFilmFilter,
  AdvancedBloomFilter,
  GodrayFilter,
  AsciiFilter,
  DotFilter,
  EmbossFilter,
  PixelateFilter,
  ZoomBlurFilter,
  BulgePinchFilter,
  TwistFilter,
  CrossHatchFilter,
} from "pixi-filters";

export type ParamDesc = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

/** Document dimensions, handed to apply() for effects that need a centre point. */
export type EffectCtx = { width: number; height: number };

export type EffectDef = {
  type: string;
  label: string;
  blurb: string;
  category: "decay" | "signal" | "optics" | "warp";
  params: ParamDesc[];
  create: () => Filter;
  apply: (filter: Filter, p: Record<string, number>, ctx: EffectCtx) => void;
};

const p = (key: string, label: string, min: number, max: number, step: number, def: number): ParamDesc => ({
  key,
  label,
  min,
  max,
  step,
  default: def,
});

export const EFFECTS: Record<string, EffectDef> = {
  glitch: {
    type: "glitch",
    label: "Datamosh",
    blurb: "Torn horizontal slices, RGB bleed.",
    category: "signal",
    params: [p("slices", "Slices", 2, 24, 1, 8), p("offset", "Offset", 0, 240, 1, 100), p("direction", "Angle", -90, 90, 1, 0)],
    create: () => {
      const f = new GlitchFilter({ seed: 0.42, fillMode: 2 });
      return f;
    },
    apply: (filter, v) => {
      const f = filter as GlitchFilter;
      f.slices = v.slices;
      f.offset = v.offset;
      f.direction = v.direction;
    },
  },
  rgbsplit: {
    type: "rgbsplit",
    label: "Chromatic Bleed",
    blurb: "Pull the colour channels apart.",
    category: "signal",
    params: [p("shift", "Shift", 0, 48, 1, 10), p("vertical", "Vertical", 0, 48, 1, 0)],
    create: () => new RGBSplitFilter(),
    apply: (filter, v) => {
      const f = filter as RGBSplitFilter;
      f.red = [-v.shift, -v.vertical];
      f.green = [0, 0];
      f.blue = [v.shift, v.vertical];
    },
  },
  crt: {
    type: "crt",
    label: "Cathode",
    blurb: "Scanlines, curvature, dead-channel noise.",
    category: "signal",
    params: [
      p("lineWidth", "Line Width", 0, 6, 0.1, 1),
      p("lineContrast", "Line Contrast", 0, 1, 0.01, 0.3),
      p("noise", "Noise", 0, 1, 0.01, 0.2),
      p("curvature", "Curvature", 0, 12, 0.1, 1.5),
      p("vignetting", "Vignette", 0, 0.7, 0.01, 0.3),
    ],
    create: () => new CRTFilter({ verticalLine: false }),
    apply: (filter, v) => {
      const f = filter as CRTFilter;
      f.lineWidth = v.lineWidth;
      f.lineContrast = v.lineContrast;
      f.noise = v.noise;
      f.curvature = v.curvature;
      f.vignetting = v.vignetting;
      f.vignettingAlpha = 1;
    },
  },
  oldfilm: {
    type: "oldfilm",
    label: "Rotten Stock",
    blurb: "Grain, scratches, sepia, burned edges.",
    category: "decay",
    params: [
      p("sepia", "Sepia", 0, 1, 0.01, 0.3),
      p("noise", "Grain", 0, 1, 0.01, 0.35),
      p("scratch", "Scratches", 0, 1, 0.01, 0.5),
      p("vignetting", "Vignette", 0, 1, 0.01, 0.35),
    ],
    create: () => new OldFilmFilter({ seed: 0.31 }),
    apply: (filter, v) => {
      const f = filter as OldFilmFilter;
      f.sepia = v.sepia;
      f.noise = v.noise;
      f.scratch = v.scratch;
      f.scratchDensity = 0.3;
      f.vignetting = v.vignetting;
      f.vignettingAlpha = 1;
    },
  },
  bloom: {
    type: "bloom",
    label: "Halation",
    blurb: "Light bleeds out of the highlights.",
    category: "optics",
    params: [
      p("threshold", "Threshold", 0, 1, 0.01, 0.5),
      p("bloomScale", "Intensity", 0, 2.5, 0.05, 1),
      p("brightness", "Brightness", 0, 2, 0.05, 1),
      p("blur", "Spread", 0, 24, 0.5, 8),
    ],
    create: () => new AdvancedBloomFilter(),
    apply: (filter, v) => {
      const f = filter as AdvancedBloomFilter;
      f.threshold = v.threshold;
      f.bloomScale = v.bloomScale;
      f.brightness = v.brightness;
      f.blur = v.blur;
    },
  },
  godray: {
    type: "godray",
    label: "Crepuscular",
    blurb: "Volumetric light shafts.",
    category: "optics",
    params: [
      p("angle", "Angle", -180, 180, 1, 30),
      p("gain", "Gain", 0, 1, 0.01, 0.5),
      p("lacunarity", "Density", 0.5, 5, 0.05, 2.75),
      p("alpha", "Opacity", 0, 1, 0.01, 1),
    ],
    create: () => new GodrayFilter({ parallel: true }),
    apply: (filter, v) => {
      const f = filter as GodrayFilter;
      f.angle = v.angle;
      f.gain = v.gain;
      f.lacunarity = v.lacunarity;
      f.alpha = v.alpha;
    },
  },
  ascii: {
    type: "ascii",
    label: "Glyph Sieve",
    blurb: "Resolve the image into characters.",
    category: "signal",
    params: [p("size", "Cell Size", 4, 40, 1, 12)],
    create: () => new AsciiFilter({ size: 12 }),
    apply: (filter, v) => {
      (filter as AsciiFilter).size = v.size;
    },
  },
  dot: {
    type: "dot",
    label: "Halftone",
    blurb: "Newsprint dot screen.",
    category: "decay",
    params: [p("scale", "Dot Scale", 0.3, 2.5, 0.05, 1), p("angle", "Angle", 0, 10, 0.1, 5)],
    create: () => new DotFilter(),
    apply: (filter, v) => {
      const f = filter as DotFilter;
      f.scale = v.scale;
      f.angle = v.angle;
    },
  },
  emboss: {
    type: "emboss",
    label: "Relief",
    blurb: "Press the image into cold metal.",
    category: "decay",
    params: [p("strength", "Strength", 0, 12, 0.1, 5)],
    create: () => new EmbossFilter(5),
    apply: (filter, v) => {
      (filter as EmbossFilter).strength = v.strength;
    },
  },
  crosshatch: {
    type: "crosshatch",
    label: "Etching",
    blurb: "Cross-hatched engraving lines.",
    category: "decay",
    params: [],
    create: () => new CrossHatchFilter(),
    apply: () => {
      /* no parameters */
    },
  },
  pixelate: {
    type: "pixelate",
    label: "Censor",
    blurb: "Crush detail into hard blocks.",
    category: "decay",
    params: [p("size", "Block Size", 1, 64, 1, 12)],
    create: () => new PixelateFilter(12),
    apply: (filter, v) => {
      (filter as PixelateFilter).size = v.size;
    },
  },
  zoomblur: {
    type: "zoomblur",
    label: "Rapture",
    blurb: "Streak everything toward the centre.",
    category: "optics",
    params: [p("strength", "Strength", 0, 0.5, 0.005, 0.12), p("innerRadius", "Clear Radius", 0, 800, 5, 80)],
    create: () => new ZoomBlurFilter(),
    apply: (filter, v, ctx) => {
      const f = filter as ZoomBlurFilter;
      f.strength = v.strength;
      f.innerRadius = v.innerRadius;
      f.center = [ctx.width / 2, ctx.height / 2];
    },
  },
  bulge: {
    type: "bulge",
    label: "Distend",
    blurb: "Bulge or pinch the surface.",
    category: "warp",
    params: [p("strength", "Strength", -1, 1, 0.01, 0.4), p("radius", "Radius", 50, 1600, 10, 480)],
    create: () => new BulgePinchFilter(),
    apply: (filter, v, ctx) => {
      const f = filter as BulgePinchFilter;
      f.strength = v.strength;
      f.radius = v.radius;
      f.center = [0.5, 0.5];
      void ctx;
    },
  },
  twist: {
    type: "twist",
    label: "Vortex",
    blurb: "Spiral the pixels around a point.",
    category: "warp",
    params: [p("angle", "Angle", -12, 12, 0.1, 4), p("radius", "Radius", 50, 1400, 10, 460)],
    create: () => new TwistFilter(),
    apply: (filter, v, ctx) => {
      const f = filter as TwistFilter;
      f.angle = v.angle;
      f.radius = v.radius;
      f.offset = { x: ctx.width / 2, y: ctx.height / 2 };
    },
  },
};

/** Display order for the effect library, grouped by category. */
export const EFFECT_ORDER: string[] = [
  "glitch",
  "rgbsplit",
  "crt",
  "ascii",
  "oldfilm",
  "dot",
  "emboss",
  "crosshatch",
  "pixelate",
  "bloom",
  "godray",
  "zoomblur",
  "bulge",
  "twist",
];

/** Build the default param map for a freshly added effect. */
export function defaultParams(type: string): Record<string, number> {
  const def = EFFECTS[type];
  const out: Record<string, number> = {};
  for (const param of def.params) out[param.key] = param.default;
  return out;
}

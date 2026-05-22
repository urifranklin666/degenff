// DeGENERATE — the font morgue. Self-hosted via next/font/google (build-time
// download, no runtime CDN call). `family` is the bare family name Pixi and
// document.fonts.load() need; `stack` is the full fallback chain for previews.
import {
  Creepster,
  Nosifer,
  Eater,
  Butcherman,
  Frijole,
  Metal_Mania,
  Henny_Penny,
  Griffy,
  Pirata_One,
  Special_Elite,
  IM_Fell_English,
  Sancreek,
  Rubik_Glitch,
  Rubik_Wet_Paint,
  Rubik_Distressed,
  Rubik_Burned,
  Rubik_Beastly,
  Rubik_Microbe,
  Rubik_Iso,
  Rubik_Maps,
  Rubik_Puddles,
  Anton,
  Playfair_Display,
  IBM_Plex_Mono,
  Big_Shoulders,
} from "next/font/google";

// next/font requires the options object to be an explicit literal at every call.
const creepster = Creepster({ weight: "400", subsets: ["latin"], display: "swap" });
const nosifer = Nosifer({ weight: "400", subsets: ["latin"], display: "swap" });
const eater = Eater({ weight: "400", subsets: ["latin"], display: "swap" });
const butcherman = Butcherman({ weight: "400", subsets: ["latin"], display: "swap" });
const frijole = Frijole({ weight: "400", subsets: ["latin"], display: "swap" });
const metalMania = Metal_Mania({ weight: "400", subsets: ["latin"], display: "swap" });
const hennyPenny = Henny_Penny({ weight: "400", subsets: ["latin"], display: "swap" });
const griffy = Griffy({ weight: "400", subsets: ["latin"], display: "swap" });
const pirataOne = Pirata_One({ weight: "400", subsets: ["latin"], display: "swap" });
const specialElite = Special_Elite({ weight: "400", subsets: ["latin"], display: "swap" });
const imFell = IM_Fell_English({ weight: "400", subsets: ["latin"], display: "swap" });
const sancreek = Sancreek({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikGlitch = Rubik_Glitch({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikWetPaint = Rubik_Wet_Paint({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikDistressed = Rubik_Distressed({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikBurned = Rubik_Burned({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikBeastly = Rubik_Beastly({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikMicrobe = Rubik_Microbe({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikIso = Rubik_Iso({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikMaps = Rubik_Maps({ weight: "400", subsets: ["latin"], display: "swap" });
const rubikPuddles = Rubik_Puddles({ weight: "400", subsets: ["latin"], display: "swap" });
const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "700"], subsets: ["latin"], display: "swap" });
const bigShoulders = Big_Shoulders({ subsets: ["latin"], display: "swap" });

export type FontCategory = "horror" | "grime" | "gothic" | "house";

export type FontEntry = {
  id: string;
  label: string;
  family: string; // bare family name — for Pixi + document.fonts.load
  stack: string; // full fallback chain — for CSS previews
  category: FontCategory;
};

/** Pull the bare first family name out of a next/font fontFamily stack. */
function bare(stack: string): string {
  const first = stack.split(",")[0]?.trim() ?? stack;
  return first.replace(/^['"]|['"]$/g, "");
}

function entry(id: string, label: string, font: { style: { fontFamily: string } }, category: FontCategory): FontEntry {
  return { id, label, family: bare(font.style.fontFamily), stack: font.style.fontFamily, category };
}

export const FONTS: FontEntry[] = [
  entry("creepster", "Creepster", creepster, "horror"),
  entry("nosifer", "Nosifer", nosifer, "horror"),
  entry("eater", "Eater", eater, "horror"),
  entry("butcherman", "Butcherman", butcherman, "horror"),
  entry("frijole", "Frijole", frijole, "horror"),
  entry("rubik-beastly", "Rubik Beastly", rubikBeastly, "horror"),
  entry("rubik-microbe", "Rubik Microbe", rubikMicrobe, "horror"),
  entry("metal-mania", "Metal Mania", metalMania, "grime"),
  entry("rubik-glitch", "Rubik Glitch", rubikGlitch, "grime"),
  entry("rubik-wet-paint", "Rubik Wet Paint", rubikWetPaint, "grime"),
  entry("rubik-distressed", "Rubik Distressed", rubikDistressed, "grime"),
  entry("rubik-burned", "Rubik Burned", rubikBurned, "grime"),
  entry("rubik-puddles", "Rubik Puddles", rubikPuddles, "grime"),
  entry("special-elite", "Special Elite", specialElite, "grime"),
  entry("pirata-one", "Pirata One", pirataOne, "gothic"),
  entry("sancreek", "Sancreek", sancreek, "gothic"),
  entry("im-fell", "IM Fell English", imFell, "gothic"),
  entry("griffy", "Griffy", griffy, "gothic"),
  entry("henny-penny", "Henny Penny", hennyPenny, "gothic"),
  entry("rubik-iso", "Rubik Iso", rubikIso, "gothic"),
  entry("rubik-maps", "Rubik Maps", rubikMaps, "gothic"),
  entry("anton", "Anton", anton, "house"),
  entry("playfair", "Playfair Display", playfair, "house"),
  entry("plex-mono", "IBM Plex Mono", plexMono, "house"),
  entry("big-shoulders", "Big Shoulders", bigShoulders, "house"),
];

const FONT_BY_ID = new Map(FONTS.map((f) => [f.id, f]));

export const DEFAULT_FONT_ID = "creepster";

export function fontFamily(id: string): string {
  return (FONT_BY_ID.get(id) ?? FONT_BY_ID.get(DEFAULT_FONT_ID)!).family;
}

export function fontStack(id: string): string {
  return (FONT_BY_ID.get(id) ?? FONT_BY_ID.get(DEFAULT_FONT_ID)!).stack;
}

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  horror: "Horror",
  grime: "Grime",
  gothic: "Gothic",
  house: "House",
};

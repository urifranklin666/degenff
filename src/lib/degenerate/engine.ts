// DeGENERATE — imperative Pixi v8 editor engine. The React layer owns document
// state; this class owns the scene graph and renders/exports it.
import {
  Application,
  Container,
  Sprite,
  Texture,
  Text,
  Graphics,
  Rectangle,
  ColorMatrixFilter,
  type Filter,
  type FederatedPointerEvent,
} from "pixi.js";
import { AdjustmentFilter, GlowFilter } from "pixi-filters";
import { applyGrade } from "./grade";
import { EFFECTS } from "./filters";
import type { DocState, EffectInstance, ExportFormat, GradeState, TextLayer } from "./types";

const MAX_EDGE = 3000; // clamp doc resolution so big uploads stay performant

export type EngineOptions = {
  parent: HTMLElement;
  fontResolver: (fontId: string) => string;
  onSelect: (id: string | null) => void;
  onLayerMoved: (id: string, x: number, y: number) => void;
};

type DragState = { id: string; dx: number; dy: number };

export class DegenerateEngine {
  private app = new Application();
  private opts!: EngineOptions;
  private root = new Container();
  private imageLayer = new Container();
  private textRoot = new Container();
  private selectionGfx = new Graphics();
  private sprite: Sprite | null = null;

  private gradeAdjust = new AdjustmentFilter();
  private gradeHue = new ColorMatrixFilter();
  private effectFilters = new Map<string, Filter>();
  private effects: EffectInstance[] = [];

  private texts = new Map<string, Text>();
  private layerData = new Map<string, TextLayer>();
  private glows = new Map<string, GlowFilter>();
  private drag: DragState | null = null;
  private selectedId: string | null = null;
  private loadedFonts = new Set<string>();

  docW = 0;
  docH = 0;
  ready = false;

  async init(options: EngineOptions) {
    this.opts = options;
    await this.app.init({
      width: 1280,
      height: 720,
      backgroundAlpha: 0,
      antialias: true,
      preference: "webgl",
      resolution: 1,
      autoDensity: false,
    });
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.className = "dg-canvas";
    options.parent.appendChild(canvas);

    this.app.stage.addChild(this.root);
    this.app.stage.addChild(this.selectionGfx);
    this.root.addChild(this.imageLayer);
    this.root.addChild(this.textRoot);
    this.imageLayer.filters = [this.gradeAdjust, this.gradeHue];

    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on("pointerdown", (e: FederatedPointerEvent) => {
      if (e.target === this.app.stage) this.opts.onSelect(null);
    });
    this.app.stage.on("globalpointermove", (e: FederatedPointerEvent) => this.onMove(e));
    this.app.stage.on("pointerup", () => (this.drag = null));
    this.app.stage.on("pointerupoutside", () => (this.drag = null));

    this.app.ticker.add(() => this.drawSelection());
    this.ready = true;
  }

  destroy() {
    try {
      this.app.destroy(true, { children: true });
    } catch {
      /* already gone */
    }
  }

  // ─── image ──────────────────────────────────────────────────────────────
  async loadImage(file: Blob): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(file);
    let w = bitmap.width;
    let h = bitmap.height;
    const edge = Math.max(w, h);
    if (edge > MAX_EDGE) {
      const k = MAX_EDGE / edge;
      w = Math.round(w * k);
      h = Math.round(h * k);
    }
    this.docW = w;
    this.docH = h;
    this.app.renderer.resize(w, h);
    this.app.stage.hitArea = new Rectangle(0, 0, w, h);

    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    const texture = Texture.from(bitmap);
    this.sprite = new Sprite(texture);
    this.sprite.width = w;
    this.sprite.height = h;
    this.imageLayer.addChildAt(this.sprite, 0);
    this.reapplyEffectGeometry();
    return { width: w, height: h };
  }

  hasImage() {
    return this.sprite !== null;
  }

  // ─── view ───────────────────────────────────────────────────────────────
  /** Returns the zoom that fits the doc inside the given box. */
  fitZoom(boxW: number, boxH: number): number {
    if (!this.docW || !this.docH) return 1;
    return Math.min(boxW / this.docW, boxH / this.docH, 1);
  }

  applyZoom(zoom: number) {
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.width = `${Math.round(this.docW * zoom)}px`;
    canvas.style.height = `${Math.round(this.docH * zoom)}px`;
  }

  // ─── fonts ──────────────────────────────────────────────────────────────
  private async ensureFont(family: string) {
    if (this.loadedFonts.has(family)) return;
    this.loadedFonts.add(family);
    try {
      await Promise.all([
        document.fonts.load(`64px "${family}"`),
        document.fonts.load(`bold 64px "${family}"`),
      ]);
    } catch {
      /* fallback font will render */
    }
  }

  // ─── text layers ────────────────────────────────────────────────────────
  addText(layer: TextLayer) {
    const t = new Text({ text: layer.text });
    t.anchor.set(0.5);
    t.eventMode = "static";
    t.cursor = "move";
    t.on("pointerdown", (e: FederatedPointerEvent) => {
      this.opts.onSelect(layer.id);
      const data = this.layerData.get(layer.id);
      if (!data || data.locked) return;
      this.drag = { id: layer.id, dx: t.x - e.global.x, dy: t.y - e.global.y };
      e.stopPropagation();
    });
    this.texts.set(layer.id, t);
    this.textRoot.addChild(t);
    this.syncLayer(layer);
  }

  updateLayer(layer: TextLayer) {
    this.syncLayer(layer);
  }

  removeLayer(id: string) {
    const t = this.texts.get(id);
    if (t) {
      t.destroy();
      this.texts.delete(id);
    }
    this.layerData.delete(id);
    this.glows.delete(id);
  }

  reorder(orderedIds: string[]) {
    orderedIds.forEach((id, i) => {
      const t = this.texts.get(id);
      if (t) this.textRoot.setChildIndex(t, i);
    });
  }

  setSelected(id: string | null) {
    this.selectedId = id;
  }

  private syncLayer(layer: TextLayer) {
    const t = this.texts.get(layer.id);
    if (!t) return;
    this.layerData.set(layer.id, layer);
    const family = this.opts.fontResolver(layer.fontId);

    const buildStyle = (fam: string) => ({
      fontFamily: fam,
      fontSize: layer.fontSize,
      fontWeight: String(layer.fontWeight) as "normal",
      letterSpacing: layer.letterSpacing,
      lineHeight: layer.fontSize * layer.lineHeight,
      align: layer.align,
      whiteSpace: "pre" as const,
      wordWrap: false,
      padding: 12,
      fill: layer.fill,
      stroke: { color: layer.strokeColor, width: layer.strokeWidth, join: "round" as const },
      dropShadow:
        layer.shadowBlur > 0 || layer.shadowDistance > 0
          ? {
              color: layer.shadowColor,
              alpha: layer.shadowAlpha,
              blur: layer.shadowBlur,
              angle: (layer.shadowAngle * Math.PI) / 180,
              distance: layer.shadowDistance,
            }
          : false,
    });

    t.text = layer.text;
    t.style = buildStyle(family);
    if (!this.loadedFonts.has(family)) {
      this.ensureFont(family).then(() => {
        if (this.texts.get(layer.id) === t) t.style = buildStyle(family);
      });
    }

    t.x = layer.x;
    t.y = layer.y;
    t.rotation = (layer.rotation * Math.PI) / 180;
    t.alpha = layer.opacity;
    t.visible = layer.visible;
    t.blendMode = layer.blend;
    t.eventMode = layer.visible ? "static" : "none";

    if (layer.glowStrength > 0) {
      let glow = this.glows.get(layer.id);
      if (!glow) {
        glow = new GlowFilter({ distance: 24, quality: 0.3 });
        this.glows.set(layer.id, glow);
      }
      glow.outerStrength = layer.glowStrength;
      glow.color = layer.glowColor;
      t.filters = [glow];
    } else {
      t.filters = [];
    }
  }

  // ─── selection overlay ──────────────────────────────────────────────────
  private drawSelection() {
    const g = this.selectionGfx;
    g.clear();
    if (!this.selectedId) return;
    const t = this.texts.get(this.selectedId);
    if (!t || !t.visible) return;
    const b = t.getBounds().rectangle;
    const tick = Math.max(8, Math.min(b.width, b.height) * 0.12);
    g.rect(b.x, b.y, b.width, b.height).stroke({ color: 0xff2222, width: 1.5, alpha: 0.9 });
    const corners = [
      [b.x, b.y, 1, 1],
      [b.x + b.width, b.y, -1, 1],
      [b.x, b.y + b.height, 1, -1],
      [b.x + b.width, b.y + b.height, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      g.moveTo(cx, cy)
        .lineTo(cx + tick * sx, cy)
        .moveTo(cx, cy)
        .lineTo(cx, cy + tick * sy);
    }
    g.stroke({ color: 0x00f5d4, width: 2.5, alpha: 1 });
  }

  private onMove(e: FederatedPointerEvent) {
    if (!this.drag) return;
    const t = this.texts.get(this.drag.id);
    if (!t) return;
    t.x = e.global.x + this.drag.dx;
    t.y = e.global.y + this.drag.dy;
    const data = this.layerData.get(this.drag.id);
    if (data) {
      data.x = t.x;
      data.y = t.y;
    }
    this.opts.onLayerMoved(this.drag.id, t.x, t.y);
  }

  // ─── grade + effects ────────────────────────────────────────────────────
  setGrade(grade: GradeState) {
    applyGrade(this.gradeAdjust, this.gradeHue, grade);
  }

  setEffects(effects: EffectInstance[]) {
    this.effects = effects;
    const live = new Set(effects.map((e) => e.id));
    for (const [id, filter] of this.effectFilters) {
      if (!live.has(id)) {
        filter.destroy();
        this.effectFilters.delete(id);
      }
    }
    const ctx = { width: this.docW || 1, height: this.docH || 1 };
    for (const inst of effects) {
      const def = EFFECTS[inst.type];
      if (!def) continue;
      let filter = this.effectFilters.get(inst.id);
      if (!filter) {
        filter = def.create();
        this.effectFilters.set(inst.id, filter);
      }
      def.apply(filter, inst.params, ctx);
    }
    this.rebuildImageFilters();
  }

  updateEffectParams(inst: EffectInstance) {
    const def = EFFECTS[inst.type];
    const filter = this.effectFilters.get(inst.id);
    if (!def || !filter) return;
    def.apply(filter, inst.params, { width: this.docW || 1, height: this.docH || 1 });
  }

  private reapplyEffectGeometry() {
    const ctx = { width: this.docW || 1, height: this.docH || 1 };
    for (const inst of this.effects) {
      const def = EFFECTS[inst.type];
      const filter = this.effectFilters.get(inst.id);
      if (def && filter) def.apply(filter, inst.params, ctx);
    }
  }

  private rebuildImageFilters() {
    const chain: Filter[] = [this.gradeAdjust, this.gradeHue];
    for (const inst of this.effects) {
      if (!inst.enabled) continue;
      const filter = this.effectFilters.get(inst.id);
      if (filter) chain.push(filter);
    }
    this.imageLayer.filters = chain;
  }

  // ─── undo/redo full rebuild ─────────────────────────────────────────────
  applyState(state: DocState) {
    for (const id of [...this.texts.keys()]) this.removeLayer(id);
    for (const layer of state.layers) this.addText(layer);
    this.reorder(state.layers.map((l) => l.id));
    this.setGrade(state.grade);
    this.setEffects(state.effects);
  }

  // ─── export ─────────────────────────────────────────────────────────────
  async exportBlob(format: ExportFormat, scale: number, quality: number): Promise<Blob> {
    if (!this.sprite) throw new Error("No image loaded.");
    this.selectionGfx.visible = false;
    let canvas: HTMLCanvasElement;
    try {
      canvas = this.app.renderer.extract.canvas({
        target: this.root,
        frame: new Rectangle(0, 0, this.docW, this.docH),
        resolution: scale,
        antialias: true,
        clearColor: format === "png" ? undefined : "#030303",
      }) as HTMLCanvasElement;
    } finally {
      this.selectionGfx.visible = true;
    }
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
        `image/${format}`,
        quality,
      );
    });
  }
}

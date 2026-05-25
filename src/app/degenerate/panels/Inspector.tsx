"use client";

// DeGENERATE — right rail: contextual inspector (Text / Grade / FX).
import { BLEND_NAMES, NEUTRAL_GRADE } from "@/lib/degenerate/types";
import type { BlendName, EffectInstance, GradeState, TextLayer } from "@/lib/degenerate/types";
import { EFFECTS, EFFECT_ORDER } from "@/lib/degenerate/filters";
import { GRADE_PRESETS } from "@/lib/degenerate/grade";
import { FONTS, FONT_CATEGORY_LABELS, fontStack, type FontCategory } from "../fonts";
import { ColorField, Field, Segmented, Slider, Toggle } from "./Controls";

export type InspectorTab = "text" | "grade" | "fx";

export function Inspector(props: {
  tab: InspectorTab;
  onTab: (t: InspectorTab) => void;
  hasImage: boolean;
  layer: TextLayer | null;
  onLayer: (id: string, patch: Partial<TextLayer>, field: string) => void;
  onAddText: () => void;
  grade: GradeState;
  onGrade: (patch: Partial<GradeState>, field: string) => void;
  onGradeReset: (grade: GradeState, label: string) => void;
  effects: EffectInstance[];
  onEffectAdd: (type: string) => void;
  onEffectRemove: (id: string) => void;
  onEffectToggle: (id: string) => void;
  onEffectMove: (id: string, dir: 1 | -1) => void;
  onEffectParam: (id: string, params: Record<string, number>, key: string) => void;
}) {
  const { tab, onTab, hasImage } = props;
  return (
    <aside className="dg-rail dg-inspector">
      <div className="dg-tabs" role="tablist">
        {(["text", "grade", "fx"] as InspectorTab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            className={tab === t ? "is-on" : ""}
            onClick={() => onTab(t)}
          >
            {t === "text" ? "Text" : t === "grade" ? "Grade" : "FX"}
          </button>
        ))}
      </div>

      <div className="dg-inspector-body">
        {tab === "text" && <TextPanel {...props} />}
        {tab === "grade" && <GradePanel {...props} />}
        {tab === "fx" && <EffectsPanel {...props} />}
        {!hasImage && tab !== "text" && <p className="dg-empty">Load an image first.</p>}
      </div>
    </aside>
  );
}

// ─── TEXT ───────────────────────────────────────────────────────────────────
function TextPanel({
  layer,
  onLayer,
  onAddText,
  hasImage,
}: {
  layer: TextLayer | null;
  onLayer: (id: string, patch: Partial<TextLayer>, field: string) => void;
  onAddText: () => void;
  hasImage: boolean;
}) {
  if (!layer) {
    return (
      <div className="dg-panel-empty">
        <p className="dg-empty">No layer selected.</p>
        {hasImage && (
          <button type="button" className="dg-btn dg-btn-wide" onClick={onAddText}>
            ＋ Add Text Layer
          </button>
        )}
      </div>
    );
  }
  const set = (patch: Partial<TextLayer>, field: string) => onLayer(layer.id, patch, field);
  const byCat = (cat: FontCategory) => FONTS.filter((f) => f.category === cat);

  return (
    <div className="dg-panel">
      <section className="dg-section">
        <h3>Content</h3>
        <textarea
          className="dg-textarea"
          rows={3}
          value={layer.text}
          spellCheck={false}
          onChange={(e) => set({ text: e.target.value }, "text")}
        />
        <input
          className="dg-text-input"
          value={layer.name}
          onChange={(e) => set({ name: e.target.value }, "name")}
          aria-label="Layer name"
        />
      </section>

      <section className="dg-section">
        <h3>Typeface</h3>
        <div className="dg-font-grid">
          {(Object.keys(FONT_CATEGORY_LABELS) as FontCategory[]).map((cat) => (
            <div key={cat} className="dg-font-cat">
              <span className="dg-font-cat-label">{FONT_CATEGORY_LABELS[cat]}</span>
              {byCat(cat).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`dg-font-chip ${f.id === layer.fontId ? "is-on" : ""}`}
                  style={{ fontFamily: fontStack(f.id) }}
                  onClick={() => set({ fontId: f.id }, "font")}
                  title={f.label}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="dg-section">
        <h3>Form</h3>
        <Slider label="Size" value={layer.fontSize} min={8} max={600} step={1} onChange={(v) => set({ fontSize: v }, "size")} />
        <Slider
          label="Weight"
          value={layer.fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(v) => set({ fontWeight: v }, "weight")}
        />
        <Slider
          label="Tracking"
          value={layer.letterSpacing}
          min={-12}
          max={48}
          step={0.5}
          onChange={(v) => set({ letterSpacing: v }, "tracking")}
        />
        <Slider
          label="Leading"
          value={layer.lineHeight}
          min={0.6}
          max={2.6}
          step={0.05}
          onChange={(v) => set({ lineHeight: v }, "leading")}
        />
        <Field label="Align">
          <Segmented
            value={layer.align}
            onChange={(v) => set({ align: v as TextLayer["align"] }, "align")}
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
          />
        </Field>
        <Slider
          label="Rotation"
          value={layer.rotation}
          min={-180}
          max={180}
          step={1}
          onChange={(v) => set({ rotation: v }, "rotation")}
          format={(v) => `${Math.round(v)}°`}
        />
      </section>

      <section className="dg-section">
        <h3>Fill &amp; Stroke</h3>
        <ColorField label="Fill" value={layer.fill} onChange={(v) => set({ fill: v }, "fill")} />
        <ColorField label="Stroke" value={layer.strokeColor} onChange={(v) => set({ strokeColor: v }, "strokeColor")} />
        <Slider
          label="Stroke Width"
          value={layer.strokeWidth}
          min={0}
          max={32}
          step={0.5}
          onChange={(v) => set({ strokeWidth: v }, "strokeWidth")}
        />
      </section>

      <section className="dg-section">
        <h3>Drop Shadow</h3>
        <ColorField label="Shadow" value={layer.shadowColor} onChange={(v) => set({ shadowColor: v }, "shadowColor")} />
        <Slider label="Blur" value={layer.shadowBlur} min={0} max={48} step={1} onChange={(v) => set({ shadowBlur: v }, "shadowBlur")} />
        <Slider
          label="Distance"
          value={layer.shadowDistance}
          min={0}
          max={80}
          step={1}
          onChange={(v) => set({ shadowDistance: v }, "shadowDistance")}
        />
        <Slider
          label="Angle"
          value={layer.shadowAngle}
          min={0}
          max={360}
          step={1}
          onChange={(v) => set({ shadowAngle: v }, "shadowAngle")}
          format={(v) => `${Math.round(v)}°`}
        />
        <Slider
          label="Opacity"
          value={layer.shadowAlpha}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set({ shadowAlpha: v }, "shadowAlpha")}
        />
      </section>

      <section className="dg-section">
        <h3>Glow</h3>
        <ColorField label="Glow" value={layer.glowColor} onChange={(v) => set({ glowColor: v }, "glowColor")} />
        <Slider
          label="Strength"
          value={layer.glowStrength}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => set({ glowStrength: v }, "glow")}
        />
      </section>

      <section className="dg-section">
        <h3>Compositing</h3>
        <Slider
          label="Opacity"
          value={layer.opacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set({ opacity: v }, "opacity")}
        />
        <Field label="Blend Mode">
          <select
            className="dg-select"
            value={layer.blend}
            onChange={(e) => set({ blend: e.target.value as BlendName }, "blend")}
          >
            {BLEND_NAMES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
      </section>
    </div>
  );
}

// ─── GRADE ──────────────────────────────────────────────────────────────────
function GradePanel({
  grade,
  onGrade,
  onGradeReset,
  hasImage,
}: {
  grade: GradeState;
  onGrade: (patch: Partial<GradeState>, field: string) => void;
  onGradeReset: (grade: GradeState, label: string) => void;
  hasImage: boolean;
}) {
  if (!hasImage) return null;
  return (
    <div className="dg-panel">
      <section className="dg-section">
        <h3>Looks</h3>
        <div className="dg-preset-grid">
          {GRADE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="dg-preset"
              onClick={() => onGradeReset({ ...preset.grade }, `grade:preset:${preset.id}`)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="dg-section">
        <h3>Tone</h3>
        <Slider label="Exposure" value={grade.exposure} min={-1} max={1} step={0.01} onChange={(v) => onGrade({ exposure: v }, "grade:exposure")} />
        <Slider label="Contrast" value={grade.contrast} min={-1} max={1} step={0.01} onChange={(v) => onGrade({ contrast: v }, "grade:contrast")} />
        <Slider label="Gamma" value={grade.gamma} min={-0.9} max={2} step={0.01} onChange={(v) => onGrade({ gamma: v }, "grade:gamma")} />
      </section>

      <section className="dg-section">
        <h3>Colour</h3>
        <Slider label="Saturation" value={grade.saturation} min={-1} max={1} step={0.01} onChange={(v) => onGrade({ saturation: v }, "grade:saturation")} />
        <Slider label="Temperature" value={grade.temperature} min={-1} max={1} step={0.01} onChange={(v) => onGrade({ temperature: v }, "grade:temperature")} />
        <Slider label="Tint" value={grade.tint} min={-1} max={1} step={0.01} onChange={(v) => onGrade({ tint: v }, "grade:tint")} />
        <Slider label="Hue" value={grade.hue} min={-180} max={180} step={1} onChange={(v) => onGrade({ hue: v }, "grade:hue")} format={(v) => `${Math.round(v)}°`} />
      </section>

      <button type="button" className="dg-btn dg-btn-wide dg-btn-ghost" onClick={() => onGradeReset({ ...NEUTRAL_GRADE }, "grade:reset")}>
        Reset Grade
      </button>
    </div>
  );
}

// ─── FX ─────────────────────────────────────────────────────────────────────
function EffectsPanel({
  effects,
  hasImage,
  onEffectAdd,
  onEffectRemove,
  onEffectToggle,
  onEffectMove,
  onEffectParam,
}: {
  effects: EffectInstance[];
  hasImage: boolean;
  onEffectAdd: (type: string) => void;
  onEffectRemove: (id: string) => void;
  onEffectToggle: (id: string) => void;
  onEffectMove: (id: string, dir: 1 | -1) => void;
  onEffectParam: (id: string, params: Record<string, number>, key: string) => void;
}) {
  if (!hasImage) return null;
  return (
    <div className="dg-panel">
      <section className="dg-section">
        <h3>Effect Library</h3>
        <div className="dg-fx-library">
          {EFFECT_ORDER.map((type) => {
            const def = EFFECTS[type];
            return (
              <button key={type} type="button" className="dg-fx-add" onClick={() => onEffectAdd(type)} title={def.blurb}>
                <span className="dg-fx-add-name">{def.label}</span>
                <span className="dg-fx-add-cat">{def.category}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="dg-section">
        <h3>
          Active Stack <span className="dg-count">{effects.length.toString().padStart(2, "0")}</span>
        </h3>
        {effects.length === 0 && <p className="dg-empty">No effects. The stack runs top-to-bottom.</p>}
        <div className="dg-fx-stack">
          {effects.map((inst, i) => {
            const def = EFFECTS[inst.type];
            if (!def) return null;
            return (
              <div key={inst.id} className={`dg-fx-card ${inst.enabled ? "" : "is-off"}`}>
                <div className="dg-fx-card-head">
                  <Toggle label={def.label} checked={inst.enabled} onChange={() => onEffectToggle(inst.id)} />
                  <div className="dg-fx-card-acts">
                    <button type="button" className="dg-mini" title="Move up" disabled={i === 0} onClick={() => onEffectMove(inst.id, -1)}>
                      ▲
                    </button>
                    <button
                      type="button"
                      className="dg-mini"
                      title="Move down"
                      disabled={i === effects.length - 1}
                      onClick={() => onEffectMove(inst.id, 1)}
                    >
                      ▼
                    </button>
                    <button type="button" className="dg-mini dg-mini-danger" title="Remove" onClick={() => onEffectRemove(inst.id)}>
                      ✕
                    </button>
                  </div>
                </div>
                {def.params.length > 0 && (
                  <div className="dg-fx-card-params">
                    {def.params.map((param) => (
                      <Slider
                        key={param.key}
                        label={param.label}
                        value={inst.params[param.key] ?? param.default}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        onChange={(v) =>
                          onEffectParam(inst.id, { ...inst.params, [param.key]: v }, `fx:${inst.id}:${param.key}`)
                        }
                      />
                    ))}
                  </div>
                )}
                {def.params.length === 0 && <p className="dg-fx-noparam">{def.blurb}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

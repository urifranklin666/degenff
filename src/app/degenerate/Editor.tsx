"use client";

// DeGENERATE — editor shell. React owns document state + history; DegenerateEngine
// owns the Pixi scene graph. Mutators update state, call the engine, then commit
// a history snapshot (coalesced by label so slider drags collapse to one entry).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { DegenerateEngine } from "@/lib/degenerate/engine";
import { EFFECTS } from "@/lib/degenerate/filters";
import { NEUTRAL_GRADE } from "@/lib/degenerate/types";
import type { DocState, EffectInstance, ExportFormat, GradeState, TextLayer } from "@/lib/degenerate/types";
import { stashImage } from "@/lib/degenerate/handoff";
import { fontFamily } from "./fonts";
import { createEffectInstance, createTextLayer } from "./state";
import { CommandBar } from "./panels/CommandBar";
import { LayersPanel } from "./panels/LayersPanel";
import { Inspector, type InspectorTab } from "./panels/Inspector";
import { ExportModal } from "./panels/ExportModal";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const COALESCE_MS = 700;

export default function Editor() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<DegenerateEngine | null>(null);

  const [ready, setReady] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [imageName, setImageName] = useState("");
  const [doc, setDocSize] = useState({ w: 0, h: 0 });
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [grade, setGrade] = useState<GradeState>({ ...NEUTRAL_GRADE });
  const [effects, setEffects] = useState<EffectInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>("text");
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("Awaiting image.");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Imperative mirrors so mutators read fresh values without waiting for re-render.
  const layersRef = useRef<TextLayer[]>([]);
  const gradeRef = useRef<GradeState>(grade);
  const effectsRef = useRef<EffectInstance[]>([]);
  const selectedRef = useRef<string | null>(null);
  const hist = useRef<{ stack: DocState[]; index: number; label: string; time: number }>({
    stack: [],
    index: -1,
    label: "",
    time: 0,
  });

  const writeLayers = (next: TextLayer[]) => {
    layersRef.current = next;
    setLayers(next);
  };
  const writeGrade = (next: GradeState) => {
    gradeRef.current = next;
    setGrade(next);
  };
  const writeEffects = (next: EffectInstance[]) => {
    effectsRef.current = next;
    setEffects(next);
  };
  const snapshot = (): DocState => ({
    layers: layersRef.current,
    grade: gradeRef.current,
    effects: effectsRef.current,
  });

  const commit = useCallback((label: string) => {
    const h = hist.current;
    const now = Date.now();
    const docState = snapshot();
    if (label === h.label && now - h.time < COALESCE_MS && h.index >= 0) {
      h.stack[h.index] = docState;
    } else {
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(docState);
      h.index = h.stack.length - 1;
    }
    h.label = label;
    h.time = now;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  const selectLayer = useCallback((id: string | null) => {
    selectedRef.current = id;
    setSelectedId(id);
    engineRef.current?.setSelected(id);
    if (id) setTab("text");
  }, []);

  const handleLayerMoved = useCallback(
    (id: string, x: number, y: number) => {
      writeLayers(layersRef.current.map((l) => (l.id === id ? { ...l, x, y } : l)));
      commit(`move:${id}`);
    },
    [commit],
  );

  // ─── engine lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const engine = new DegenerateEngine();
    engineRef.current = engine;
    let cancelled = false;
    engine
      .init({
        parent: mount,
        fontResolver: fontFamily,
        onSelect: (id) => selectLayer(id),
        onLayerMoved: handleLayerMoved,
      })
      .then(() => {
        if (cancelled) return;
        hist.current = { stack: [snapshot()], index: 0, label: "", time: 0 };
        setReady(true);
      });
    return () => {
      cancelled = true;
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── view ─────────────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const engine = engineRef.current;
    const stage = stageRef.current;
    if (!engine || !stage || !engine.hasImage()) return;
    const z = engine.fitZoom(stage.clientWidth - 80, stage.clientHeight - 80);
    engine.applyZoom(z);
    setZoom(z);
  }, []);

  const applyZoom = (z: number) => {
    const next = clamp(z, 0.05, 8);
    engineRef.current?.applyZoom(next);
    setZoom(next);
  };

  // ─── image ────────────────────────────────────────────────────────────────
  const loadImageFile = useCallback(
    async (file: File) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (!file.type.startsWith("image/")) {
        setStatus("That is not an image file.");
        return;
      }
      setStatus("Decoding image…");
      try {
        const size = await engine.loadImage(file);
        setDocSize({ w: size.width, h: size.height });
        setHasImage(true);
        setImageName(file.name);
        requestAnimationFrame(fitView);
        setStatus(`Loaded — ${size.width}×${size.height}.`);
      } catch {
        setStatus("Could not decode that image.");
      }
    },
    [fitView],
  );

  // ─── text layers ──────────────────────────────────────────────────────────
  const addText = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !engine.hasImage()) return;
    const layer = createTextLayer(engine.docW, engine.docH, layersRef.current.length);
    const next = [...layersRef.current, layer];
    writeLayers(next);
    engine.addText(layer);
    engine.reorder(next.map((l) => l.id));
    selectLayer(layer.id);
    commit("layer:add");
    setStatus(`Added ${layer.name}.`);
  }, [commit, selectLayer]);

  const updateLayer = useCallback(
    (id: string, patch: Partial<TextLayer>, field: string) => {
      const next = layersRef.current.map((l) => (l.id === id ? { ...l, ...patch } : l));
      writeLayers(next);
      const updated = next.find((l) => l.id === id);
      if (updated) engineRef.current?.updateLayer(updated);
      commit(`layer:${field}:${id}`);
    },
    [commit],
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      const src = layersRef.current.find((l) => l.id === id);
      const engine = engineRef.current;
      if (!src || !engine) return;
      const copy: TextLayer = { ...src, id: nanoid(8), name: `${src.name} COPY`, x: src.x + 28, y: src.y + 28 };
      const next = [...layersRef.current, copy];
      writeLayers(next);
      engine.addText(copy);
      engine.reorder(next.map((l) => l.id));
      selectLayer(copy.id);
      commit("layer:dup");
    },
    [commit, selectLayer],
  );

  const deleteLayer = useCallback(
    (id: string) => {
      const next = layersRef.current.filter((l) => l.id !== id);
      writeLayers(next);
      engineRef.current?.removeLayer(id);
      if (selectedRef.current === id) selectLayer(null);
      commit("layer:del");
      setStatus("Layer deleted.");
    },
    [commit, selectLayer],
  );

  const moveLayer = useCallback(
    (id: string, dir: 1 | -1) => {
      const arr = [...layersRef.current];
      const i = arr.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      writeLayers(arr);
      engineRef.current?.reorder(arr.map((l) => l.id));
      commit("layer:move");
    },
    [commit],
  );

  const toggleVisible = useCallback(
    (id: string) => {
      const cur = layersRef.current.find((l) => l.id === id);
      if (cur) updateLayer(id, { visible: !cur.visible }, "visible");
    },
    [updateLayer],
  );

  const toggleLock = useCallback(
    (id: string) => {
      const cur = layersRef.current.find((l) => l.id === id);
      if (cur) updateLayer(id, { locked: !cur.locked }, "lock");
    },
    [updateLayer],
  );

  // ─── grade ────────────────────────────────────────────────────────────────
  const updateGrade = useCallback(
    (patch: Partial<GradeState>, field: string) => {
      const next = { ...gradeRef.current, ...patch };
      writeGrade(next);
      engineRef.current?.setGrade(next);
      commit(field);
    },
    [commit],
  );

  const resetGrade = useCallback(
    (next: GradeState, label: string) => {
      writeGrade(next);
      engineRef.current?.setGrade(next);
      commit(label);
    },
    [commit],
  );

  // ─── effects ──────────────────────────────────────────────────────────────
  const addEffect = useCallback(
    (type: string) => {
      const engine = engineRef.current;
      if (!engine || !engine.hasImage()) return;
      const next = [...effectsRef.current, createEffectInstance(type)];
      writeEffects(next);
      engine.setEffects(next);
      commit("fx:add");
      setStatus(`Added effect — ${EFFECTS[type].label}.`);
    },
    [commit],
  );

  const removeEffect = useCallback(
    (id: string) => {
      const next = effectsRef.current.filter((e) => e.id !== id);
      writeEffects(next);
      engineRef.current?.setEffects(next);
      commit("fx:remove");
    },
    [commit],
  );

  const toggleEffect = useCallback(
    (id: string) => {
      const next = effectsRef.current.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e));
      writeEffects(next);
      engineRef.current?.setEffects(next);
      commit("fx:toggle");
    },
    [commit],
  );

  const moveEffect = useCallback(
    (id: string, dir: 1 | -1) => {
      const arr = [...effectsRef.current];
      const i = arr.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      writeEffects(arr);
      engineRef.current?.setEffects(arr);
      commit("fx:move");
    },
    [commit],
  );

  const effectParam = useCallback(
    (id: string, params: Record<string, number>, key: string) => {
      const next = effectsRef.current.map((e) => (e.id === id ? { ...e, params } : e));
      writeEffects(next);
      const inst = next.find((e) => e.id === id);
      if (inst) engineRef.current?.updateEffectParams(inst);
      commit(key);
    },
    [commit],
  );

  // ─── history ──────────────────────────────────────────────────────────────
  const restore = useCallback(
    (state: DocState) => {
      writeLayers(state.layers);
      writeGrade(state.grade);
      writeEffects(state.effects);
      engineRef.current?.applyState(state);
      if (selectedRef.current && !state.layers.some((l) => l.id === selectedRef.current)) {
        selectLayer(null);
      } else {
        engineRef.current?.setSelected(selectedRef.current);
      }
    },
    [selectLayer],
  );

  const undo = useCallback(() => {
    const h = hist.current;
    if (h.index <= 0) return;
    h.index -= 1;
    h.label = "";
    restore(h.stack[h.index]);
    setCanUndo(h.index > 0);
    setCanRedo(true);
    setStatus("Undo.");
  }, [restore]);

  const redo = useCallback(() => {
    const h = hist.current;
    if (h.index >= h.stack.length - 1) return;
    h.index += 1;
    h.label = "";
    restore(h.stack[h.index]);
    setCanUndo(true);
    setCanRedo(h.index < h.stack.length - 1);
    setStatus("Redo.");
  }, [restore]);

  // ─── export ───────────────────────────────────────────────────────────────
  const runExport = useCallback(
    async (format: ExportFormat, scale: number, quality: number, send: boolean) => {
      const engine = engineRef.current;
      if (!engine) return;
      setExportBusy(true);
      setExportError(null);
      try {
        const blob = await engine.exportBlob(format, scale, quality);
        const ext = format === "jpeg" ? "jpg" : format;
        if (send) {
          await stashImage({ blob, filename: `degenerate.${ext}`, mime: `image/${format}` });
          router.push("/submit?from=degenerate");
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `degenerate-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          setExportOpen(false);
          setStatus("Exported.");
        }
      } catch (e) {
        setExportError(e instanceof Error ? e.message : "Export failed.");
      } finally {
        setExportBusy(false);
      }
    },
    [router],
  );

  // ─── keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const inField = !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!inField && (e.key === "Delete" || e.key === "Backspace") && selectedRef.current) {
        e.preventDefault();
        deleteLayer(selectedRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteLayer]);

  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;
  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="dg-shell" data-ready={ready}>
      <CommandBar
        hasImage={hasImage}
        canUndo={canUndo}
        canRedo={canRedo}
        zoomPct={zoomPct}
        imageName={imageName}
        onLoadImage={() => fileInputRef.current?.click()}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={() => applyZoom(zoom * 1.25)}
        onZoomOut={() => applyZoom(zoom * 0.8)}
        onZoomFit={fitView}
        onExport={() => {
          setExportError(null);
          setExportOpen(true);
        }}
      />

      <div className="dg-body">
        <LayersPanel
          layers={layers}
          selectedId={selectedId}
          hasImage={hasImage}
          onSelect={selectLayer}
          onAddText={addText}
          onToggleVisible={toggleVisible}
          onToggleLock={toggleLock}
          onDuplicate={duplicateLayer}
          onDelete={deleteLayer}
          onMove={moveLayer}
        />

        <div
          ref={stageRef}
          className={`dg-stage ${dragOver ? "is-drop" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) loadImageFile(file);
          }}
        >
          <div ref={mountRef} className="dg-canvas-mount" />
          {!hasImage && (
            <button type="button" className="dg-dropzone" onClick={() => fileInputRef.current?.click()}>
              <span className="dg-dropzone-glyph" aria-hidden>
                ◈
              </span>
              <span className="dg-dropzone-title">Drop an image to begin</span>
              <span className="dg-dropzone-sub">or click to browse — it never leaves your machine</span>
            </button>
          )}
          {!ready && <div className="dg-stage-boot">booting engine…</div>}
        </div>

        <Inspector
          tab={tab}
          onTab={setTab}
          hasImage={hasImage}
          layer={selectedLayer}
          onLayer={updateLayer}
          onAddText={addText}
          grade={grade}
          onGrade={updateGrade}
          onGradeReset={resetGrade}
          effects={effects}
          onEffectAdd={addEffect}
          onEffectRemove={removeEffect}
          onEffectToggle={toggleEffect}
          onEffectMove={moveEffect}
          onEffectParam={effectParam}
        />
      </div>

      <div className="dg-status">
        <span className="dg-status-msg">{status}</span>
        <span className="dg-status-tag">{hasImage ? `${doc.w}×${doc.h}` : "—"}</span>
        <span className="dg-status-tag">{layers.length} layer{layers.length === 1 ? "" : "s"}</span>
        <span className="dg-status-tag">{effects.filter((e) => e.enabled).length} fx</span>
        <span className="dg-status-sel">{selectedLayer ? selectedLayer.name : "no selection"}</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadImageFile(file);
          e.target.value = "";
        }}
      />

      <ExportModal
        open={exportOpen}
        docW={doc.w}
        docH={doc.h}
        busy={exportBusy}
        error={exportError}
        onClose={() => setExportOpen(false)}
        onDownload={(f, s, q) => runExport(f, s, q, false)}
        onSendToSubmit={(f, s, q) => runExport(f, s, q, true)}
      />
    </div>
  );
}

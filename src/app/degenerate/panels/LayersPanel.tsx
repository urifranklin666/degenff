"use client";

// DeGENERATE — left rail: text layer stack.
import type { TextLayer } from "@/lib/degenerate/types";

export function LayersPanel({
  layers,
  selectedId,
  hasImage,
  onSelect,
  onAddText,
  onToggleVisible,
  onToggleLock,
  onDuplicate,
  onDelete,
  onMove,
}: {
  layers: TextLayer[];
  selectedId: string | null;
  hasImage: boolean;
  onSelect: (id: string) => void;
  onAddText: () => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: 1 | -1) => void;
}) {
  const topFirst = [...layers].reverse();

  return (
    <aside className="dg-rail dg-layers">
      <div className="dg-panel-head">
        <h2>Layers</h2>
        <span className="dg-count">{layers.length.toString().padStart(2, "0")}</span>
      </div>

      <button type="button" className="dg-btn dg-btn-wide" onClick={onAddText} disabled={!hasImage}>
        ＋ Add Text
      </button>

      <div className="dg-layer-list">
        {!hasImage && <p className="dg-empty">Load an image to begin the operation.</p>}
        {hasImage && layers.length === 0 && <p className="dg-empty">No text layers. Add one above.</p>}

        {topFirst.map((layer, i) => {
          const stackIndex = layers.length - 1 - i;
          const isTop = stackIndex === layers.length - 1;
          const isBottom = stackIndex === 0;
          return (
            <div
              key={layer.id}
              className={`dg-layer-row ${layer.id === selectedId ? "is-sel" : ""} ${
                layer.visible ? "" : "is-hidden"
              }`}
              onClick={() => onSelect(layer.id)}
            >
              <button
                type="button"
                className="dg-layer-eye"
                title={layer.visible ? "Hide" : "Show"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
              >
                {layer.visible ? "◉" : "◇"}
              </button>

              <div className="dg-layer-meta">
                <span className="dg-layer-name">{layer.name}</span>
                <span className="dg-layer-text">{layer.text.split("\n")[0] || "—"}</span>
              </div>

              <div className="dg-layer-acts">
                <button
                  type="button"
                  className="dg-mini"
                  title="Move up"
                  disabled={isTop}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, 1);
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="dg-mini"
                  title="Move down"
                  disabled={isBottom}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, -1);
                  }}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className={`dg-mini ${layer.locked ? "is-on" : ""}`}
                  title={layer.locked ? "Unlock" : "Lock"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                >
                  {layer.locked ? "▣" : "▢"}
                </button>
                <button
                  type="button"
                  className="dg-mini"
                  title="Duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(layer.id);
                  }}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className="dg-mini dg-mini-danger"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(layer.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

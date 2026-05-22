"use client";

// DeGENERATE — top command bar.
export function CommandBar({
  hasImage,
  canUndo,
  canRedo,
  zoomPct,
  imageName,
  onLoadImage,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onExport,
}: {
  hasImage: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoomPct: number;
  imageName: string;
  onLoadImage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onExport: () => void;
}) {
  return (
    <div className="dg-cmd">
      <div className="dg-cmd-brand">
        <span className="dg-cmd-glyph" aria-hidden>
          ◈
        </span>
        <span className="dg-cmd-name">
          De<em>GEN</em>erate
        </span>
      </div>

      <div className="dg-cmd-sep" aria-hidden />

      <button type="button" className="dg-btn" onClick={onLoadImage}>
        {hasImage ? "Replace Image" : "Load Image"}
      </button>

      <div className="dg-cmd-group">
        <button type="button" className="dg-icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button type="button" className="dg-icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          ↷
        </button>
      </div>

      <div className="dg-cmd-group dg-zoom" aria-hidden={!hasImage}>
        <button type="button" className="dg-icon-btn" onClick={onZoomOut} disabled={!hasImage} title="Zoom out">
          −
        </button>
        <button type="button" className="dg-zoom-readout" onClick={onZoomFit} disabled={!hasImage} title="Fit to view">
          {hasImage ? `${zoomPct}%` : "—"}
        </button>
        <button type="button" className="dg-icon-btn" onClick={onZoomIn} disabled={!hasImage} title="Zoom in">
          +
        </button>
      </div>

      <div className="dg-cmd-file" title={imageName}>
        {imageName || "no image loaded"}
      </div>

      <button type="button" className="dg-btn dg-btn-primary" onClick={onExport} disabled={!hasImage}>
        Export <span aria-hidden>↗</span>
      </button>
    </div>
  );
}

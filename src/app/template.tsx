/**
 * Re-mounts on each route change. Wraps children in .film-burn so every
 * navigation gets a brief red flash + scale settle. Stays out of the way
 * of layout.tsx (which persists across navigations).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="film-burn">{children}</div>;
}

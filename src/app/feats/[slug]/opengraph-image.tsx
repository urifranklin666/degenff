import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { feats } = schema;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "degeneratefuckface.com — feat card";

export default async function OgFeat({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await db.query.feats.findFirst({
    where: eq(feats.slug, slug),
    with: { author: { columns: { handle: true } } },
  });

  const title = f?.title ?? "feat not found";
  const summary = f?.summary ?? "";
  const handle = f?.author?.handle ?? "anon";
  const tag = "FEAT";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#030303",
          color: "#e6e3df",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#cc0000",
            color: "#000",
            padding: "16px 48px",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span>⬢ CODING FEAT · CATALOGUED</span>
          <span>/{slug.slice(0, 36)}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "60px 56px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                color: "#ff2222",
                fontSize: 24,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {`// ${tag} · case file`}
            </div>
            <div
              style={{
                fontSize: 84,
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: "-0.01em",
                color: "#ffffff",
                maxWidth: 1100,
              }}
            >
              {title.slice(0, 110)}
            </div>
            {summary && (
              <div
                style={{
                  fontSize: 30,
                  color: "#b87a7a",
                  fontStyle: "italic",
                  lineHeight: 1.25,
                  maxWidth: 1100,
                }}
              >
                {summary.slice(0, 200)}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "#8a857f", fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase" }}>by</span>
              <span style={{ color: "#e6e3df", fontSize: 36, fontWeight: 700 }}>@{handle}</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                background: "#0a0908",
                border: "2px solid #4a0000",
                padding: "14px 22px",
                fontFamily: "ui-monospace, SF Mono, Cascadia Code, Consolas, monospace",
                fontSize: 20,
                color: "#ff2222",
                letterSpacing: "0.14em",
              }}
            >
              degeneratefuckface.com/feats
            </div>
          </div>
        </div>

        <div style={{ height: 8, background: "#cc0000" }} />
      </div>
    ),
    size,
  );
}

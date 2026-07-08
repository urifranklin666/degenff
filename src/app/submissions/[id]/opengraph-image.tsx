import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { submissions } = schema;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "degeneratefuckface.com — submission card";

export default async function OgSubmission({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    with: { author: { columns: { handle: true } } },
  });

  const title = s?.title ?? "subject not found in the database";
  const medium = (s?.medium ?? "—").toUpperCase();
  const handle = s?.author?.handle ?? "anon";
  const fileNo = id.slice(-4).toUpperCase().padStart(4, "0");

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
        {/* Red header bar */}
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
          <span>◆ DEGENERATE · FUCKFACE</span>
          <span>FILE NO·{fileNo}</span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "60px 56px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                color: "#ff2222",
                fontSize: 24,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {`// ${medium} · evidence card`}
            </div>
            <div
              style={{
                fontSize: 92,
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: "-0.01em",
                color: "#ffffff",
                textTransform: "uppercase",
                maxWidth: 1100,
                display: "block",
              }}
            >
              {title.slice(0, 120)}
            </div>
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
              degeneratefuckface.com
            </div>
          </div>
        </div>

        {/* Red bottom rule */}
        <div style={{ height: 8, background: "#cc0000" }} />
      </div>
    ),
    size,
  );
}

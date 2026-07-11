export const dynamic = "force-dynamic";

const STATION = `http://127.0.0.1:${process.env.RADIO_PORT ?? 3847}`;

export async function GET() {
  try {
    const r = await fetch(`${STATION}/status`, { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return Response.json(await r.json());
  } catch {
    return Response.json({ onAir: false });
  }
}

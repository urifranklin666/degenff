import { NextResponse } from "next/server";
import { getBoardSnapshot } from "@/app/actions/board";

export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await getBoardSnapshot();
  return NextResponse.json(snap, {
    headers: { "Cache-Control": "no-store" },
  });
}

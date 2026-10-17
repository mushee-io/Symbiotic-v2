import { NextResponse } from "next/server";
import { observedNetwork, PreprodDataError } from "@/lib/preprod-observations";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    return NextResponse.json(await observedNetwork(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Preprod statistics unavailable" }, { status: e instanceof PreprodDataError ? e.status : 503 });
  }
}

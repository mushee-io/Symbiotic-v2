import { NextResponse } from "next/server";
import { observedVault, PreprodDataError } from "@/lib/preprod-observations";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    return NextResponse.json(await observedVault(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Vault observer unavailable" }, { status: e instanceof PreprodDataError ? e.status : 503 });
  }
}

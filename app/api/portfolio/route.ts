import { NextResponse } from "next/server";
import { observedPortfolio, PreprodDataError } from "@/lib/preprod-observations";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const address = new URL(request.url).searchParams.get("address") || "";
    const result = await observedPortfolio(address);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Portfolio unavailable" }, { status: e instanceof PreprodDataError ? e.status : 400 });
  }
}

import { NextResponse } from "next/server";
import { observedLeaderboard, PreprodDataError } from "@/lib/preprod-observations";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const addresses = params.getAll("address");
    if (addresses.length > 5) return NextResponse.json({ error: "Maximum five wallets" }, { status: 400 });
    return NextResponse.json(await observedLeaderboard(addresses), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Leaderboard unavailable" }, { status: e instanceof PreprodDataError ? e.status : 400 });
  }
}

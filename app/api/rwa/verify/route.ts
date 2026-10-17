import { NextResponse } from "next/server";
import { getPreprodJson, RwaProviderError } from "@/lib/rwa-blockfrost";
import { isAssetUnit, RWA_MARKER } from "@/lib/rwa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unit = new URL(request.url).searchParams.get("unit")?.toLowerCase();
  if (!isAssetUnit(unit)) {
    return NextResponse.json({ error: "Supply a valid Cardano policy ID and asset name hex" }, { status: 400 });
  }
  try {
    const asset = await getPreprodJson("/assets/" + unit);
    const metadata = asset.onchain_metadata;
    if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata) ||
        (metadata as Record<string, unknown>).rwa_profile !== RWA_MARKER) {
      return NextResponse.json({ error: "Asset exists but is not a Symbiotic Preprod RWA test certificate" }, { status: 404 });
    }
    const m = metadata as Record<string, unknown>;
    return NextResponse.json({
      verifiedOnPreprod: true,
      legalOwnershipVerified: false,
      network: "preprod",
      unit,
      policyId: unit.slice(0, 56),
      assetNameHex: unit.slice(56),
      name: typeof m.name === "string" ? m.name : null,
      category: typeof m.category === "string" ? m.category : null,
      issuer: typeof m.issuer === "string" ? m.issuer : null,
      documentSha256: typeof m.document_sha256 === "string" ? m.document_sha256 : null,
      reference: typeof m.reference === "string" ? m.reference : null,
      quantity: String(asset.quantity ?? ""),
      firstMintTransaction: typeof asset.initial_mint_tx_hash === "string" ? asset.initial_mint_tx_hash : null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Preprod asset lookup failed"
    }, { status: error instanceof RwaProviderError ? error.status : 502 });
  }
}

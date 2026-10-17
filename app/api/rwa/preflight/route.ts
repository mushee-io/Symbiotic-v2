import { NextResponse } from "next/server";
import { getPreprodJson, RwaProviderError } from "@/lib/rwa-blockfrost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTPUT_REF = /^[0-9a-f]{64}#[0-9]{1,3}$/i;

// CIP-30 network ID 0 includes both Preview and Preprod. Confirm a wallet UTxO
// against the actual Preprod indexer before offering a mint/sign action.
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const refs = typeof body === "object" && body !== null && "utxoRefs" in body
      ? (body as { utxoRefs: unknown }).utxoRefs : null;
    if (!Array.isArray(refs) || refs.length === 0 || refs.length > 3 ||
        !refs.every((ref) => typeof ref === "string" && OUTPUT_REF.test(ref))) {
      return NextResponse.json({ error: "Supply 1–3 valid wallet UTxO references" }, { status: 400 });
    }
    for (const ref of refs as string[]) {
      const [hash, indexString] = ref.split("#");
      try {
        const tx = await getPreprodJson("/txs/" + hash + "/utxos");
        const outputs = tx.outputs;
        if (Array.isArray(outputs) && outputs.some((output: unknown) =>
          typeof output === "object" && output !== null && "output_index" in output &&
          Number((output as { output_index: unknown }).output_index) === Number(indexString))) {
          return NextResponse.json({ network: "preprod", matchedUtxo: ref, verified: true }, {
            headers: { "Cache-Control": "no-store" }
          });
        }
      } catch (error) {
        if (error instanceof RwaProviderError && error.status === 404) continue;
        throw error;
      }
    }
    return NextResponse.json({ error: "Wallet UTxOs were not found on Preprod. Check the wallet network and wait for indexing." }, { status: 409 });
  } catch (error) {
    const status = error instanceof RwaProviderError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Preprod validation failed" }, { status });
  }
}

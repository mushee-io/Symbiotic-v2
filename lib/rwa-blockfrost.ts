// Server-only Blockfrost adapter. The Preprod API key must never enter browser code.
const PREPROD_API = "https://cardano-preprod.blockfrost.io/api/v0";

export class RwaProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function getPreprodJson(path: string): Promise<Record<string, unknown>> {
  const key = process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID;
  if (!key || !/^preprod[a-z0-9]+$/i.test(key)) {
    throw new RwaProviderError("Configure a Cardano Preprod Blockfrost project ID on the server", 503);
  }
  if (!/^\/(txs\/[a-f0-9]{64}(?:\/utxos)?|assets\/[a-f0-9]{58,120})$/i.test(path)) {
    throw new RwaProviderError("Unsupported Preprod lookup", 400);
  }
  let response: Response;
  try {
    response = await fetch(PREPROD_API + path, {
      headers: { project_id: key },
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw new RwaProviderError("Preprod provider is currently unreachable", 503);
  }
  if (response.status === 404) throw new RwaProviderError("Not found on Cardano Preprod", 404);
  if (!response.ok) throw new RwaProviderError("Preprod provider lookup failed", response.status === 429 ? 503 : 502);
  const result: unknown = await response.json();
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new RwaProviderError("Unexpected Preprod provider response", 502);
  }
  return result as Record<string, unknown>;
}

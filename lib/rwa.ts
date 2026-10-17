export const RWA_CATEGORIES = ["PROPERTY", "INVOICE", "COMMODITY", "TREASURY", "CARBON", "OTHER"] as const;
export type RwaCategory = (typeof RWA_CATEGORIES)[number];

export type RwaDraft = {
  name: string;
  issuer: string;
  category: RwaCategory;
  documentSha256: string;
  reference: string;
};

export const RWA_MARKER = "SYMBIOTIC_PREPROD_TEST_V1";
const HEX_64 = /^[0-9a-f]{64}$/i;
const POLICY_ID = /^[0-9a-f]{56}$/i;

export function validateRwaDraft(input: RwaDraft): RwaDraft {
  const name = input.name.trim();
  const issuer = input.issuer.trim();
  const reference = input.reference.trim();
  const documentSha256 = input.documentSha256.trim().toLowerCase();
  if (!name || new TextEncoder().encode(name).length > 48) throw new Error("Asset name must be 1–48 UTF-8 bytes");
  if (!issuer || new TextEncoder().encode(issuer).length > 48) throw new Error("Issuer label must be 1–48 UTF-8 bytes");
  if (!RWA_CATEGORIES.includes(input.category)) throw new Error("Unknown asset category");
  if (!HEX_64.test(documentSha256)) throw new Error("Attach a document or enter its 64-character SHA-256 hash");
  if (new TextEncoder().encode(reference).length > 48) throw new Error("Reference must be at most 48 UTF-8 bytes");
  return { name, issuer, category: input.category, documentSha256, reference };
}

export function isAssetUnit(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 58 && value.length <= 120 &&
    value.length % 2 === 0 && POLICY_ID.test(value.slice(0, 56)) &&
    /^[0-9a-f]+$/i.test(value.slice(56));
}

export function buildRwaTokenName(suffix: string) {
  if (!/^[a-f0-9]{12}$/i.test(suffix)) throw new Error("Token nonce must be 6 random bytes");
  return "SYMRWA" + suffix.toUpperCase();
}

export function shortIdentifier(value: string, leading = 12) {
  return value.length > leading + 8 ? value.slice(0, leading) + "…" + value.slice(-8) : value;
}

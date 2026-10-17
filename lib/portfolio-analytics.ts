/** Pure, testable projections of observed Preprod records. No USD pricing or APY assumptions. */
export type AssetAmount = { unit: string; quantity: string };
export type ChainTransaction = { tx_hash: string; block_time: number };
export type LeaderboardRow = { address: string; lovelace: string; txCount: number };
const UINT = /^(0|[1-9][0-9]*)$/;

export function parseQuantity(value: string): bigint {
  if (!UINT.test(value)) throw new Error("Invalid nonnegative onchain quantity");
  return BigInt(value);
}

export function sumUnit(amounts: AssetAmount[], unit: string) {
  return amounts.reduce((acc, amount) =>
    acc + (amount.unit === unit ? parseQuantity(amount.quantity) : 0n), 0n);
}

export function summariseAmounts(amounts: AssetAmount[]) {
  const adaLovelace = sumUnit(amounts, "lovelace");
  const nativeAssetTypes = amounts.filter(({ unit, quantity }) => unit !== "lovelace" && parseQuantity(quantity) > 0n).length;
  return {
    adaLovelace: adaLovelace.toString(),
    nativeAssetTypes,
    assets: amounts.filter(({ quantity }) => parseQuantity(quantity) > 0n),
  };
}

export function formatAda(lovelace: string, maxDecimals = 3): string {
  const value = parseQuantity(lovelace);
  const whole = value / 1_000_000n;
  const fractional = (value % 1_000_000n).toString().padStart(6, "0").slice(0, Math.max(0, Math.min(6, maxDecimals)));
  return whole.toLocaleString("en-GB") + (fractional.replace(/0+$/, "") ? "." + fractional.replace(/0+$/, "") : "");
}

export function activityByDay(transactions: ChainTransaction[], nowSec: number, days = 7) {
  if (!Number.isInteger(days) || days < 1 || days > 31) throw new Error("Invalid chart window");
  const today = new Date(nowSec * 1000);
  today.setUTCHours(0, 0, 0, 0);
  const dayStart = Math.floor(today.getTime() / 1000);
  const rows = Array.from({ length: days }, (_, i) => {
    const date = new Date((dayStart - (days - 1 - i) * 86400) * 1000);
    return { day: date.toISOString().slice(0, 10), count: 0 };
  });
  const first = dayStart - (days - 1) * 86400;
  for (const tx of transactions) {
    if (!Number.isFinite(tx.block_time) || tx.block_time < first || tx.block_time >= dayStart + 86400) continue;
    const index = Math.floor((tx.block_time - first) / 86400);
    if (rows[index]) rows[index].count += 1;
  }
  return rows;
}

export function rankByObservedTransactions<T extends LeaderboardRow>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.txCount - a.txCount ||
    (parseQuantity(a.lovelace) > parseQuantity(b.lovelace) ? -1 :
      parseQuantity(a.lovelace) < parseQuantity(b.lovelace) ? 1 : 0) ||
    a.address.localeCompare(b.address));
}

export function shortAddress(address: string, left = 13) {
  return address.length > left + 8 ? address.slice(0, left) + "…" + address.slice(-7) : address;
}

export function assertPreprodPaymentAddress(address: string) {
  if (!/^addr_test1[a-z0-9]{40,155}$/.test(address)) throw new Error("Enter a Cardano Preprod payment address (addr_test1…)");
  return address;
}

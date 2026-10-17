import "server-only";
import {
  activityByDay,
  assertPreprodPaymentAddress,
  rankByObservedTransactions,
  summariseAmounts,
  type AssetAmount,
  type ChainTransaction,
} from "@/lib/portfolio-analytics";
import { PREPROD_LIVE } from "@/lib/preprod-live";

const BASE = "https://cardano-preprod.blockfrost.io/api/v0";

export class PreprodDataError extends Error {
  constructor(message: string, readonly status = 503) { super(message); }
}

type AddressRecord = {
  address: string; amount: AssetAmount[]; stake_address?: string | null; tx_count: number;
};
type StakeRecord = {
  active: boolean; pool_id: string | null; controlled_amount: string;
  rewards_sum: string; withdrawals_sum: string; withdrawable_amount: string;
};
type BlockRecord = {
  time: number; height: number; epoch: number; slot: number; tx_count: number; hash: string;
};
type EpochRecord = {
  epoch: number; start_time: number; end_time: number; first_block_time: number;
  last_block_time: number; block_count: number; tx_count: number; output: string;
};

async function request<T>(path: string): Promise<T> {
  const projectId = process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID;
  if (!projectId || !/^preprod[a-z0-9]+$/i.test(projectId)) {
    throw new PreprodDataError("Preprod Blockfrost project ID has not been configured", 503);
  }
  let response: Response;
  try {
    response = await fetch(BASE + path, {
      headers: { project_id: projectId }, cache: "no-store", signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw new PreprodDataError("Unable to reach Cardano Preprod provider", 503);
  }
  if (response.status === 404) throw new PreprodDataError("No confirmed Preprod record found", 404);
  if (response.status === 429) throw new PreprodDataError("Preprod provider rate limit reached", 503);
  if (!response.ok) throw new PreprodDataError("Preprod provider returned HTTP " + response.status, 502);
  return (await response.json()) as T;
}

function validAmounts(input: unknown): AssetAmount[] {
  if (!Array.isArray(input) || !input.every(a =>
    a && typeof a.unit === "string" && typeof a.quantity === "string" &&
    /^(0|[1-9][0-9]*)$/.test(a.quantity))) {
    throw new PreprodDataError("Invalid Preprod balance response", 502);
  }
  return input as AssetAmount[];
}

async function addressRecord(address: string) {
  const record = await request<AddressRecord>("/addresses/" + assertPreprodPaymentAddress(address));
  if (record.address !== address || !Number.isSafeInteger(record.tx_count) || record.tx_count < 0) {
    throw new PreprodDataError("Unexpected Preprod address response", 502);
  }
  return { ...record, amount: validAmounts(record.amount) };
}

async function stakeRecord(stakeAddress: string) {
  if (!/^stake_test1[a-z0-9]{40,155}$/.test(stakeAddress)) return null;
  try {
    return await request<StakeRecord>("/accounts/" + stakeAddress);
  } catch (e) {
    if (e instanceof PreprodDataError && e.status === 404) return null;
    throw e;
  }
}

export async function observedPortfolio(address: string) {
  const record = await addressRecord(address);
  const [transactions, stake] = await Promise.all([
    request<ChainTransaction[]>("/addresses/" + address + "/transactions?count=100&order=desc"),
    record.stake_address ? stakeRecord(record.stake_address) : Promise.resolve(null),
  ]);
  if (!Array.isArray(transactions)) throw new PreprodDataError("Invalid transaction index response", 502);
  const balance = summariseAmounts(record.amount);
  const nowSec = Math.floor(Date.now() / 1000);
  const activity = activityByDay(transactions, nowSec);
  return {
    network: "preprod" as const,
    observedAt: new Date(nowSec * 1000).toISOString(),
    address,
    ...balance,
    transactionsObserved: Math.min(transactions.length, 100),
    transactionCount: record.tx_count,
    activity,
    activityWindowNote: "UTC last 7 calendar days from latest 100 address transactions; may be incomplete on high-activity addresses",
    recentTransactions: transactions.slice(0, 12).map(t => ({
      hash: t.tx_hash, time: new Date(t.block_time * 1000).toISOString()
    })),
    staking: stake ? {
      stakeAddress: record.stake_address,
      active: Boolean(stake.active),
      poolId: stake.pool_id || null,
      controlledLovelace: stake.controlled_amount,
      earnedLovelace: stake.rewards_sum,
      withdrawnLovelace: stake.withdrawals_sum,
      withdrawableLovelace: stake.withdrawable_amount,
    } : null,
    assetValuationsAvailable: false,
  };
}

export async function observedVault() {
  const record = await addressRecord(PREPROD_LIVE.perpetual.scriptAddress);
  const { adaLovelace, assets } = summariseAmounts(record.amount);
  return {
    network: "preprod" as const,
    observedAt: new Date().toISOString(),
    scriptAddress: PREPROD_LIVE.perpetual.scriptAddress,
    scriptHash: PREPROD_LIVE.perpetual.scriptHash,
    adaLovelace,
    stableCollateralBaseUnits: assets.find(x => x.unit === PREPROD_LIVE.sUsd.unit)?.quantity ?? "0",
    stableCollateralUnit: PREPROD_LIVE.sUsd.unit,
    transactionCount: record.tx_count,
    withdrawalEnabled: false,
    vaultDepositEnabled: false,
    earnApr: null,
    note: "Observed PERPETUAL SCRIPT UTxO balance, not a claim of vault TVL or user-redeemable deposits.",
  };
}

export async function observedNetwork() {
  const [block, epoch] = await Promise.all([
    request<BlockRecord>("/blocks/latest"), request<EpochRecord>("/epochs/latest")
  ]);
  if (!Number.isSafeInteger(block.height) || !Number.isSafeInteger(epoch.epoch)) {
    throw new PreprodDataError("Invalid network index response", 502);
  }
  return {
    network: "preprod" as const,
    observedAt: new Date().toISOString(),
    latestBlock: {
      height: block.height, hash: block.hash, epoch: block.epoch,
      txCount: block.tx_count, time: new Date(block.time * 1000).toISOString()
    },
    epoch: { number: epoch.epoch, blockCount: epoch.block_count, transactionCount: epoch.tx_count },
    note: "Cardano Preprod NETWORK statistics, not Symbiotic protocol trading volume or TVL.",
  };
}

export async function observedLeaderboard(addresses: string[]) {
  if (!Array.isArray(addresses) || addresses.length < 1 || addresses.length > 5 ||
    new Set(addresses).size !== addresses.length) {
    throw new PreprodDataError("Select 1 to 5 distinct tracked Preprod addresses", 400);
  }
  const records = await Promise.all(addresses.map(addressRecord));
  return {
    network: "preprod" as const,
    methodology: "User-selected watchlist only, sorted by indexed address transaction count; NOT a global trading leaderboard or a measure of profit.",
    observedAt: new Date().toISOString(),
    rows: rankByObservedTransactions(records.map(record => ({
      address: record.address,
      lovelace: summariseAmounts(record.amount).adaLovelace,
      nativeAssetTypes: summariseAmounts(record.amount).nativeAssetTypes,
      txCount: record.tx_count,
    })))
  };
}

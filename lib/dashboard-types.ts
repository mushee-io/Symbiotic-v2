import type { AssetAmount } from "@/lib/portfolio-analytics";

export type PortfolioObservation = {
  network: "preprod";
  observedAt: string;
  address: string;
  adaLovelace: string;
  nativeAssetTypes: number;
  assets: AssetAmount[];
  transactionsObserved: number;
  transactionCount: number;
  activity: { day: string; count: number }[];
  activityWindowNote: string;
  recentTransactions: { hash: string; time: string }[];
  staking: null | {
    stakeAddress: string | null;
    active: boolean;
    poolId: string | null;
    controlledLovelace: string;
    earnedLovelace: string;
    withdrawnLovelace: string;
    withdrawableLovelace: string;
  };
  assetValuationsAvailable: false;
};
export type VaultObservation = {
  network: "preprod";
  observedAt: string;
  scriptAddress: string;
  scriptHash: string;
  adaLovelace: string;
  stableCollateralBaseUnits: string;
  stableCollateralUnit: string;
  transactionCount: number;
  withdrawalEnabled: false;
  vaultDepositEnabled: false;
  earnApr: null;
  note: string;
};
export type NetworkObservation = {
  network: "preprod";
  observedAt: string;
  latestBlock: { height: number; hash: string; epoch: number; txCount: number; time: string };
  epoch: { number: number; blockCount: number; transactionCount: number };
  note: string;
};
export type ObservedLeaderboard = {
  network: "preprod";
  methodology: string;
  observedAt: string;
  rows: Array<{ address: string; lovelace: string; nativeAssetTypes: number; txCount: number }>;
};

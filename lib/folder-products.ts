export type FolderProductId = "longbow" | "twofold";
export type FolderFeature = { label: string; description: string; status: "PLANNED" };
export type FolderProduct = {
  id: FolderProductId;
  name: string;
  eyebrow: string;
  headline: string;
  shortDescription: string;
  description: string;
  path: string;
  network: "preprod";
  status: "DESIGN_PENDING";
  transactionsEnabled: false;
  features: readonly FolderFeature[];
};

export const FOLDER_PRODUCTS: readonly FolderProduct[] = [
  {
    id: "longbow",
    name: "Longbow",
    eyebrow: "01 / STOCK-COLLATERALISED LENDING",
    headline: "YOUR STOCK EXPOSURE.\nYOUR BORROWING POWER.",
    shortDescription: "A dedicated stock-collateral borrowing product.",
    description: "Longbow is the proposed stock-backed lending module. Eligible tokenised securities could eventually be pledged as collateral against a test-stablecoin loan. The asset issuer, valuation, collateral rights, interest, liquidation thresholds and repayment rules remain to be specified and implemented.",
    path: "/folder/longbow",
    network: "preprod",
    status: "DESIGN_PENDING",
    transactionsEnabled: false,
    features: [
      {label:"Supported stock collateral", description:"Define eligible issuer-backed assets, verified custody and collateral valuation.", status:"PLANNED"},
      {label:"Loan origination", description:"Specify loan-to-value caps, interest-rate model, debt accounting and drawdown rules.", status:"PLANNED"},
      {label:"Risk and liquidation", description:"Specify health-factor updates, stale-oracle protection and safe liquidations.", status:"PLANNED"},
      {label:"Repay and withdraw", description:"Prove fully redeemable collateral after paying the outstanding test loan.", status:"PLANNED"}
    ]
  },
  {
    id: "twofold",
    name: "Twofold",
    eyebrow: "02 / LENDING LIQUIDITY INFRASTRUCTURE",
    headline: "LIQUIDITY,\nINTELLIGENTLY ALLOCATED.",
    shortDescription: "A separate system for managing lending and trading liquidity.",
    description: "Twofold is the proposed liquidity-management module. Its intended role is to let eligible idle capital support lending, with accounting and recall controls that protect trading liquidity. Utilisation targets, asset eligibility, yield distribution, withdrawal priority and loss allocation are yet to be defined.",
    path: "/folder/twofold",
    network: "preprod",
    status: "DESIGN_PENDING",
    transactionsEnabled: false,
    features: [
      {label:"Capital allocation", description:"Specify which assets can be supplied and how much capital can be lent.", status:"PLANNED"},
      {label:"Utilisation and liquidity", description:"Design safe lending caps and availability for trading withdrawals.", status:"PLANNED"},
      {label:"Interest and earnings", description:"Define provable interest accounting without promising a fixed APY.", status:"PLANNED"},
      {label:"Recall and redemption", description:"Specify priority, reserve buffers and recovery when lent funds are unavailable.", status:"PLANNED"}
    ]
  }
] as const;

export function getFolderProduct(id: string): FolderProduct | undefined {
  return FOLDER_PRODUCTS.find(product => product.id === id);
}
export const FOLDER_EXECUTION_ENABLED = false as const;

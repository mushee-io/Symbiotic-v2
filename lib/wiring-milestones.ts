/**
 * Explicit integration backlog. "codeState" says what lives in the repository.
 * "live" only means independently verified execution, not a passing CI suite.
 * Never infer live from environment flags or design/UI components.
 */
export type ModuleId =
 |"rwa-trading"|"equity-oracle"|"rwa-contract"|"rwa-orderbook"|"rwa-issuance"
 |"btc-perps"|"preprod-infra"|"market-maker"|"options"|"notional"
 |"portfolio"|"vault"|"longbow"|"twofold"|"stats"|"corporate"|"release";
export type WiringModule={
 id:ModuleId;name:string;priority:"P0"|"P1"|"P2";
 codeState:"prototype"|"partial"|"read-only";
 live:false;blockers:readonly string[];evidenceRequired:string;
};
export const WIRING_MODULES:readonly WiringModule[]=[
 {id:"rwa-trading",name:"Stock / RWA trading",priority:"P0",codeState:"prototype",live:false,
  blockers:["Issuer-backed instruments or explicit synthetic-test products","Authenticated settlement oracle","Escrow-backed matching and close/refund transactions"],evidenceRequired:"Preprod opening, settlement, cancellation and withdrawal receipts for an agreed asset"},
 {id:"equity-oracle",name:"Stock execution oracle",priority:"P0",codeState:"partial",live:false,
  blockers:["Licensed equity price feeds","Independent Ed25519 sources","Bounded on-chain oracle attestation"],evidenceRequired:"Signed production-like Preprod rounds with stale, halt, divergence and holiday recovery tests"},
 {id:"rwa-contract",name:"RWA smart contracts",priority:"P0",codeState:"prototype",live:false,
  blockers:["Audit stock-pair escrow","Unilateral expiry/recovery path","On-chain oracle-round state","Funded script deployment"],evidenceRequired:"Standalone contract hash and unspent reference UTxO plus balanced Preprod spending receipts"},
 {id:"rwa-orderbook",name:"RWA order book",priority:"P0",codeState:"prototype",live:false,
  blockers:["Persistent authenticated intents","Replay protection and cancellation","Escrow settlement and independent chain indexer"],evidenceRequired:"Two-wallet limit order, partial fill, cancel and settlement transaction hashes"},
 {id:"rwa-issuance",name:"RWA mint and verify",priority:"P0",codeState:"partial",live:false,
  blockers:["Certificate indexer credentials","User wallet mint/verify/transfer rehearsal","Issuer evidence for any legally backed RWA"],evidenceRequired:"Mint, validation and transfer verified on public Cardano Preprod"},
 {id:"btc-perps",name:"BTC perpetuals",priority:"P0",codeState:"partial",live:false,
  blockers:["Reference validator generation consistency","Funded account and signer","Open, close, funding, liquidation, withdrawal proofs"],evidenceRequired:"Full live Preprod lifecycle and reconciled positions without mock transaction hashes"},
 {id:"preprod-infra",name:"Preprod infrastructure",priority:"P0",codeState:"partial",live:false,
  blockers:["Configured Cardano indexer","Preprod builder/operator credentials","Exact deployment manifest and unspent UTxO cross-check"],evidenceRequired:"Independently checked UTxOs, operator authority and registry attestation"},
 {id:"market-maker",name:"Market maker",priority:"P1",codeState:"partial",live:false,
  blockers:["Funded market-maker wallet","Continuous live quote/fill cycle","Timeout and recovery proof"],evidenceRequired:"24h+ soak, real on-chain fills, reconciliation and incident drill"},
 {id:"options",name:"Options",priority:"P1",codeState:"partial",live:false,
  blockers:["Expiry and settlement builder integration","Writer/buyer funding","Oracle and liquidator proof"],evidenceRequired:"Write, buy, expire, exercise/settle, withdraw real Preprod transaction hashes"},
 {id:"notional",name:"Private notional",priority:"P1",codeState:"partial",live:false,
  blockers:["Authenticated competitive solvers","Committed intents and cancellation","Live settlement indexer"],evidenceRequired:"Preprod solver auction including competing quotes, settlement and cancellation"},
 {id:"portfolio",name:"Portfolio and PnL",priority:"P1",codeState:"read-only",live:false,
  blockers:["Read indexer and position state","Reconcile realised and unrealised PnL","Track escrow, debt and withdrawals"],evidenceRequired:"Complete PnL and position values independently reconcile against chain receipts"},
 {id:"vault",name:"Vault & Earn",priority:"P1",codeState:"read-only",live:false,
  blockers:["Audited share-accounting validator","Deposits, withdrawals and queue safety","Reward sources and accrual evidence"],evidenceRequired:"Real Preprod vault funding, earning, withdrawal and emergency redemption evidence"},
 {id:"longbow",name:"Longbow stock-backed loans",priority:"P1",codeState:"prototype",live:false,
  blockers:["Approved collateral assets and lender rules","Loan escrow/oracle/interest accounting","Liquidation and guaranteed exit rules"],evidenceRequired:"Open loan, draw, interest accrual, repay and collateral retrieval receipts"},
 {id:"twofold",name:"Twofold lending liquidity",priority:"P1",codeState:"prototype",live:false,
  blockers:["Utilisation/reserve/withdrawal policy","Lending-pool validator and share accounting","Recall, redemption and bad-debt tests"],evidenceRequired:"Deposit, allocate, recall and complete withdrawal receipts in stress conditions"},
 {id:"stats",name:"Stats and Leaderboard",priority:"P2",codeState:"read-only",live:false,
  blockers:["Independent event indexer","Protocol volume/fee/OI accounting","PnL rankings derived only from confirmed trades"],evidenceRequired:"Every metric traceable to immutable chain events and deduplicated transactions"},
 {id:"corporate",name:"Corporate Actions",priority:"P2",codeState:"prototype",live:false,
  blockers:["Verified issuer rights and action feed","Splits/dividends/halts/early closes","Reconciliation and dispute policy"],evidenceRequired:"Test event that changes token position accounting without granting unsupported legal rights"},
 {id:"release",name:"Security and Release",priority:"P0",codeState:"partial",live:false,
  blockers:["External smart-contract review","Soak, reorg, liquidity and recovery drills","V11 51-point chain-evidence and release signoff"],evidenceRequired:"Signed release certificate tied to current compiled blueprint and independently verified Preprod TXs"}
] as const;
export function wiringRuntime(env:Record<string,string|undefined>){
 return {
  cardanoNetwork:env.SYMBIOTIC_CARDANO_NETWORK||"NOT_SET",
  blockfrostConfigured:Boolean(env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID),
  signedEquityFeedsConfigured:Boolean(env.SYMBIOTIC_EQUITY_FEEDS_JSON),
  transactionBuilderConfigured:Boolean(env.SYMBIOTIC_TX_BUILDER_ENDPOINT&&env.SYMBIOTIC_TX_BUILDER_TOKEN),
  note:"These are configuration-presence flags, not connectivity checks, deployed contract evidence, or transaction proofs."
 };
}
export function wiringSummary(env:Record<string,string|undefined>){
 return {
  releaseReady:false as const,network:"preprod" as const,
  incompleteCount:WIRING_MODULES.length,
  modules:WIRING_MODULES,runtime:wiringRuntime(env)
 };
}

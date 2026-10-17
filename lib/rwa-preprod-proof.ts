// Public READ-ONLY Cardano Preprod evidence for stock-linked test derivatives.
// The sUSD collateral mint is not proof of stock issuance or trading.
import { PREPROD_LIVE } from "./preprod-live";
import { RWA_MARKETS, marketSession } from "./rwa-market";
const KOIOS="https://preprod.koios.rest/api/v1";
const MINT_TX="058fc48598399499694045ae9337cc5d51bb6d28d722f9a82c5a01699603d45c";
const UNIT=PREPROD_LIVE.sUsd.unit;
const POLICY=UNIT.slice(0,56), ASSET=UNIT.slice(56);
type Tip={block_no?:number;block_time?:number};
type Asset={policy_id?:string;asset_name?:string;minting_tx_hash?:string;total_supply?:string};
async function readKoios<T>(path:string,fetcher:typeof fetch):Promise<T>{
 const response=await fetcher(KOIOS+path,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw new Error("Koios Preprod returned HTTP "+response.status);
 const json:unknown=await response.json();
 if(!Array.isArray(json)||json.length!==1)throw new Error("Unexpected Preprod provider result");
 return json[0] as T;
}
export async function stockReadiness(ticker:string,at=new Date(),fetcher:typeof fetch=fetch){
 const market=RWA_MARKETS.find(m=>m.ticker===ticker);
 if(!market)throw new Error("Unsupported stock reference");
 const session=marketSession(at);
 let chainTip:null|{block:number;time:string;ageSeconds:number}=null;
 let collateral:null|{unit:string;mintTxHash:string;supplyBaseUnits:string;verified:true}=null;
 const failures:string[]=[];
 try{
  const tip=await readKoios<Tip>("/tip",fetcher);
  if(!Number.isSafeInteger(tip.block_time)||!Number.isSafeInteger(tip.block_no))throw new Error("Invalid Preprod chain tip");
  const ageSeconds=Math.floor(at.getTime()/1000)-tip.block_time!;
  if(ageSeconds< -60||ageSeconds>600)throw new Error("Preprod chain tip too old");
  chainTip={block:tip.block_no!,time:new Date(tip.block_time!*1000).toISOString(),ageSeconds};
 }catch(e){failures.push(e instanceof Error?e.message:"No chain tip");}
 try{
  const query=new URLSearchParams({_asset_policy:POLICY,_asset_name:ASSET});
  const info=await readKoios<Asset>("/asset_info?"+query.toString(),fetcher);
  if(info.policy_id?.toLowerCase()!==POLICY||info.asset_name?.toLowerCase()!==ASSET||
     info.minting_tx_hash?.toLowerCase()!==MINT_TX||!/^[1-9]\d*$/.test(info.total_supply||""))
   throw new Error("Onchain test collateral does not match canonical mint");
  collateral={unit:UNIT,mintTxHash:MINT_TX,supplyBaseUnits:info.total_supply!,verified:true};
 }catch(e){failures.push(e instanceof Error?e.message:"No verified collateral mint");}
 const checks={
  preprodTipFresh:Boolean(chainTip),
  demoCollateralMintConfirmed:Boolean(collateral),
  stockOracleVerified:false,
  stockLinkedValidatorBound:false,
  stockInstrumentOrIssuerConfigured:false,
  orderbookAndSettlementVerified:false,
  fundedQuoteLiquidityVerified:false,
  nyseCalendarSupported:session.calendarVerified
 };
 return {
  network:"preprod" as const,ticker,referenceSymbol:market.symbol,
  instrument:"STOCK_LINKED_TEST_DERIVATIVE" as const,
  observedAt:at.toISOString(),chainTip,collateral,session,checks,
  pending:Object.entries(checks).filter(([,ready])=>!ready).map(([name])=>name),
  failures,tradingEnabled:false as const,
  note:"Read-only evidence. No share ownership, RWA order execution, stock settlement oracle or guaranteed liquidity is available."
 };
}

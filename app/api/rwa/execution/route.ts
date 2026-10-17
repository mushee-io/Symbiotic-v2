import {NextResponse} from "next/server";
import {marketSession} from "@/lib/rwa-market";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export function GET(){
 return NextResponse.json({
  network:"preprod",status:"BLOCKED",executionEnabled:false,
  stockValidatorDeployed:false,stockOracleSigningBound:false,
  collateralEscrowDeployed:false,atomicSettlementProven:false,
  validProofs:[],session:marketSession(new Date()),
  reason:"Requires independently signed licensed stock feeds, deployed stock-aware validators, funded matching/settlement operator and verified Cardano Preprod close/cancel/withdraw receipts.",
  note:"The matching engine is an offchain PROPOSAL evaluator only. This endpoint cannot place orders or move funds."
 },{headers:{"Cache-Control":"no-store"}});
}
export async function POST(){
 return NextResponse.json({error:"Stock order execution is disabled: no deployed verifier, escrow or verified settlement route."},
  {status:503,headers:{"Cache-Control":"no-store"}});
}

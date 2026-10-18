import {NextResponse} from "next/server";
import {observePreprodValidators,parsePublicPreprodManifest} from "@/lib/preprod-validator-observer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){
 const raw=process.env.SYMBIOTIC_PREPROD_VALIDATOR_MANIFEST_JSON;
 const id=process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID??"";
 if(!raw)return NextResponse.json({
  network:"preprod",referenceValidatorsVerified:false,validatorCount:0,
  reason:"Public five-validator deployment manifest not connected to Vercel.",
  next:"Generate and independently verify the five-validator manifest on Ubuntu. No keys are required in this API.",
  tradeExecutionEnabled:false
 },{status:503,headers});
 try{
  if(raw.length>50000)throw Error("Manifest exceeds bounded size");
  const manifest=parsePublicPreprodManifest(JSON.parse(raw) as unknown);
  const result=await observePreprodValidators(manifest,id);
  return NextResponse.json(result,{headers});
 }catch{
  return NextResponse.json({
   network:"preprod",referenceValidatorsVerified:false,validatorCount:0,
   reason:"Public reference-script proofs are incomplete, invalid or unavailable.",
   tradeExecutionEnabled:false
  },{status:503,headers});
 }
}

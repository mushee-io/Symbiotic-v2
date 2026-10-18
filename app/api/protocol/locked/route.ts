import {NextResponse} from "next/server";
import {parsePublicPreprodManifest,observePreprodValidators} from "@/lib/preprod-validator-observer";
import {summarizeVerifiedScriptUtxos,fetchVerifiedScriptUtxos,type ValidatorName} from "@/lib/preprod-protocol-ledger";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){
 const source=process.env.SYMBIOTIC_PREPROD_VALIDATOR_MANIFEST_JSON;
 const projectId=process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID??"";
 if(!source)return NextResponse.json({
  network:"preprod",verified:false,
  reason:"Five-validator deployment evidence has not been connected.",
  products:[],executionEnabled:false
 },{status:503,headers});
 try{
  if(source.length>50000)throw Error("Oversized deployment manifest");
  const manifest=parsePublicPreprodManifest(JSON.parse(source) as unknown);
  const proof=await observePreprodValidators(manifest,projectId);
  if(!proof.referenceValidatorsVerified||proof.validatorCount!==5)
   throw Error("Protocol validators not independently verified");
  const products=await Promise.all(manifest.validators.map(async validator=>{
   const records=await fetchVerifiedScriptUtxos(validator.scriptAddress,projectId);
   return summarizeVerifiedScriptUtxos(validator.name as ValidatorName,records);
  }));
  return NextResponse.json({
   network:"preprod",verified:true,validatorCount:5,
   observedAt:new Date().toISOString(),products,
   executionEnabled:false,
   note:"Only confirmed-chain UTxOs physically at deployed script addresses. No trade/PnL, user ownership or yield is inferred."
  },{headers});
 }catch{
  return NextResponse.json({
   network:"preprod",verified:false,executionEnabled:false,products:[],
   reason:"Cannot independently reconcile the five reference scripts and locked output index."
  },{status:503,headers});
 }
}

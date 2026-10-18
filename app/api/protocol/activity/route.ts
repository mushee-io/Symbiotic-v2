import {NextResponse} from "next/server";
import {parsePublicPreprodManifest,observePreprodValidators} from "@/lib/preprod-validator-observer";
import {getVerifiedProtocolActivity,PROTOCOL_VALIDATORS,type ProtocolValidator} from "@/lib/preprod-protocol-activity";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request){
 const url=new URL(request.url);
 const name=url.searchParams.get("validator")??"perpetual";
 const limit=Number(url.searchParams.get("limit")??"5");
 if(!PROTOCOL_VALIDATORS.some(n=>n===name)||!Number.isSafeInteger(limit)||limit<1||limit>10)
  return NextResponse.json({error:"Unsupported validator or activity window"},{status:400,headers});
 const raw=process.env.SYMBIOTIC_PREPROD_VALIDATOR_MANIFEST_JSON;
 const projectId=process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID??"";
 if(!raw)return NextResponse.json({
  network:"preprod",verified:false,events:[],
  reason:"Five independent on-chain validator deployment receipts are required before indexing protocol activity."
 },{status:503,headers});
 try{
  if(raw.length>50000)throw Error("Oversized deployment manifest");
  const manifest=parsePublicPreprodManifest(JSON.parse(raw) as unknown);
  const proof=await observePreprodValidators(manifest,projectId);
  if(!proof.referenceValidatorsVerified||proof.validatorCount!==5)throw Error("Unverified validator deployments");
  const validator=manifest.validators.find(v=>v.name===name);
  if(!validator)throw Error("Missing deployed validator");
  const result=await getVerifiedProtocolActivity({
   scriptAddress:validator.scriptAddress,
   validator:name as ProtocolValidator,limit,projectId
  });
  return NextResponse.json(result,{headers});
 }catch{
  return NextResponse.json({network:"preprod",verified:false,events:[],
   reason:"Verified Cardano Preprod validator activity is incomplete or temporarily unavailable."
  },{status:503,headers});
 }
}

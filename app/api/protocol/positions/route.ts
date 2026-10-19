import {NextResponse} from "next/server";
import {deserializeDatum} from "@meshsdk/core";
import {parsePublicPreprodManifest,observePreprodValidators} from "@/lib/preprod-validator-observer";
import {fetchVerifiedScriptUtxos} from "@/lib/preprod-protocol-ledger";
import {parseAnyCorePosition,type CorePositionKind,type ObservedPosition} from "@/lib/preprod-position-index";
import {summariseVerifiedPositions} from "@/lib/preprod-protocol-metrics";
import {DEMO_ASSET_POLICY,DEMO_ASSET_NAME} from "@/lib/lace-demo-deployment";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const validatorNames=["perpetual","options"] as const;
export async function GET(){
 const raw=process.env.SYMBIOTIC_PREPROD_VALIDATOR_MANIFEST_JSON;
 const projectId=process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID??"";
 if(!raw||raw.length>50000||!/^preprod[a-z0-9]{10,}$/i.test(projectId))
  return NextResponse.json({verified:false,network:"preprod",
   reason:"Five-validator Preprod manifest or provider not configured."},{status:503,headers});
 try{
  const manifest=parsePublicPreprodManifest(JSON.parse(raw) as unknown);
  const verified=await observePreprodValidators(manifest,projectId);
  if(verified.validatorCount!==5||!verified.referenceValidatorsVerified)
   throw Error("Five deployed validators not verified");
  const all=await Promise.all(validatorNames.map(async name=>{
   const deployed=manifest.validators.find(x=>x.name===name);
   if(!deployed)throw Error("Missing validator from five-validator manifest");
   const records=await fetchVerifiedScriptUtxos(deployed.scriptAddress,projectId);
   if(!Array.isArray(records))throw Error("Preprod index not bounded");
   const positions:ObservedPosition[]=[];
   let noInline=0;
   for(const item of records){
    if(!item||typeof item!=="object"||Array.isArray(item))
     throw Error("Invalid script UTxO record");
    const rawDatum=(item as {inline_datum?:unknown}).inline_datum;
    if(rawDatum==null){noInline++;continue;}
    if(typeof rawDatum!=="string"||rawDatum.length<4||rawDatum.length>16000||
       rawDatum.length%2!==0||!/^[0-9a-f]+$/i.test(rawDatum))
     throw Error("Invalid Cardano inline datum");
    const decoded:unknown=deserializeDatum(rawDatum);
    positions.push(parseAnyCorePosition({
     kind:name as CorePositionKind,output:item,decodedDatum:decoded,
     stableUnit:DEMO_ASSET_POLICY+DEMO_ASSET_NAME
    }));
   }
   return {positions,noInline};
  }));
  const positions=all.flatMap(x=>x.positions);
  return NextResponse.json({
   network:"preprod",verified:true,validatorCount:5,
   observedAt:new Date().toISOString(),
   ...summariseVerifiedPositions(positions),
   scriptOutputsWithoutInlineDatum:all.reduce((n,x)=>n+x.noInline,0),
   historicTradeVolumeAvailable:false,
   profitLossAvailable:false
  },{headers});
 }catch{
  return NextResponse.json({verified:false,network:"preprod",
   reason:"Position-derived protocol statistics cannot be verified; no speculative metrics returned."},
   {status:503,headers});
 }
}

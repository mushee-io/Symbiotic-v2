import {NextResponse} from "next/server";
import {deserializeAddress,deserializeDatum} from "@meshsdk/core";
import {assertPreprodPaymentAddress} from "@/lib/portfolio-analytics";
import {parsePublicPreprodManifest,observePreprodValidators} from "@/lib/preprod-validator-observer";
import {fetchVerifiedScriptUtxos} from "@/lib/preprod-protocol-ledger";
import {parseCorePosition,type CorePositionKind,type ObservedPosition} from "@/lib/preprod-position-index";
import {DEMO_ASSET_POLICY,DEMO_ASSET_NAME} from "@/lib/lace-demo-deployment";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const supported=["perpetual","options"] as const;

export async function GET(request:Request){
 let address="";
 try{
  address=assertPreprodPaymentAddress(new URL(request.url).searchParams.get("address")??"");
  const ownerKeyHash=deserializeAddress(address).pubKeyHash;
  if(!ownerKeyHash||!/^[a-f0-9]{56}$/i.test(ownerKeyHash))
   return NextResponse.json({error:"Preprod payment key address required"},{status:400,headers});
  const raw=process.env.SYMBIOTIC_PREPROD_VALIDATOR_MANIFEST_JSON;
  const providerId=process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID??"";
  if(!raw||raw.length>50000||!/^preprod[a-z0-9]{10,}$/i.test(providerId))
   return NextResponse.json({network:"preprod",verified:false,
    reason:"Preprod manifest or chain observer has not been configured; positions cannot be verified."},
    {status:503,headers});
  const manifest=parsePublicPreprodManifest(JSON.parse(raw) as unknown);
  const proof=await observePreprodValidators(manifest,providerId);
  if(!proof.referenceValidatorsVerified||proof.validatorCount!==5)
   throw Error("Five reference scripts not verified");
  const results=await Promise.all(supported.map(async kind=>{
   const validator=manifest.validators.find(v=>v.name===kind);
   if(!validator)throw Error("Validator absent in verified manifest");
   const rawOutputs=await fetchVerifiedScriptUtxos(validator.scriptAddress,providerId);
   if(!Array.isArray(rawOutputs))throw Error("Malformed Preprod script UTxO index");
   const positions:ObservedPosition[]=[];
   let outputsWithoutInlineDatum=0;
   for(const output of rawOutputs){
    if(!output||typeof output!=="object"||Array.isArray(output))
     throw Error("Malformed script position output");
    const record=output as {inline_datum?:unknown};
    if(record.inline_datum==null){outputsWithoutInlineDatum++;continue;}
    if(typeof record.inline_datum!=="string"||record.inline_datum.length>16000||
       record.inline_datum.length%2!==0||!/^[0-9a-f]+$/i.test(record.inline_datum))
     throw Error("Invalid inline position datum");
    const decoded:unknown=deserializeDatum(record.inline_datum);
    const position=parseCorePosition({
     kind:kind as CorePositionKind,output,decodedDatum:decoded,
     stableUnit:DEMO_ASSET_POLICY+DEMO_ASSET_NAME,ownerKeyHash
    });
    if(position)positions.push(position);
   }
   return {kind,scriptHash:validator.scriptHash,
    scriptAddress:validator.scriptAddress,positions,outputsWithoutInlineDatum};
  }));
  const positions=results.flatMap(r=>r.positions);
  const refs=new Set<string>();
  for(const p of positions){
   if(refs.has(p.reference))throw Error("Duplicate observed position UTxO");
   refs.add(p.reference);
  }
  return NextResponse.json({
   network:"preprod",verified:true,ownerAddress:address,
   observedAt:new Date().toISOString(),positions,
   positionCount:positions.length,protocolValidatorsVerified:5,
   completeScriptOutputSnapshots:true,
   skippedNonInlineOutputs:results.reduce((sum,r)=>sum+r.outputsWithoutInlineDatum,0),
   note:"Only unspent collateral-backed position datums belonging to this payment key at the independently verified core scripts. Not trade execution, spendability assurance, realised PnL or tokenised real stock ownership."
  },{headers});
 }catch(error){
  if(!address)return NextResponse.json({error:"Provide a valid Cardano Preprod payment address"},{status:400,headers});
  return NextResponse.json({network:"preprod",verified:false,positions:[],
   reason:"Preprod position evidence unavailable or inconsistent. No positions can be certified.",
   // Do not echo a potentially sensitive upstream provider error.
   code:error instanceof Error&&/Invalid|Malformed|Inconsistent|Unexpected|collateral/.test(error.message)?"CHAIN_EVIDENCE_REJECTED":"PROVIDER_OR_MANIFEST_UNAVAILABLE"
  },{status:503,headers});
 }
}

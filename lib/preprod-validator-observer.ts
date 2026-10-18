/** Public, independently verified Cardano Preprod validator deployments.
 * The local MM deployment manifest is NOT on-chain proof by itself. We
 * cross-check the exact reference script against Blockfrost and require its
 * UTxO to remain unspent. No signer or wallet private key is involved.
 */
import {inspectReferenceOutput} from "../mm/src/reference-script-proof";

const BASE="https://cardano-preprod.blockfrost.io/api/v0";
const REQUIRED=["collateral","perpetual","options","notional","registry"] as const;
const HASH64=/^[a-f0-9]{64}$/i,HASH56=/^[a-f0-9]{56}$/i;
const ADDRESS=/^addr_test1[a-z0-9]{35,120}$/;
type Receipt={
 name:string;title:string;scriptHash:string;scriptAddress:string;txHash:string;
 outputIndex:number;referenceUtxo:string;referenceReserveLovelace:string;
};
export type PublicPreprodManifest={
 status:"complete";network:"preprod";networkMagic:1;blueprintSha256:string;
 mmAddress:string;validators:Receipt[];
};
type AddressUtxo={tx_hash?:string;output_index?:number};
function obj(v:unknown):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))throw Error("Invalid public Preprod manifest");
 return v as Record<string,unknown>;
}
export function parsePublicPreprodManifest(input:unknown):PublicPreprodManifest{
 const value=obj(input);
 if(value.network!=="preprod"||value.networkMagic!==1||value.status!=="complete"||
    !HASH64.test(String(value.blueprintSha256??""))||
    typeof value.mmAddress!=="string"||!ADDRESS.test(value.mmAddress)||
    !Array.isArray(value.validators)||value.validators.length!==5)
  throw Error("Complete five-validator Preprod manifest required");
 const names=new Set<string>(),refs=new Set<string>(),scriptHashes=new Set<string>();
 for(const entry of value.validators){
  const r=obj(entry);
  if(typeof r.name!=="string"||!REQUIRED.some(n=>n===r.name)||names.has(r.name)||
     typeof r.title!=="string"||!r.title.endsWith(".spend")||
     typeof r.scriptHash!=="string"||!HASH56.test(r.scriptHash)||
     typeof r.scriptAddress!=="string"||!ADDRESS.test(r.scriptAddress)||
     typeof r.txHash!=="string"||!HASH64.test(r.txHash)||
     !Number.isSafeInteger(r.outputIndex)||Number(r.outputIndex)<0||
     typeof r.referenceUtxo!=="string"||
     r.referenceUtxo!==r.txHash+"#"+r.outputIndex||
     typeof r.referenceReserveLovelace!=="string"||
     !/^[1-9][0-9]*$/.test(r.referenceReserveLovelace)||
     refs.has(r.referenceUtxo)||scriptHashes.has(r.scriptHash))
   throw Error("Invalid or duplicate validator deployment receipt");
  names.add(r.name);refs.add(r.referenceUtxo);scriptHashes.add(r.scriptHash);
 }
 if(REQUIRED.some(name=>!names.has(name)))throw Error("Missing required Preprod validator");
 return value as unknown as PublicPreprodManifest;
}
async function json(url:string,projectId:string,fetcher:typeof fetch):Promise<unknown>{
 const response=await fetcher(url,{
  headers:{project_id:projectId},redirect:"error",cache:"no-store",
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error("Cardano Preprod evidence provider is unavailable");
 return response.json();
}
async function unspentReferenceSet(address:string,projectId:string,fetcher:typeof fetch){
 const seen=new Set<string>();
 for(let page=1;page<=8;page++){
  const raw=await json(BASE+"/addresses/"+address+"/utxos?count=100&page="+page,
   projectId,fetcher);
  if(!Array.isArray(raw)||raw.length>100)throw Error("Invalid Preprod UTxO index response");
  for(const item of raw){
   const utxo=obj(item);
   if(typeof utxo.tx_hash!=="string"||!HASH64.test(utxo.tx_hash)||
      !Number.isSafeInteger(utxo.output_index)||Number(utxo.output_index)<0)
    throw Error("Malformed address UTxO record");
   seen.add(utxo.tx_hash.toLowerCase()+"#"+utxo.output_index);
  }
  if(raw.length<100)return seen;
 }
 throw Error("UTxO snapshot exceeded bounded verification limit");
}
export async function observePreprodValidators(
 manifest:PublicPreprodManifest,projectId:string,fetcher:typeof fetch=fetch
){
 const parsed=parsePublicPreprodManifest(manifest);
 if(!/^preprod[a-z0-9]{10,}$/i.test(projectId))throw Error("Preprod provider configuration required");
 const refs=await unspentReferenceSet(parsed.mmAddress,projectId,fetcher);
 const proofs=await Promise.all(parsed.validators.map(async r=>{
  if(!refs.has(r.referenceUtxo.toLowerCase()))
   throw Error("Reference-script UTxO is spent or absent on Cardano Preprod");
  const [outputs,tx]=await Promise.all([
   json(BASE+"/txs/"+r.txHash+"/utxos",projectId,fetcher),
   json(BASE+"/txs/"+r.txHash,projectId,fetcher)
  ]);
  const proof=inspectReferenceOutput({
   txHash:r.txHash,outputIndex:r.outputIndex,address:parsed.mmAddress,
   scriptHash:r.scriptHash,minLovelace:r.referenceReserveLovelace
  },outputs as Parameters<typeof inspectReferenceOutput>[1],
   tx as Parameters<typeof inspectReferenceOutput>[2]);
  return {name:r.name,scriptHash:r.scriptHash,scriptAddress:r.scriptAddress,
   referenceUtxo:r.referenceUtxo,txHash:r.txHash,blockHeight:Number(proof.blockHeight),
   confirmed:true as const,unspent:true as const};
 }));
 return {network:"preprod" as const,referenceValidatorsVerified:true as const,
  validatorCount:proofs.length,blueprintSha256:parsed.blueprintSha256,
  observedAt:new Date().toISOString(),validators:proofs,
  tradeExecutionEnabled:false as const,
  note:"Five unspent reference scripts are proven; this does not prove funded trading lifecycles or release security."};
}

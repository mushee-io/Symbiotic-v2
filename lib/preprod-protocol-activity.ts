/**
 * Cardano Preprod read-only activity at a VERIFIED validator address.
 * A transaction touching a script is NOT necessarily a trade, fill, or
 * an authenticated deposit. Do not classify datum changes as trading PnL.
 */
const API="https://cardano-preprod.blockfrost.io/api/v0";
const HASH=/^[a-f0-9]{64}$/i;
const ADDRESS=/^addr_test1[a-z0-9]{35,120}$/;
const UINT=/^(0|[1-9][0-9]*)$/;
export const PROTOCOL_VALIDATORS=["collateral","perpetual","options","notional","registry"] as const;
export type ProtocolValidator=typeof PROTOCOL_VALIDATORS[number];
export type ScriptActivityKind="OUTPUT_CREATED"|"OUTPUT_CONSUMED"|"SCRIPT_STATE_UPDATED";
type Item={address?:unknown;amount?:unknown};
type TxInputsOutputs={inputs?:unknown;outputs?:unknown};
type ChainTx={
 hash?:unknown;block?:unknown;block_height?:unknown;block_time?:unknown;fees?:unknown
};
type ActivityEntry={txHash:string;blockHeight:number;timestamp:string;kind:ScriptActivityKind;
 incomingLovelace:string;outgoingLovelace:string;netLovelaceChange:string;
 createdScriptOutputs:number;consumedScriptInputs:number;explorer:string};
function parseOutputList(value:unknown,label:string):Item[]{
 if(!Array.isArray(value)||value.length>100)throw Error("Invalid "+label+" outputs on Preprod");
 return value as Item[];
}
function lovelaceAtScript(items:Item[],address:string){
 let count=0,amount=0n;
 for(const item of items){
  if(!item||typeof item!=="object"||Array.isArray(item))throw Error("Malformed Preprod UTxO");
  if(item.address!==address)continue;
  if(!Array.isArray(item.amount)||item.amount.length<1||item.amount.length>100)
   throw Error("Malformed Preprod script assets");
  const seen=new Set<string>();
  let ada:bigint|null=null;
  for(const a of item.amount){
   if(!a||typeof a!=="object"||Array.isArray(a))throw Error("Invalid Preprod script token");
   const token=a as {unit?:unknown;quantity?:unknown};
   if(typeof token.unit!=="string"||(token.unit!=="lovelace"&&!/^[a-f0-9]{56,120}$/i.test(token.unit))||
      typeof token.quantity!=="string"||!UINT.test(token.quantity)||seen.has(token.unit))
    throw Error("Malformed script amount or duplicate asset");
   seen.add(token.unit);
   if(token.unit==="lovelace")ada=BigInt(token.quantity);
  }
  if(ada===null||ada<1_000_000n)throw Error("Script output missing minimum Preprod ADA");
  amount+=ada;count++;
 }
 return {count,amount};
}
export function classifyVerifiedProtocolActivity(input:{
 expectedHash:string;scriptAddress:string;
 utxos:unknown;tx:unknown;nowMs?:number
}):ActivityEntry{
 const {expectedHash,scriptAddress}=input;
 if(!HASH.test(expectedHash)||!ADDRESS.test(scriptAddress))
  throw Error("Invalid Preprod protocol transaction reference");
 if(!input.utxos||typeof input.utxos!=="object"||Array.isArray(input.utxos)||
    !input.tx||typeof input.tx!=="object"||Array.isArray(input.tx))
  throw Error("Preprod activity provider returned malformed evidence");
 const utxos=input.utxos as TxInputsOutputs,tx=input.tx as ChainTx;
 const time=Number(tx.block_time);
 const now=input.nowMs??Date.now();
 if(tx.hash!==expectedHash||typeof tx.block!=="string"||!HASH.test(tx.block)||
    !Number.isSafeInteger(tx.block_height)||Number(tx.block_height)<=0||
    !Number.isSafeInteger(tx.block_time)||time<=0||time*1000>now+60_000||
    !UINT.test(String(tx.fees))||BigInt(String(tx.fees))<1n)
  throw Error("Preprod transaction is not independently confirmed");
 const inItems=parseOutputList(utxos.inputs,"transaction inputs");
 const outItems=parseOutputList(utxos.outputs,"transaction");
 const consumed=lovelaceAtScript(inItems,scriptAddress);
 const created=lovelaceAtScript(outItems,scriptAddress);
 if(consumed.count===0&&created.count===0)throw Error("Transaction does not touch verified protocol validator");
 const kind:ScriptActivityKind=consumed.count>0&&created.count>0?"SCRIPT_STATE_UPDATED":
  created.count>0?"OUTPUT_CREATED":"OUTPUT_CONSUMED";
 return {
  txHash:expectedHash,blockHeight:Number(tx.block_height),
  timestamp:new Date(time*1000).toISOString(),kind,
  incomingLovelace:created.amount.toString(),outgoingLovelace:consumed.amount.toString(),
  netLovelaceChange:(created.amount-consumed.amount).toString(),
  createdScriptOutputs:created.count,consumedScriptInputs:consumed.count,
  explorer:"https://preprod.cexplorer.io/tx/"+expectedHash
 };
}
async function getJson(url:string,key:string,fetcher:typeof fetch):Promise<unknown>{
 const response=await fetcher(url,{
  headers:{project_id:key},cache:"no-store",redirect:"error",
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error("Preprod activity evidence provider unavailable");
 return response.json() as Promise<unknown>;
}
export async function getVerifiedProtocolActivity(input:{
 scriptAddress:string;validator:ProtocolValidator;projectId:string;limit?:number;
 fetcher?:typeof fetch;nowMs?:number
}){
 const {scriptAddress,validator,projectId}=input;
 const limit=input.limit??5,fetcher=input.fetcher??fetch;
 if(!PROTOCOL_VALIDATORS.includes(validator)||!ADDRESS.test(scriptAddress)||
    !/^preprod[a-z0-9]{10,}$/i.test(projectId)||
    !Number.isSafeInteger(limit)||limit<1||limit>10)
  throw Error("Invalid bounded Cardano Preprod protocol activity request");
 const indexed=await getJson(
  API+"/addresses/"+scriptAddress+"/transactions?order=desc&count="+limit+"&page=1",
  projectId,fetcher
 );
 if(!Array.isArray(indexed)||indexed.length>limit)throw Error("Malformed Preprod script activity index");
 const hashes:string[]=[];
 for(const item of indexed){
  if(!item||typeof item!=="object"||Array.isArray(item))throw Error("Invalid indexed script transaction");
  const hash=(item as {tx_hash?:unknown}).tx_hash;
  if(typeof hash!=="string"||!HASH.test(hash)||hashes.includes(hash.toLowerCase()))
   throw Error("Invalid or duplicate indexed transaction");
  hashes.push(hash.toLowerCase());
 }
 const events=await Promise.all(hashes.map(async hash=>{
  const [utxos,tx]=await Promise.all([
   getJson(API+"/txs/"+hash+"/utxos",projectId,fetcher),
   getJson(API+"/txs/"+hash,projectId,fetcher)
  ]);
  return classifyVerifiedProtocolActivity({
   expectedHash:hash,scriptAddress,utxos,tx,nowMs:input.nowMs
  });
 }));
 return {network:"preprod" as const,validator,
  scriptAddress,verified:true as const,transactionsObserved:events.length,events,
  observedAt:new Date(input.nowMs??Date.now()).toISOString(),
  isCompleteHistory:false as const,
  classification:"Confirmed changes to UTxOs at the verified validator address. Not interpreted as trade volume, PnL or positions."
 };
}

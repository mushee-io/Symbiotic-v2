/**
 * Independently observed Cardano Preprod script-locked UTxO accounting.
 * This is NOT a position / ownership / PnL decoder. Counts are scoped to
 * deployed, proven validator addresses and fail closed on truncated pages.
 */
export type ScriptUtxoRecord={
 tx_hash?:unknown;output_index?:unknown;amount?:unknown;
 inline_datum?:unknown;data_hash?:unknown;
};
const HEX64=/^[a-f0-9]{64}$/i;
const ASSET=/^[a-f0-9]{56,120}$/i;
const UINT=/^(0|[1-9][0-9]*)$/;
const names=["collateral","perpetual","options","notional","registry"] as const;
export type ValidatorName=typeof names[number];

export function summarizeVerifiedScriptUtxos(name:ValidatorName,records:unknown){
 if(!names.includes(name)||!Array.isArray(records)||records.length>100)
  throw Error("Invalid bounded Cardano Preprod script output index");
 const seen=new Set<string>();
 const assetTotals=new Map<string,bigint>();
 let inlineDatumOutputs=0,datumHashOutputs=0,totalLovelace=0n;
 const outputs=records.map(item=>{
  if(!item||typeof item!=="object"||Array.isArray(item))throw Error("Malformed script UTxO");
  const o=item as ScriptUtxoRecord;
  if(typeof o.tx_hash!=="string"||!HEX64.test(o.tx_hash)||
   !Number.isSafeInteger(o.output_index)||Number(o.output_index)<0||
   !Array.isArray(o.amount)||o.amount.length<1||o.amount.length>100)
   throw Error("Invalid script output ref or token amounts");
  const ref=o.tx_hash.toLowerCase()+"#"+o.output_index;
  if(seen.has(ref))throw Error("Duplicated script UTxO in provider snapshot");
  seen.add(ref);
  let ada=0n;
  const units=new Set<string>();
  for(const a of o.amount){
   if(!a||typeof a!=="object"||Array.isArray(a))throw Error("Malformed asset entry");
   const asset=a as {unit?:unknown;quantity?:unknown};
   if(typeof asset.unit!=="string"||(asset.unit!=="lovelace"&&!ASSET.test(asset.unit))||
    typeof asset.quantity!=="string"||!UINT.test(asset.quantity)||units.has(asset.unit))
    throw Error("Invalid or duplicated asset amount in script output");
   units.add(asset.unit);
   const q=BigInt(asset.quantity);
   if(asset.unit==="lovelace")ada+=q;
   else assetTotals.set(asset.unit,(assetTotals.get(asset.unit)||0n)+q);
  }
  if(!units.has("lovelace")||ada<1_000_000n)throw Error("Script output missing minimum Cardano ADA");
  totalLovelace+=ada;
  const inline=typeof o.inline_datum==="string"&&o.inline_datum.length>0;
  const datumHash=typeof o.data_hash==="string"&&HEX64.test(o.data_hash);
  if(o.inline_datum!=null && (!inline||!(/^[a-f0-9]+$/i.test(String(o.inline_datum)))||String(o.inline_datum).length%2))
   throw Error("Invalid inline datum CBOR");
  if(o.data_hash!=null&&!datumHash)throw Error("Invalid datum hash");
  if(inline)inlineDatumOutputs++;
  if(datumHash)datumHashOutputs++;
  return {ref,txHash:o.tx_hash.toLowerCase(),outputIndex:Number(o.output_index),
   lovelace:ada.toString(),hasInlineDatum:inline,hasDatumHash:datumHash};
 });
 return {
  validator:name,utxoCount:outputs.length,totalLovelace:totalLovelace.toString(),
  inlineDatumOutputs,datumHashOutputs,
  nativeAssets:[...assetTotals.entries()].sort(([a],[b])=>a.localeCompare(b))
    .map(([unit,quantity])=>({unit,quantity:quantity.toString()})),
  outputs,
  note:"Unspent outputs physically locked at a verified Cardano Preprod validator; not attributed to a user and not interpreted as open positions."
 };
}

export async function fetchVerifiedScriptUtxos(
 address:string,projectId:string,fetcher:typeof fetch=fetch
):Promise<unknown>{
 if(!/^addr_test1[a-z0-9]{35,120}$/.test(address)||
    !/^preprod[a-z0-9]{10,}$/i.test(projectId))
  throw Error("Preprod script observation is not configured");
 const response=await fetcher(
  "https://cardano-preprod.blockfrost.io/api/v0/addresses/"+address+"/utxos?count=100&page=1",
  {headers:{project_id:projectId},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error("Cardano Preprod locked-output provider is unavailable");
 const result:unknown=await response.json();
 if(!Array.isArray(result)||result.length>=100)
  throw Error("Script UTxO index incomplete; paging required before reporting totals");
 return result;
}

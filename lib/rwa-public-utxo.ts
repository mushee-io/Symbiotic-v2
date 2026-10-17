// Public read-only Preprod UTxO verification with fail-closed spent output checks.
// Network ID 0 alone cannot distinguish Cardano Preview from Preprod.
const API="https://preprod.koios.rest/api/v1";
const REF=/^[a-f0-9]{64}#[0-9]{1,3}$/i;
type Utxo={tx_hash?:string;tx_index?:number;is_spent?:boolean;address?:string};
export async function verifyPublicPreprodUtxos(refs:string[],fetcher:typeof fetch=fetch,nowMs=Date.now()){
 if(!Array.isArray(refs)||refs.length<1||refs.length>3||!refs.every(s=>typeof s==="string"&&REF.test(s)))
  throw Error("Supply 1–3 valid Preprod UTxO references");
 const unique=[...new Set(refs.map(x=>x.toLowerCase()))];
 if(unique.length!==refs.length)throw Error("Duplicate wallet UTxO references");
 const [tipResponse,utxoResponse]=await Promise.all([
  fetcher(API+"/tip",{headers:{Accept:"application/json"},signal:AbortSignal.timeout(8000),cache:"no-store"}),
  fetcher(API+"/utxo_info",{method:"POST",headers:{"content-type":"application/json",Accept:"application/json"},
   body:JSON.stringify({_utxo_refs:unique}),signal:AbortSignal.timeout(8000),cache:"no-store"})
 ]);
 if(!tipResponse.ok||!utxoResponse.ok)throw Error("Preprod public UTxO provider unavailable");
 const tip:unknown=await tipResponse.json();
 const all:unknown=await utxoResponse.json();
 if(!Array.isArray(tip)||tip.length!==1||!tip[0]||typeof tip[0]!=="object"||
    !Number.isSafeInteger((tip[0] as {block_time?:number}).block_time))
  throw Error("Invalid Preprod chain tip");
 const at=(tip[0] as {block_time:number}).block_time*1000;
 if(nowMs-at< -60_000||nowMs-at>600_000)throw Error("Preprod tip is stale or future-dated");
 if(!Array.isArray(all))throw Error("Invalid UTxO provider result");
 const outputs=all as Utxo[];
 for(const item of outputs){
  if(!item||!REF.test((item.tx_hash||"")+"#"+item.tx_index))
   throw Error("Invalid Preprod UTxO record");
 }
 const found=unique.find(ref=>outputs.some(x=>
  x.tx_hash?.toLowerCase()+"#"+x.tx_index===ref&&x.is_spent===false&&
  typeof x.address==="string"&&x.address.startsWith("addr_test1")));
 if(!found)throw Error("No verified UNSPENT wallet UTxO on Cardano Preprod");
 return {network:"preprod" as const,verified:true as const,matchedUtxo:found,source:"koios-preprod",
  tipObservedAt:new Date(at).toISOString()};
}

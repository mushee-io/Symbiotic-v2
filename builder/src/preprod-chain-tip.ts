import {SELF_TEST_CHAIN_TTL_SLOTS} from "./policy.js";

export type PreprodChainTip={slot:number;time:number};
const PREPROD_BLOCKFROST="https://cardano-preprod.blockfrost.io/api/v0/blocks/latest";
const LOWER_BOUND_MARGIN_SLOTS=300;

/** Fail closed if the chain tip is stale; local time is used ONLY to
 * verify freshness, never to choose the transaction's starting slot.
 */
export function preprodValidityWindow(tip:PreprodChainTip,nowMs=Date.now()){
 if(!Number.isSafeInteger(tip.slot)||tip.slot<=LOWER_BOUND_MARGIN_SLOTS||
    !Number.isSafeInteger(tip.time)||tip.time<=0)throw Error("Invalid Cardano Preprod chain tip");
 const lag=nowMs-tip.time*1000;
 if(!Number.isFinite(lag)||lag< -60_000||lag>600_000)
  throw Error("Cardano Preprod chain tip is stale or future-dated");
 const invalidBefore=tip.slot-LOWER_BOUND_MARGIN_SLOTS;
 const invalidHereafter=tip.slot+SELF_TEST_CHAIN_TTL_SLOTS;
 if(!Number.isSafeInteger(invalidHereafter)||invalidHereafter<=invalidBefore)
  throw Error("Invalid Cardano Preprod validity window");
 return {invalidBefore,invalidHereafter};
}

/** Blockfrost is already authenticated by the builder's original Preprod
 * project id. This does NOT touch wallet private keys or Vercel credentials.
 */
export async function fetchPreprodChainTip(projectId:string,nowMs=Date.now(),fetcher:typeof fetch=fetch):Promise<PreprodChainTip>{
 const response=await fetcher(PREPROD_BLOCKFROST,{
  headers:{project_id:projectId},redirect:"error",cache:"no-store",
  signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw Error("Cardano Preprod tip provider unavailable");
 const tip:unknown=await response.json();
 if(!tip||typeof tip!=="object"||Array.isArray(tip))throw Error("Invalid Cardano Preprod tip response");
 const parsed=tip as {slot?:unknown;time?:unknown};
 const result={slot:parsed.slot as number,time:parsed.time as number};
 preprodValidityWindow(result,nowMs);
 return result;
}

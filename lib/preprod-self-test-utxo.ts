import type {UTxO} from "@meshsdk/core";

/** Wallet-reported spendable UTxOs may belong to receiving addresses,
 * not the wallet's change address. We select an ADA-only output and
 * later verify it on Preprod before building any transaction.
 *
 * All transaction outputs remain restricted to the selected input's
 * exact address, with no other destinations or token assets.
 */
export function selectPreprodSelfTestUtxo(utxos:ReadonlyArray<UTxO>):UTxO|undefined {
 const valid=utxos.filter(u=>{
  if(!u||!u.output||!u.input)return false;
  if(!/^addr_test1[a-z0-9]{35,120}$/.test(u.output.address))return false;
  if(!/^[0-9a-f]{64}$/i.test(u.input.txHash)||!Number.isSafeInteger(u.input.outputIndex)||
     u.input.outputIndex<0||u.input.outputIndex>999)return false;
  const amounts=u.output.amount;
  if(!Array.isArray(amounts)||amounts.length!==1||amounts[0]?.unit!=="lovelace")return false;
  const q=amounts[0].quantity;
  return typeof q==="string"&&/^[0-9]+$/.test(q)&&BigInt(q)>=5_000_000n;
 });
 // Prefer a larger ADA-only output to avoid insufficient ADA for fees.
 return valid.reduce<UTxO|undefined>((best,u)=>
  !best||BigInt(u.output.amount[0].quantity)>BigInt(best.output.amount[0].quantity)?u:best,undefined);
}

/** Independent confirmed-chain proof for ADA-only wallet-to-self transactions. */
const HEX64=/^[a-f0-9]{64}$/i;
const ADDRESS=/^addr_test1[a-z0-9]{35,120}$/;
type Value={address?:string;amount?:Array<{unit?:string;quantity?:string}>};
function adaOnly(o:Value):bigint{
 const a=o.amount;
 if(!Array.isArray(a)||a.length!==1||a[0].unit!=="lovelace"||
    typeof a[0].quantity!=="string"||!/^[0-9]+$/.test(a[0].quantity))
  throw Error("Wallet self-test contains non-ADA assets or invalid value");
 return BigInt(a[0].quantity);
}
export function verifyPreprodSelfReturn(hash:string,address:string,evidence:unknown,transaction:unknown){
 if(!HEX64.test(hash)||!ADDRESS.test(address))throw Error("Invalid Preprod wallet receipt reference");
 if(!evidence||typeof evidence!=="object"||Array.isArray(evidence)||
    !transaction||typeof transaction!=="object"||Array.isArray(transaction))
  throw Error("Invalid transaction evidence");
 const e=evidence as {inputs?:Value[];outputs?:Value[]};
 const tx=transaction as {hash?:string;block?:string;block_height?:number;fees?:string};
 if(tx.hash?.toLowerCase()!==hash.toLowerCase()||
    !HEX64.test(tx.block??"")||!Number.isSafeInteger(tx.block_height)||Number(tx.block_height)<=0)
  throw Error("Transaction not independently confirmed on Cardano Preprod");
 if(!tx.fees||!/^[0-9]+$/.test(tx.fees))throw Error("Missing transaction fee");
 const fee=BigInt(tx.fees);
 if(fee<=0n||fee>1_500_000n)throw Error("Wallet self-test fee exceeds policy");
 if(!Array.isArray(e.inputs)||e.inputs.length===0||e.inputs.length>20||
    !Array.isArray(e.outputs)||e.outputs.length===0||e.outputs.length>20)
  throw Error("Invalid number of wallet transaction inputs or outputs");
 let incoming=0n,outgoing=0n,returned=false;
 for(const input of e.inputs){
  if(input.address!==address)throw Error("Wallet self-test input from unexpected address");
  incoming+=adaOnly(input);
 }
 for(const output of e.outputs){
  if(output.address!==address)throw Error("Wallet self-test has an outside-wallet output");
  const value=adaOnly(output);
  if(value>=2_000_000n)returned=true;
  outgoing+=value;
 }
 if(!returned)throw Error("Wallet self-test return output is missing");
 if(incoming-outgoing!==fee)throw Error("Wallet self-test amounts do not conserve network fee");
 return {confirmed:true as const,network:"preprod" as const,
  txHash:hash.toLowerCase(),walletReturnVerified:true as const,
  blockHeight:tx.block_height,feeLovelace:fee.toString(),
  inputs:e.inputs.length,outputs:e.outputs.length,
  blockExplorer:"https://preprod.cexplorer.io/tx/"+hash.toLowerCase(),
  note:"Confirmed ADA-only wallet-to-self transfer; protocol trading remains unverified."};
}

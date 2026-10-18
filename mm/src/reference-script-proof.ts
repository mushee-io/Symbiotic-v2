/**
 * Independent Blockfrost Preprod on-chain reference-script proof.
 * A reference-script deployment is NOT proven by its address or tx hash alone.
 * The exact output must be unspent and carry the expected Plutus script hash.
 * No wallet key is used or accepted by this read-only verifier.
 */
export type ReferenceScriptExpected={
 txHash:string;
 outputIndex:number;
 address:string;
 scriptHash:string;
 minLovelace:string;
};
type ChainOutput={
 output_index?:number;
 address?:string;
 amount?:Array<{unit?:string;quantity?:string}>;
 reference_script_hash?:string|null;
};
type ChainUtxos={outputs?:ChainOutput[]};
type ChainTransaction={block?:string;block_height?:number};

const HEX64=/^[a-f0-9]{64}$/i;
const HEX56=/^[a-f0-9]{56}$/i;
const PREPROD="https://cardano-preprod.blockfrost.io/api/v0";

/** Pure validator makes omission or hash mismatch fail closed. */
export function inspectReferenceOutput(
 expected:ReferenceScriptExpected,
 utxos:ChainUtxos,
 tx:ChainTransaction
){
 if(!HEX64.test(expected.txHash)||!HEX56.test(expected.scriptHash)||
    !Number.isSafeInteger(expected.outputIndex)||expected.outputIndex<0||
    !/^addr_test1[a-z0-9]{35,120}$/.test(expected.address)||
    !/^[0-9]+$/.test(expected.minLovelace))
  throw Error("Invalid expected Preprod reference-script receipt");
 if(!Number.isSafeInteger(tx.block_height)||!tx.block||!HEX64.test(tx.block))
  throw Error("Reference-script transaction is not independently confirmed in a block");
 if(!Array.isArray(utxos.outputs))throw Error("Blockfrost did not return transaction outputs");
 const outputs=utxos.outputs.filter(o=>o.output_index===expected.outputIndex);
 if(outputs.length!==1)throw Error("Missing or ambiguous on-chain reference-script output");
 const output=outputs[0];
 if(output.address!==expected.address)throw Error("Reference-script output address mismatch");
 if(output.reference_script_hash?.toLowerCase()!==expected.scriptHash.toLowerCase())
  throw Error("Reference-script hash missing or mismatched on-chain");
 const ada=output.amount?.find(a=>a.unit==="lovelace");
 if(!ada||typeof ada.quantity!=="string"||!/^[0-9]+$/.test(ada.quantity)||
    BigInt(ada.quantity)<BigInt(expected.minLovelace))
  throw Error("Reference-script output has insufficient ADA reserve");
 return {
  verified:true as const,
  network:"preprod" as const,
  txHash:expected.txHash.toLowerCase(),
  outputIndex:expected.outputIndex,
  referenceScriptHash:expected.scriptHash.toLowerCase(),
  blockHeight:tx.block_height,
  blockHash:tx.block.toLowerCase(),
  lovelace:ada.quantity
 };
}

/** Do not print, log or expose the private Blockfrost API project id. */
export async function verifyReferenceScriptReceipt(
 expected:ReferenceScriptExpected,
 projectId:string,
 fetcher:typeof fetch=fetch
){
 if(!/^preprod[a-z0-9]{10,}$/i.test(projectId))throw Error("Preprod API credential required");
 if(!HEX64.test(expected.txHash))throw Error("Invalid transaction hash");
 const headers={project_id:projectId};
 const options:RequestInit={headers,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)};
 const [outputsResponse,txResponse]=await Promise.all([
  fetcher(PREPROD+"/txs/"+expected.txHash+"/utxos",options),
  fetcher(PREPROD+"/txs/"+expected.txHash,options)
 ]);
 if(!outputsResponse.ok||!txResponse.ok)
  throw Error("Independent Preprod reference-script evidence unavailable");
 const outputs:unknown=await outputsResponse.json();
 const tx:unknown=await txResponse.json();
 if(!outputs||typeof outputs!=="object"||!tx||typeof tx!=="object"||
    Array.isArray(outputs)||Array.isArray(tx))throw Error("Invalid Blockfrost transaction evidence");
 return inspectReferenceOutput(expected,outputs as ChainUtxos,tx as ChainTransaction);
}

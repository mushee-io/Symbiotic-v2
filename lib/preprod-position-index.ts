/**
 * Decodes ONLY Aiken core perpetual/options inline datums at a deployment whose
 * five reference-script receipts have been independently verified on Preprod.
 * Not a price oracle, risk engine, trade history, profit estimate or custody
 * guarantee. All monetary fields stay integer base units.
 */
export type CorePositionKind="perpetual"|"options";
export type IndexedScriptOutput={
 tx_hash?:unknown;output_index?:unknown;amount?:unknown;inline_datum?:unknown
};
export type ObservedPosition={
 kind:CorePositionKind;reference:string;txHash:string;ownerKeyHash:string;
 market:string;lockedLovelace:string;lockedStableUnits:string;
 notionalOrContracts:string;nonce:string;entryOrStrike:string;
 sideOrKind:"LONG"|"SHORT"|"CALL"|"PUT";settlement:"OPEN"|"SETTLED";
 expiryMs:string|null;
};
const HEX56=/^[a-f0-9]{56}$/i, HEX64=/^[a-f0-9]{64}$/i;
const UNIT=/^[a-f0-9]{56,120}$/i;
const INT=/^(0|[1-9][0-9]*)$/;
function record(input:unknown):Record<string,unknown>{
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid Cardano datum structure");
 return input as Record<string,unknown>;
}
function dataField(value:unknown):unknown{
 if(value&&typeof value==="object"&&!Array.isArray(value)){
  const v=value as Record<string,unknown>;
  if(Object.keys(v).length===1&&"bytes" in v)return v.bytes;
  if(Object.keys(v).length===1&&"int" in v)return v.int;
 }
 return value;
}
function natural(value:unknown,label:string,allowZero=true):bigint{
 const unwrapped=dataField(value);
 let number:string;
 if(typeof unwrapped==="bigint")number=unwrapped.toString();
 else if(typeof unwrapped==="number"&&Number.isSafeInteger(unwrapped))number=String(unwrapped);
 else if(typeof unwrapped==="string")number=unwrapped;
 else throw Error("Invalid "+label);
 if(!INT.test(number))throw Error("Invalid "+label);
 const parsed=BigInt(number);
 if(!allowZero&&parsed===0n)throw Error("Missing "+label);
 return parsed;
}
function bytes(value:unknown,label:string):string{
 const raw=dataField(value);
 if(typeof raw!=="string"||raw.length%2!==0||!/^[0-9a-f]*$/i.test(raw))
  throw Error("Invalid "+label+" bytes");
 return raw.toLowerCase();
}
function market(value:unknown):string{
 const hex=bytes(value,"instrument");
 if(hex.length<6||hex.length>100)throw Error("Invalid instrument identifier");
 const decoded=Buffer.from(hex,"hex").toString("utf8");
 if(!/^[A-Z0-9][A-Z0-9_/-]{2,30}$/.test(decoded))
  throw Error("Unsupported instrument identifier");
 return decoded;
}
function fieldList(input:unknown,count:number):unknown[]{
 const datum=record(input);
 const constructorIndex=Object.hasOwn(datum,"constructor")?datum["constructor" as string]:datum.alternative;
 if(constructorIndex!==0)throw Error("Unexpected Aiken datum constructor");
 if(!Array.isArray(datum.fields)||datum.fields.length!==count)throw Error("Unexpected Aiken datum fields");
 return datum.fields;
}
function backedAssets(input:unknown,stableUnit:string){
 if(!Array.isArray(input)||input.length<1||input.length>100)throw Error("Invalid Preprod script output assets");
 const seen=new Set<string>();let lovelace:bigint|null=null,stable=0n;
 for(const row of input){
  const a=record(row),unit=a.unit,quantity=a.quantity;
  if(typeof unit!=="string"||(unit!=="lovelace"&&!UNIT.test(unit))||
    seen.has(unit.toLowerCase()))throw Error("Duplicate or invalid Cardano unit");
  seen.add(unit.toLowerCase());
  const number=natural(quantity,"output quantity");
  if(unit==="lovelace")lovelace=number;
  if(unit.toLowerCase()===stableUnit.toLowerCase())stable=number;
 }
 if(lovelace===null||lovelace<1_000_000n)throw Error("Script output lacks minimum ADA");
 return {lovelace,stable};
}
export function parseCorePosition(input:{
 kind:CorePositionKind;output:unknown;decodedDatum:unknown;
 stableUnit:string;ownerKeyHash:string
}):ObservedPosition|null{
 if(!["perpetual","options"].includes(input.kind)||!UNIT.test(input.stableUnit)||
    !HEX56.test(input.ownerKeyHash))throw Error("Invalid verified position query");
 const utxo=record(input.output);
 if(typeof utxo.tx_hash!=="string"||!HEX64.test(utxo.tx_hash)||
    !Number.isSafeInteger(utxo.output_index)||Number(utxo.output_index)<0)
  throw Error("Invalid confirmed position UTxO");
 const {lovelace,stable}=backedAssets(utxo.amount,input.stableUnit);
 const fields=fieldList(input.decodedDatum,input.kind==="perpetual"?7:11);
 const owner=bytes(fields[0],"owner key hash");
 if(!HEX56.test(owner))throw Error("Malformed position owner key hash");
 if(owner!==input.ownerKeyHash.toLowerCase())return null;
 const ticker=market(fields[1]);
 const nonce=natural(fields[input.kind==="perpetual"?6:10],"nonce");
 let notionalOrContracts:bigint,entryOrStrike:bigint,sideOrKind:ObservedPosition["sideOrKind"];
 let settlement:ObservedPosition["settlement"]="OPEN",expiryMs:string|null=null;
 let declaredCollateral:bigint;
 if(input.kind==="perpetual"){
  const side=dataField(fields[2]);
  if(side!==1&&side!==-1&&side!=="1"&&side!=="-1"&&side!==1n&&side!==-1n)
   throw Error("Invalid perpetual side");
  sideOrKind=String(side)==="1"?"LONG":"SHORT";
  notionalOrContracts=natural(fields[3],"perpetual notional",false);
  declaredCollateral=natural(fields[4],"perpetual collateral",false);
  entryOrStrike=natural(fields[5],"perpetual entry price",false);
 }else{
  const kind=dataField(fields[2]);
  if(!["0","1"].includes(String(kind)))throw Error("Invalid option type");
  sideOrKind=String(kind)==="0"?"CALL":"PUT";
  entryOrStrike=natural(fields[3],"option strike",false);
  const expiry=natural(fields[4],"option expiry",false);
  if(expiry>BigInt(Number.MAX_SAFE_INTEGER))throw Error("Invalid option expiry");
  expiryMs=expiry.toString();
  notionalOrContracts=natural(fields[5],"option contracts",false);
  declaredCollateral=natural(fields[6],"option collateral");
  const settled=natural(fields[7],"option settlement state");
  if(settled>1n)throw Error("Invalid option settlement state");
  const settlementPrice=natural(fields[8],"option settlement price");
  const payout=natural(fields[9],"option settlement payout");
  if(settled===0n&&(settlementPrice!==0n||payout!==0n)||
     settled===1n&&(settlementPrice===0n||payout>declaredCollateral))
   throw Error("Inconsistent option settlement fields");
  settlement=settled===1n?"SETTLED":"OPEN";
 }
 if(stable!==declaredCollateral)throw Error("Position collateral does not match unspent script tokens");
 return {kind:input.kind,
  reference:utxo.tx_hash.toLowerCase()+"#"+utxo.output_index,
  txHash:utxo.tx_hash.toLowerCase(),ownerKeyHash:owner,
  market:ticker,lockedLovelace:lovelace.toString(),
  lockedStableUnits:stable.toString(),
  notionalOrContracts:notionalOrContracts.toString(),
  nonce:nonce.toString(),entryOrStrike:entryOrStrike.toString(),
  sideOrKind,settlement,expiryMs};
}

/** Strictly decode a position at a chain-verified script address without
 * relying on self-reported wallet claims. Never trust this without verifying
 * its reference script and the complete unspent UTxO snapshot first. */
export function parseAnyCorePosition(input:{
 kind:CorePositionKind;output:unknown;decodedDatum:unknown;stableUnit:string
}):ObservedPosition{
 const fields=fieldList(input.decodedDatum,input.kind==="perpetual"?7:11);
 const ownerKeyHash=bytes(fields[0],"owner key hash");
 if(!HEX56.test(ownerKeyHash))throw Error("Malformed position owner key hash");
 const parsed=parseCorePosition({...input,ownerKeyHash});
 if(!parsed)throw Error("Position owner binding mismatch");
 return parsed;
}

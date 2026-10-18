import {createHash,randomUUID,timingSafeEqual} from "node:crypto";
export const SELF_TEST_LOVELACE=2_000_000n;
export const SELF_TEST_SIGNING_WINDOW_MS=15*60*1000;
export const SELF_TEST_CHAIN_TTL_SLOTS=30*60;
const ADDRESS=/^addr_test1[a-z0-9]{35,120}$/;
const HEX64=/^[0-9a-f]{64}$/i;
export type BuilderRequest={
 action:string;network:string;account:string;intentHash:string;payload:unknown
};
export function intentForSelfTest(account:string){
 return createHash("sha256").update("symbiotic-builder-v1|preprod|WALLET_SELF_TEST|"+account+"|"+SELF_TEST_LOVELACE).digest("hex");
}
export function safeEqual(actual:string|undefined,expected:string){
 const a=Buffer.from(actual??""),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function validateSelfTest(input:BuilderRequest){
 if(input.network!=="preprod")throw Error("Only Cardano Preprod supported");
 if(input.action!=="WALLET_SELF_TEST")throw Error("Contract execution disabled until independent Preprod lifecycle proof");
 if(typeof input.account!=="string"||!ADDRESS.test(input.account))throw Error("Expected a Preprod wallet address");
 if(!input.payload||typeof input.payload!=="object"||Array.isArray(input.payload)||Object.keys(input.payload).length)
  throw Error("Test only accepts an empty payload; no custom outputs");
 if(typeof input.intentHash!=="string"||!HEX64.test(input.intentHash)||input.intentHash.toLowerCase()!==intentForSelfTest(input.account))
  throw Error("Wallet self-test intent mismatch");
 return input;
}
export type Session={unsignedTxCborHex:string;txBodyHash:string;expiresAt:number;consumed:boolean};
export class Sessions {
 readonly values=new Map<string,Session>();
 constructor(readonly limit=512){}
 store(s:Session,now=Date.now()){
  this.prune(now);
  if(this.values.size>=this.limit)throw Error("Builder session capacity");
  const id=randomUUID();
  this.values.set(id,s);
  return id;
 }
 get(id:string,cbor:string,now=Date.now()){
  const s=this.values.get(id);
  if(!s||s.consumed||now>=s.expiresAt)throw Error("Unknown, expired or already used builder request");
  if(s.unsignedTxCborHex!==cbor)throw Error("Prepared transaction CBOR changed");
  return s;
 }
 consume(id:string){const s=this.values.get(id);if(s)s.consumed=true;}
 prune(now=Date.now()){for(const [id,s] of this.values)if(now>=s.expiresAt)this.values.delete(id);}
}
export function configured(env:NodeJS.ProcessEnv=process.env){
 const key=env.BLOCKFROST_PROJECT_ID?.trim()??"";
 const token=env.BUILDER_AUTH_TOKEN?.trim()??"";
 if(!/^preprod[a-z0-9]{10,}$/i.test(key))throw Error("BLOCKFROST_PROJECT_ID must be a Preprod project key");
 if(token.length<32)throw Error("BUILDER_AUTH_TOKEN must contain 32+ characters");
 if(env.CARDANO_NETWORK&&env.CARDANO_NETWORK!=="preprod")throw Error("Only Cardano Preprod allowed");
 if(env.CARDANO_TESTNET_MAGIC&&env.CARDANO_TESTNET_MAGIC!=="1")throw Error("Preprod network magic must be 1");
 const host=env.BUILDER_BIND_HOST??"127.0.0.1";
 if(host!=="127.0.0.1"&&host!=="::1")throw Error("Bind loopback only; reverse proxy over TLS for remote access");
 const port=Number(env.BUILDER_PORT??"8788");
 if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error("Invalid port");
 return {key,token,host,port};
}

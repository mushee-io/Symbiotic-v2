import {createHash, createPublicKey, verify} from "node:crypto";
import {isIP} from "node:net";
import {RWA_MARKETS, marketSession} from "./rwa-market";

export type EquityFeedConfig={id:string;url:string;publicKeyPem:string};
export type SignedEquityObservation={ticker:string;priceMicros:string;asOf:string;roundId:string;signature:string};
export type ValidatedEquityRound={
 ticker:string;priceMicros:string;asOf:string;sourceCount:number;
 sources:string[];maxDeviationBps:number;roundHash:string;
 session:"REGULAR";operationalForResearchOnly:true
};
const MAX_AGE_MS=30_000;
const MAX_DEVIATION_BPS=50;
function micros(value:string):bigint{
 if(!/^[1-9][0-9]{0,17}$/.test(value))throw Error("Invalid micro-dollar price");
 return BigInt(value);
}
export function equityFeedConfigFromEnv(value:string|undefined):EquityFeedConfig[]{
 if(!value)throw Error("Authenticated equity price feeds not configured");
 const feeds:unknown=JSON.parse(value);
 if(!Array.isArray(feeds)||feeds.length<2||feeds.length>5)throw Error("Require 2–5 independent signed equity feeds");
 const result=feeds.map((f):EquityFeedConfig=>{
  if(!f||typeof f!=="object")throw Error("Invalid equity feed configuration");
  const x=f as Record<string,unknown>;
  if(typeof x.id!=="string"||!/^[a-z0-9_-]{3,32}$/i.test(x.id))throw Error("Invalid equity source ID");
  if(typeof x.url!=="string"||typeof x.publicKeyPem!=="string")throw Error("Incomplete equity feed");
  const url=new URL(x.url);
  if(url.protocol!=="https:"||url.username||url.password||url.hash)throw Error("Equity feed requires HTTPS without credentials in the URL");
  if(!url.pathname.includes("{ticker}")&&!url.search.includes("%7Bticker%7D")&&!x.url.includes("{ticker}"))
   throw Error("Equity feed URL must include {ticker}");
  if(isIP(url.hostname.replace(/^\[|\]$/g,""))!==0 || /(^localhost$|\.localhost$|\.local$|\.internal$|\.home$)/i.test(url.hostname))
   throw Error("Private equity feed hosts are not allowed");
  const key=createPublicKey(x.publicKeyPem);
  if(key.asymmetricKeyType!=="ed25519")throw Error("Equity signer must use Ed25519");
  return {id:x.id,url:x.url,publicKeyPem:x.publicKeyPem};
 });
 if(new Set(result.map(f=>f.id)).size!==result.length)throw Error("Duplicate equity source IDs");
 if(new Set(result.map(f=>new URL(f.url).origin)).size!==result.length)throw Error("Equity feeds must use independent origins");
 if(new Set(result.map(f=>createPublicKey(f.publicKeyPem).export({type:"spki",format:"der"}).toString("hex"))).size!==result.length)
  throw Error("Equity feeds must use independent signing keys");
 return result;
}
export function signedPayload(o:Pick<SignedEquityObservation,"ticker"|"priceMicros"|"asOf"|"roundId">){
 return ["SYMBIOTIC-EQUITY-V1",o.ticker,o.priceMicros,o.asOf,o.roundId].join("|");
}
export function verifyEquityObservation(o:SignedEquityObservation,feed:EquityFeedConfig,ticker:string,nowMs=Date.now()){
 if(o.ticker!==ticker)throw Error("Equity symbol mismatch");
 const price=micros(o.priceMicros);
 const at=Date.parse(o.asOf);
 if(!Number.isFinite(at)||at>nowMs+2000||nowMs-at>MAX_AGE_MS)throw Error("Equity observation stale or future-dated");
 if(!/^[a-zA-Z0-9:_-]{8,128}$/.test(o.roundId))throw Error("Invalid equity oracle round ID");
 if(!/^[A-Za-z0-9+/]{40,}={0,2}$/.test(o.signature))throw Error("Invalid Ed25519 signature encoding");
 if(!verify(null,Buffer.from(signedPayload(o)),feed.publicKeyPem,Buffer.from(o.signature,"base64")))
  throw Error("Untrusted equity oracle signature");
 return {price,at};
}
export async function verifiedEquityRound(input:{
 ticker:string;feeds:EquityFeedConfig[];at?:Date;fetchImpl?:typeof fetch
}):Promise<ValidatedEquityRound>{
 const {ticker,feeds}=input;const at=input.at??new Date();
 const market=RWA_MARKETS.find(x=>x.ticker===ticker);
 if(!market||market.category!=="STOCK")throw Error("Stock symbol unsupported");
 const session=marketSession(at);
 if(!session.regularOpen)throw Error("Equity reference market is closed or calendar is unverified");
 // A quote is NOT a trading permission: even perfect price feeds cannot turn on settlement.
 const req=await Promise.allSettled(feeds.map(async f=>{
  const url=f.url.replace("{ticker}",encodeURIComponent(ticker));
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),4500);
  try{
   const r=await (input.fetchImpl??fetch)(url,{headers:{Accept:"application/json"},cache:"no-store",redirect:"error",signal:controller.signal});
   if(!r.ok)throw Error("Equity feed HTTP "+r.status);
   const body=await r.json() as SignedEquityObservation;
   const v=verifyEquityObservation(body,f,ticker,at.getTime());
   return {source:f.id,price:v.price,asOf:body.asOf,roundId:body.roundId};
  }finally{clearTimeout(timeout);}
 }));
 const good=req.flatMap((x)=>x.status==="fulfilled"?[x.value]:[]);
 if(good.length<2)throw Error("Insufficient authenticated equity oracle quorum");
 const prices=good.map(x=>x.price).sort((a,b)=>a<b?-1:a>b?1:0);
 const mid=prices.length%2?prices[Math.floor(prices.length/2)]: (prices[prices.length/2-1]+prices[prices.length/2])/2n;
 if(mid<=0n)throw Error("Invalid median equity price");
 const maxDeviationBps=Number(good.reduce((max,x)=>{
  const d=(x.price>mid?x.price-mid:mid-x.price)*10000n/mid;
  return d>max?d:max;
 },0n));
 if(maxDeviationBps>MAX_DEVIATION_BPS)throw Error("Equity oracle source disagreement");
 const canonical=good.map(x=>x.source+":"+x.price+":"+x.roundId+":"+x.asOf).sort().join("|");
 return {ticker,priceMicros:mid.toString(),asOf:at.toISOString(),sourceCount:good.length,
  sources:good.map(x=>x.source).sort(),maxDeviationBps,
  roundHash:createHash("sha256").update("symbiotic-preprod|"+ticker+"|"+canonical).digest("hex"),
  session:"REGULAR",operationalForResearchOnly:true};
}

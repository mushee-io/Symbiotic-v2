/** Validate a multi-source BTC spot reference for display ONLY.
 * It is NOT a signed Cardano oracle round and must never authorize settlement.
 */
export type BtcReferenceRound={
 market:"BTC-USD";price:number;sourceCount:number;
 maxDeviationBps:number;roundId:string;generatedAt:string;
 observations:Array<{source:string;price:number}>;
};
export function parseBtcReferenceRound(data:unknown,nowMs=Date.now()):BtcReferenceRound{
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Malformed market reference");
 const x=data as Partial<BtcReferenceRound>;
 if(x.market!=="BTC-USD"||!Number.isFinite(x.price)||Number(x.price)<=0||
    !Number.isInteger(x.sourceCount)||Number(x.sourceCount)<2||Number(x.sourceCount)>3||
    !Number.isFinite(x.maxDeviationBps)||Number(x.maxDeviationBps)<0||Number(x.maxDeviationBps)>75||
    typeof x.roundId!=="string"||!/^[a-f0-9]{64}$/i.test(x.roundId))
  throw Error("BTC reference quorum invalid");
 if(typeof x.generatedAt!=="string")throw Error("BTC reference missing timestamp");
 const seenAt=Date.parse(x.generatedAt);
 if(!Number.isFinite(seenAt)||seenAt>nowMs+5_000||nowMs-seenAt>45_000)
  throw Error("BTC reference is stale");
 if(!Array.isArray(x.observations)||x.observations.length!==x.sourceCount)
  throw Error("BTC reference observations do not match quorum");
 const knownSources=new Set(["coinbase","kraken","gemini"]);
 const observed=new Set<string>();
 for(const observation of x.observations){
  if(!observation||!knownSources.has(observation.source)||observed.has(observation.source)||
     !Number.isFinite(observation.price)||observation.price<=0)
   throw Error("BTC reference contains invalid or duplicate source");
  observed.add(observation.source);
  if(Math.abs(observation.price-Number(x.price))/Number(x.price)*10_000>75)
   throw Error("BTC reference observations disagree");
 }
 return x as BtcReferenceRound;
}

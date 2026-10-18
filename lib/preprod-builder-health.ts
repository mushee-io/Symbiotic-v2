export type BuilderReady={
 service:string;network:string;networkMagic:number;
 actions:unknown;contractTransactionsEnabled:unknown;
 ready?:unknown;tipTime?:unknown
};
export function validatedBuilderReadiness(response:BuilderReady,nowMs=Date.now()){
 if(response.service!=="symbiotic-preprod-builder"||response.network!=="preprod"||
    response.networkMagic!==1||response.contractTransactionsEnabled!==false||
    response.ready!==true||!Array.isArray(response.actions)||
    response.actions.length!==1||response.actions[0]!=="WALLET_SELF_TEST"){
   throw Error("Transaction builder capabilities did not match approved Preprod-only version");
 }
 const tip=Date.parse(String(response.tipTime));
 if(!Number.isFinite(tip)||Math.abs(nowMs-tip)>600000)throw Error("Preprod Blockfrost tip was stale");
 return {ready:true as const,network:"preprod" as const,networkMagic:1 as const,
  supportedActions:["WALLET_SELF_TEST"] as const,contractTransactionsEnabled:false as const,
  tipTime:new Date(tip).toISOString()};
}

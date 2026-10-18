/** Preprod-only binding for every browser-facing transaction-builder route.
 * Never allow an unset project network to silently imply Mainnet or Preview. */
export function assertPreprodBuilderRequest(env:Record<string,string|undefined>,requestedNetwork:string){
 if(requestedNetwork!=="preprod")throw Error("Only Cardano Preprod is supported for Symbiotic V2 execution");
 if(env.SYMBIOTIC_CARDANO_NETWORK && env.SYMBIOTIC_CARDANO_NETWORK!=="preprod")
  throw Error("Configured execution network is not Cardano Preprod");
 if(env.SYMBIOTIC_ALLOW_MAINNET==="true"||env.SYMBIOTIC_ALLOW_MAINNET==="1")
  throw Error("Mainnet override must not be enabled on Preprod builder routes");
 return {network:"preprod" as const};
}

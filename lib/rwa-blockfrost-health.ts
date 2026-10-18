/**
 * Read-only Blockfrost Preprod smoke-test of a known publicly minted sUSD asset.
 * This does not authorize RWA trading, loans, protocol release or an issuer certificate.
 * Never return credentials, headers, or raw provider errors to public callers.
 */
import {PREPROD_LIVE} from "./preprod-live";

const EXPECTED_MINT_TX="058fc48598399499694045ae9337cc5d51bb6d28d722f9a82c5a01699603d45c";
export const SMOKE_TEST_ASSET_UNIT=PREPROD_LIVE.sUsd.unit;

export function verifyPreprodSmokeAsset(asset:Record<string,unknown>){
 const unit=typeof asset.asset==="string"?asset.asset.toLowerCase():"";
 const quantity=typeof asset.quantity==="string"?asset.quantity:"";
 const firstMint=typeof asset.initial_mint_tx_hash==="string"?asset.initial_mint_tx_hash.toLowerCase():"";
 if(unit!==SMOKE_TEST_ASSET_UNIT ||
    firstMint!==EXPECTED_MINT_TX ||
    !/^[1-9][0-9]*$/.test(quantity)){
   return {verified:false as const,reason:"Known Preprod sUSD mint identity mismatch"};
 }
 return {
  verified:true as const,unit:SMOKE_TEST_ASSET_UNIT,
  mintTxHash:EXPECTED_MINT_TX,
  quantityBaseUnits:quantity
 };
}

/** No configuration switch can promote unverified Preprod script custody
 * or quote-only BTC pricing into an executable derivatives market.
 * An explicit tested protocol upgrade is required after stable chain proof.
 */
export function preprodLiveTradingReadiness(){
 return {
  network:"preprod" as const,market:"BTC-USD" as const,
  executionEnabled:false as const,
  perpetualValidatorLifecycleVerified:false as const,
  collateralWithdrawalVerified:false as const,
  onchainOracleBound:false as const,
  reason:"Live BTC-USD perpetual trading is blocked until validator deployment, safe collateral withdrawal, oracle binding and funded open/close/liquidation are independently verified on Cardano Preprod.",
  next:"Run and verify the five-validator deployment, then execute funded contract lifecycle tests. Wallet self-test receipts do not authorize perp execution."
 };
}

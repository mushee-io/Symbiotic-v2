/**
 * Offline risk-scenario calculators for Folder. NOT protocol parameter decisions,
 * on-chain claims, approved issuer collateral or executable borrowing.
 * Money, debt, prices and share quantities use integer micro-units.
 */
export const MICRO=1_000_000n;
export const BASIS=10_000n;
const YEAR=365n*24n*60n*60n;
export function units(input:string,label:string,allowZero=false):bigint{
 if(typeof input!=="string"||!/^(0|[1-9][0-9]{0,23})$/.test(input))throw Error("Invalid "+label+" micro-unit amount");
 const value=BigInt(input);
 if(!allowZero&&value===0n)throw Error(label+" must be positive");
 return value;
}
export function basisPoints(input:number,label:string,min=0,max=10_000):bigint{
 if(!Number.isSafeInteger(input)||input<min||input>max)throw Error("Invalid "+label+" basis points");
 return BigInt(input);
}
function ceilDiv(n:bigint,d:bigint){if(d<=0n)throw Error("Invalid denominator");return (n+d-1n)/d}
function boundedSeconds(seconds:number,max=YEAR*5n):bigint{
 if(!Number.isSafeInteger(seconds)||seconds<0||BigInt(seconds)>max)throw Error("Invalid accrual period");
 return BigInt(seconds);
}
export type LongbowScenario={
 collateralSharesMicros:string;priceMicros:string;principalMicros:string;
 aprBps:number;initialLtvBps:number;liquidationLtvBps:number;accruedSeconds:number;
 oracleAgeSeconds:number;collateralIsVerifiedOnChain:boolean;
};
export function longbowScenario(s:LongbowScenario){
 const shares=units(s.collateralSharesMicros,"collateral shares");
 const price=units(s.priceMicros,"collateral price");
 const principal=units(s.principalMicros,"principal",true);
 const apr=basisPoints(s.aprBps,"interest APR",0,10_000);
 const initial=basisPoints(s.initialLtvBps,"initial LTV",1,9_000);
 const liquidation=basisPoints(s.liquidationLtvBps,"liquidation LTV",1,9_500);
 if(liquidation<=initial)throw Error("Liquidation LTV must exceed initial LTV");
 const seconds=boundedSeconds(s.accruedSeconds);
 if(!Number.isSafeInteger(s.oracleAgeSeconds)||s.oracleAgeSeconds<0)
  throw Error("Invalid oracle age");
 const fresh=s.oracleAgeSeconds<=30;
 const collateralValueMicros=shares*price/MICRO;
 if(collateralValueMicros===0n)throw Error("Collateral rounds down to zero");
 const accruedInterestMicros=principal===0n||seconds===0n?0n:ceilDiv(principal*apr*seconds,BASIS*YEAR);
 const totalDebtMicros=principal+accruedInterestMicros;
 const maxInitialBorrowMicros=collateralValueMicros*initial/BASIS;
 const remainingBorrowCapacityMicros=maxInitialBorrowMicros>totalDebtMicros?maxInitialBorrowMicros-totalDebtMicros:0n;
 const healthFactorBps=totalDebtMicros===0n?null:collateralValueMicros*liquidation/totalDebtMicros;
 const liquidationAtPriceMicros=totalDebtMicros===0n?null:ceilDiv(totalDebtMicros*BASIS*MICRO,shares*liquidation);
 const liquidatableByReference=totalDebtMicros>0n&&collateralValueMicros*liquidation<totalDebtMicros*BASIS;
 return {
  scenarioOnly:true as const,network:"preprod" as const,
  collateralValueMicros:collateralValueMicros.toString(),
  accruedInterestMicros:accruedInterestMicros.toString(),
  totalDebtMicros:totalDebtMicros.toString(),
  maxInitialBorrowMicros:maxInitialBorrowMicros.toString(),
  remainingBorrowCapacityMicros:remainingBorrowCapacityMicros.toString(),
  healthFactorBps:healthFactorBps?.toString()??null,
  liquidationAtPriceMicros:liquidationAtPriceMicros?.toString()??null,
  liquidatableByReference,
  decision:"NOT_AUTHORISED" as const,
  checks:{oracleFresh:fresh,collateralVerified:s.collateralIsVerifiedOnChain},
  warnings:[
   "No real issuer-backed collateral or loan contract has been verified.",
   ...(!fresh?["Price reference stale: calculations cannot authorise new loans."]:[]),
   ...(!s.collateralIsVerifiedOnChain?["Collateral has no validated issuance/custody evidence."]:[])
  ]
 };
}
export type TwofoldScenario={
 cashMicros:string;loansOutstandingMicros:string;totalSharesMicros:string;
 withdrawSharesMicros:string;maxUtilisationBps:number;minimumReserveBps:number;
};
export function twofoldScenario(s:TwofoldScenario){
 const cash=units(s.cashMicros,"available cash",true);
 const loans=units(s.loansOutstandingMicros,"outstanding loans",true);
 const totalShares=units(s.totalSharesMicros,"total pool shares");
 const withdrawShares=units(s.withdrawSharesMicros,"requested shares",true);
 const util=basisPoints(s.maxUtilisationBps,"maximum utilisation",1,9_500);
 const reserve=basisPoints(s.minimumReserveBps,"minimum reserve",1,9_500);
 if(util+reserve>BASIS)throw Error("Utilisation cap and minimum reserve cannot exceed 100%");
 if(withdrawShares>totalShares)throw Error("Withdrawal cannot exceed pool share supply");
 const totalAssetsMicros=cash+loans;
 if(totalAssetsMicros===0n)throw Error("Pool has no assets");
 const minimumReserveMicros=ceilDiv(totalAssetsMicros*reserve,BASIS);
 const availableToLendByReserve=cash>minimumReserveMicros?cash-minimumReserveMicros:0n;
 const maxLoans=totalAssetsMicros*util/BASIS;
 const availableToLendByUtil=maxLoans>loans?maxLoans-loans:0n;
 const requestedValueMicros=withdrawShares*totalAssetsMicros/totalShares;
 const freeCash=cash>minimumReserveMicros?cash-minimumReserveMicros:0n;
 const immediatelyRedeemableMicros=requestedValueMicros<=freeCash?requestedValueMicros:freeCash;
 // Withdrawals have priority over new lending. Do not count promised
 // redemption cash as capital that can be lent out a second time.
 const afterWithdrawCash=freeCash>immediatelyRedeemableMicros?freeCash-immediatelyRedeemableMicros:0n;
 const availableAfterRequests=availableToLendByReserve<afterWithdrawCash?availableToLendByReserve:afterWithdrawCash;
 const lendableMicros=availableAfterRequests<availableToLendByUtil?availableAfterRequests:availableToLendByUtil;
 return {
  scenarioOnly:true as const,network:"preprod" as const,decision:"NOT_AUTHORISED" as const,
  totalAssetsMicros:totalAssetsMicros.toString(),
  minimumReserveMicros:minimumReserveMicros.toString(),
  lendableMicros:lendableMicros.toString(),
  requestedWithdrawalMicros:requestedValueMicros.toString(),
  immediatelyRedeemableMicros:immediatelyRedeemableMicros.toString(),
  queuedWithdrawalMicros:(requestedValueMicros-immediatelyRedeemableMicros).toString(),
  utilisationBps:(loans*BASIS/totalAssetsMicros).toString(),
  warnings:["Pool figures are a test scenario, not actual assets or a live liquidity vault.",
    ...(requestedValueMicros>immediatelyRedeemableMicros?["Cash is insufficient for immediate redemption; withdrawals would be queued."]:[])]
 };
}

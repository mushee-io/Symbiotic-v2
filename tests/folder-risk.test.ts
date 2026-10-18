import test from "node:test";
import assert from "node:assert/strict";
import {longbowScenario,twofoldScenario} from "../lib/folder-risk";
const loan={
 collateralSharesMicros:"10000000",priceMicros:"200000000",principalMicros:"800000000",
 aprBps:500,initialLtvBps:5000,liquidationLtvBps:6500,
 accruedSeconds:0,oracleAgeSeconds:10,collateralIsVerifiedOnChain:false
};
test("Longbow quotes integer collateral and liquidation thresholds without authorizing loans",()=>{
 const r=longbowScenario(loan);
 assert.equal(r.collateralValueMicros,"2000000000");
 assert.equal(r.maxInitialBorrowMicros,"1000000000");
 assert.equal(r.totalDebtMicros,"800000000");
 assert.equal(r.healthFactorBps,"16250");
 assert.equal(r.remainingBorrowCapacityMicros,"200000000");
 assert.equal(r.decision,"NOT_AUTHORISED");
});
test("Longbow debt accrues rounded-up interest and can become liquidatable",()=>{
 const r=longbowScenario({...loan,principalMicros:"1500000000",accruedSeconds:31536000});
 assert.equal(r.accruedInterestMicros,"75000000");
 assert.equal(r.liquidatableByReference,true);
 assert.equal(r.remainingBorrowCapacityMicros,"0");
});
test("Longbow refuses pathological risk parameters, fake freshness and invalid assets",()=>{
 assert.throws(()=>longbowScenario({...loan,liquidationLtvBps:4000}),/exceed/);
 assert.throws(()=>longbowScenario({...loan,priceMicros:"0"}),/positive/);
 assert.throws(()=>longbowScenario({...loan,collateralSharesMicros:"1.234"}),/Invalid/);
 assert.throws(()=>longbowScenario({...loan,accruedSeconds:31536000*10}),/accrual period/);
 const stale=longbowScenario({...loan,oracleAgeSeconds:180});
 assert.equal(stale.checks.oracleFresh,false);assert.equal(stale.decision,"NOT_AUTHORISED");
});
const pool={
 cashMicros:"600000000",loansOutstandingMicros:"400000000",totalSharesMicros:"1000000000",
 withdrawSharesMicros:"200000000",maxUtilisationBps:8000,minimumReserveBps:1000
};
test("Twofold respects utilisation and reserve limits in integer micro-units",()=>{
 const r=twofoldScenario(pool);
 assert.equal(r.totalAssetsMicros,"1000000000");
 assert.equal(r.minimumReserveMicros,"100000000");
 assert.equal(r.lendableMicros,"400000000");
 assert.equal(r.requestedWithdrawalMicros,"200000000");
 assert.equal(r.immediatelyRedeemableMicros,"200000000");
 assert.equal(r.decision,"NOT_AUTHORISED");
});
test("Twofold queues illiquid withdrawals instead of inventing liquid capital",()=>{
 const r=twofoldScenario({...pool,cashMicros:"50000000",loansOutstandingMicros:"950000000",withdrawSharesMicros:"500000000"});
 assert.equal(r.lendableMicros,"0");assert.equal(r.immediatelyRedeemableMicros,"0");
 assert.equal(r.queuedWithdrawalMicros,"500000000");
});
test("Twofold rejects overdrafts and nonsensical pool caps",()=>{
 assert.throws(()=>twofoldScenario({...pool,withdrawSharesMicros:"1000000001"}),/exceed/);
 assert.throws(()=>twofoldScenario({...pool,maxUtilisationBps:9600}),/Invalid/);
 assert.throws(()=>twofoldScenario({...pool,maxUtilisationBps:8000,minimumReserveBps:3000}),/100%/);
 assert.throws(()=>twofoldScenario({...pool,cashMicros:"0",loansOutstandingMicros:"0"}),/no assets/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {preprodLiveTradingReadiness} from "../lib/preprod-live-trading-gate";
test("a verified wallet self-send cannot imply deployed perpetual trade readiness",()=>{
 const gate=preprodLiveTradingReadiness();
 assert.equal(gate.network,"preprod");
 assert.equal(gate.executionEnabled,false);
 assert.equal(gate.perpetualValidatorLifecycleVerified,false);
 assert.equal(gate.collateralWithdrawalVerified,false);
 assert.equal(gate.onchainOracleBound,false);
 assert.match(gate.next,/five-validator deployment/);
});

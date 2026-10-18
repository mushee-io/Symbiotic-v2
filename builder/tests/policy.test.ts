import test from "node:test";
import assert from "node:assert/strict";
import {configured,intentForSelfTest,safeEqual,Sessions,validateSelfTest} from "../src/policy.js";
const address="addr_test1"+"a".repeat(53);
const correct={network:"preprod",account:address,action:"WALLET_SELF_TEST",
 intentHash:intentForSelfTest(address),payload:{}};
test("wallet self-test only sends returned value to correct network owner",()=>{
 assert.equal(validateSelfTest(correct).action,"WALLET_SELF_TEST");
 assert.throws(()=>validateSelfTest({...correct,network:"mainnet"}),/Preprod/);
 assert.throws(()=>validateSelfTest({...correct,action:"OPEN_PERP"}),/disabled/);
 assert.throws(()=>validateSelfTest({...correct,payload:{to:"addr_test1attacker"}}),/custom outputs/);
 assert.throws(()=>validateSelfTest({...correct,intentHash:"a".repeat(64)}),/intent mismatch/);
 assert.throws(()=>validateSelfTest({...correct,account:"addr1mainnet"}),/Preprod wallet/);
});
test("authenticated builder binds loopback, Preprod, and a strong token",()=>{
 const sample={BLOCKFROST_PROJECT_ID:"preprod"+"a".repeat(32),BUILDER_AUTH_TOKEN:"c".repeat(64)};
 assert.equal(configured(sample).port,8788);
 assert.throws(()=>configured({...sample,BUILDER_BIND_HOST:"0.0.0.0"}),/loopback/);
 assert.throws(()=>configured({...sample,CARDANO_NETWORK:"mainnet"}),/Preprod/);
 assert.throws(()=>configured({...sample,CARDANO_TESTNET_MAGIC:"2"}),/magic/);
 assert.throws(()=>configured({...sample,BUILDER_AUTH_TOKEN:"secret"}),/32/);
 assert.ok(safeEqual("c".repeat(64),"c".repeat(64)));
 assert.ok(!safeEqual("bad","c".repeat(64)));
});
test("builder sessions are one-time, bounded and validate canonical transaction identity",()=>{
 const r=new Sessions(1),now=1000;
 const s={unsignedTxCborHex:"a100",txBodyHash:"b".repeat(64),expiresAt:now+1000,consumed:false};
 const id=r.store(s,now); assert.equal(r.get(id,"a100",now),s);
 assert.throws(()=>r.get(id,"a102",now),/changed/);
 assert.throws(()=>r.store(s,now),/capacity/);
 r.consume(id);
 assert.throws(()=>r.get(id,"a100",now),/already used/);
 assert.throws(()=>r.get(id,"a100",now+1001),/expired/);
});

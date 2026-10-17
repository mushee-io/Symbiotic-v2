import assert from "node:assert/strict";
import test from "node:test";
import {marketSession,RWA_MARKETS,RWA_MARKET_OPERATIONAL} from "../lib/rwa-market";
test("RWA market is never advertised as executable without contracts",()=>{assert.equal(RWA_MARKET_OPERATIONAL,false);assert.ok(RWA_MARKETS.every(m=>m.unit===null&&m.venue==="preprod"));});
test("US Eastern session respects daylight saving and closed weekends",()=>{
const winter=marketSession(new Date("2026-01-12T15:00:00Z"));
const summer=marketSession(new Date("2026-07-13T14:00:00Z"));
const weekend=marketSession(new Date("2026-10-18T14:00:00Z"));
assert.equal(winter.session,"REGULAR");assert.equal(summer.session,"REGULAR");assert.equal(weekend.session,"WEEKEND");assert.equal(weekend.regularOpen,false);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  activityByDay, assertPreprodPaymentAddress, formatAda, parseQuantity,
  rankByObservedTransactions, summariseAmounts
} from "../lib/portfolio-analytics";

test("portfolio amounts use exact lovelace quantities rather than floats", () => {
  const summary = summariseAmounts([{ unit: "lovelace", quantity: "9007199254740993123456" }, { unit: "fake", quantity: "3" }]);
  assert.equal(summary.adaLovelace, "9007199254740993123456");
  assert.equal(summary.nativeAssetTypes, 1);
  assert.equal(formatAda("123456789"), "123.456");
  assert.throws(() => parseQuantity("-1"));
  assert.throws(() => parseQuantity("12.5"));
});

test("user-selected leaderboard uses real transaction counts, not fake PnL", () => {
  const addr = "addr_test1" + "q".repeat(70);
  const ranked = rankByObservedTransactions([
    { address: addr + "a", lovelace: "999999999", txCount: 10 },
    { address: addr + "b", lovelace: "1", txCount: 11 },
  ]);
  assert.equal(ranked[0].txCount, 11);
});

test("UTC activity chart samples last seven days and excludes future records", () => {
  const now = Date.parse("2026-10-17T16:00:00Z") / 1000;
  const chart = activityByDay([
    { tx_hash: "a", block_time: Date.parse("2026-10-17T09:00:00Z") / 1000 },
    { tx_hash: "b", block_time: Date.parse("2026-10-10T09:00:00Z") / 1000 },
    { tx_hash: "c", block_time: now + 86400 },
  ], now);
  assert.equal(chart.length, 7);
  assert.equal(chart[6].count, 1);
  assert.equal(chart.reduce((sum, d) => sum + d.count, 0), 1);
});

test("no mainnet addresses can be queried", () => {
  assert.equal(assertPreprodPaymentAddress("addr_test1" + "q".repeat(60)).startsWith("addr_test1"), true);
  assert.throws(() => assertPreprodPaymentAddress("addr1" + "q".repeat(70)));
  assert.throws(() => assertPreprodPaymentAddress("https://example.com"));
});

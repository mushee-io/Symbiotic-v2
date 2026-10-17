# RWA Stock Trading: Preprod readiness gate

This implementation is a READ-ONLY infrastructure milestone. No real Apple, NVIDIA, or ETF share ownership is implied or transferable. There is no executable stock-linked trade yet.

- /api/rwa/readiness?ticker=AAPL checks the Cardano Preprod Koios chain tip and pins the on-chain test sUSD mint policy, asset name, originating transaction, and nonzero supply. Provider errors fail closed.
- /rwa shows instrument-specific readiness with unambiguous statuses.
- US Eastern market session now follows published NYSE 2026–2028 calendar holidays and early closures, including DST. Unreviewed years fail closed. Company halts and issuer/market-specific calendars are not included.
- Stock execution remains explicitly disabled. TradingView is RESEARCH ONLY, never an execution oracle.

Unfinished milestones: licensed multi-source stock-price oracle; validator adaptation/deployment for stock-linked derivatives; quotes and live liquidity; safe matching and cancellation; collateral accounting, liquidation and withdrawal; wallet-funded transaction rehearsal; independent Preprod receipts and security testing.

Verification: npm test, npm run typecheck, npm run build, Aiken CI checks. Existing Preprod mint is only collateral evidence, not evidence of RWA market settlement.

Official exchange calendar: https://www.nyse.com/trade/hours-calendars

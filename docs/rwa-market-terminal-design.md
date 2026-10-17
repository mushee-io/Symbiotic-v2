# Symbiotic V2 — RWA trading-terminal design and Preprod execution plan

Status: **design specification only** (17 October 2026). This document is not a claim that the trading terminal, orderbook, or live RWA market has been built, deployed, or tested.

## Reference and product distinction

Reference: https://app.synfutures.com/ (RWA terminal on Base). The supplied screenshot shows a desktop three-column layout: left searchable market list with Favorites/All/Popular/New/Tech/AI/ETFs; center price overview, Line/Candle chart, time ranges, adjusted/raw toggle, and market statistics; right Buy/Sell Market/Limit ticket, balances, pay/receive, and market-opening countdown. Lower workspace includes holdings, open orders, history, and corporate actions. Reproduce the **information architecture**, not SynFutures' branding, artwork, code or issuer claims.

SynFutures' 2026 RWA product uses issued tokenized stocks/ETFs on Base; Symbiotic V2 currently issues and transfers **test-only Cardano native-asset certificates** with CIP-25 label 721 metadata. These are not 1:1 share-backed assets, regulated claims, market liquidity, or executable trading orders. Do not imply equivalence.

## Proposed screen: /rwa/markets

```text
SYMBIOTIC  RWA MARKETS  PERPS  OPTIONS  PORTFOLIO  VAULT & EARN  STATS    PREPROD | CONNECT WALLET
----------------------------------------------------------------------------------------------------
[MARKET LIST / SEARCH]       [ASSET / PRICE / SESSION]           [BUY / SELL]
Search                     DEMO-INVOICE-01  Verified Test     [MARKET] [LIMIT]
Categories                [Market CLOSED | US ET time]        Pay: test quote token
  All / Test Assets        [Next session countdown]          Receive: demo RWA token
  Property / Invoices      Price: No trades yet              Available balance
  Commodities / Funds      [Line | Candles]                  Slippage / fees / validity
  Favorites                [1D 1W 1M ALL]                    [Connect Preprod wallet]
  Assets with policy IDs   [verified onchain trades only]     [Trade unavailable until
                            Volume / depth / trades          contract route verified]
----------------------------------------------------------------------------------------------------
[ASSET INFO] [HOLDINGS] [OPEN ORDERS] [TRADE HISTORY] [ISSUE & VERIFY] [TRANSACTION RECEIPTS]
```

Keep existing `/rwa` issuance and verification experience as `/rwa/issue` or a persistent **Issue & Verify** section. Preserve direct links if paths change; do not break existing mint/transfer functionality. Integrate with `/portfolio`, `/earn`, and `/stats` without inventing APY, TVL, liquidity, trader volume, or protocol-wide PnL.

## Session timings and market status

SynFutures' example describes a US Eastern Time **24/5** schedule divided into overnight 20:00–04:00, premarket 04:00–09:30, regular 09:30–16:00, and after-hours 16:00–20:00. Their screenshot also warns that when an instrument is closed, limit orders *may* be accepted but their execution is not guaranteed. Availability is asset/session-specific; some listings may have narrower hours. Source: https://blog.synfutures.com/spacex-listing-is-here-how-to-trade-on-synfutures/

For Symbiotic:
- Each asset must define its *own* UTC-normalized schedule, timezone `America/New_York` where applicable, market holiday calendar, early closes, weekend handling, and pause controls. Calculate client display and countdown from a trusted server time with timezone/DST handling, not browser assumptions.
- Show OPEN / PREMARKET / AFTER-HOURS / OVERNIGHT / CLOSED / HOLIDAY / HALTED / ORACLE STALE with next-opening countdown and session label. Cardano Preprod runs continuously, but the **market rules** can restrict executions.
- Disabled market order execution outside allowed sessions, during stale price data, or with unavailable liquidity. Show precise reason.
- Only enable a closed-market **limit order** feature after there is a functioning time-valid escrow/cancel/match mechanism; clearly state that being submitted is not being filled. The on-chain Aiken/Plutus validator must enforce windows with transaction validity bounds; a UI-only timer cannot protect settlement.

## Source of truth and wallets

- Use CIP-30 compatible wallets on Preprod only, with network ID and actual on-chain UTxO reconciliation. Provider/Blockfrost credentials stay server-side (`SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID` already used by V2). Fail closed on incorrect network/provider lag.
- Fetch actual Cardano native-asset units, policy IDs, quantities, transactions, confirmation state, and metadata. Label test-only certificates prominently; a document SHA-256 is provenance fingerprint, not legal asset backing or issuer attestation.
- Generate charts only from an attributed licensed external reference feed (marked as **reference price, not trade price**) or confirmed market trades (marked **on-chain executed price**). With no feed or trades, render `No verified price history yet`, not a decorative mock price.
- Verified price feed needs timestamp, source, staleness threshold, handling for splits/dividends/corporate actions when relevant, and guardrails against unsafe settlement at missing/stale prices.
- Every market shows contract and policy IDs; a transaction hash, status (signed/submitted/confirmed/final), and explorer link appear after any action. No wallet key or seed phrase is ever requested.

## Ordered implementation sequence

1. **UI prototype backed by live Preprod reads.** Rebuild /rwa market layout responsively; make asset search, categories, filters, wallet state, market status, countdown and read-only verified holdings work. Reuse existing issuance/verification module.
2. **Tradable demo assets** designed explicitly as Preprod test instruments. Do **not** market them as real stocks. Decide fungible vs nonfungible representation and authenticated mint/supply, and select an actually minted Preprod quote asset instead of assuming a Base/Ethereum stablecoin exists on Cardano.
3. **Real matching/settlement:** implement and test contract-governed limit-order creation, escrow, partial/whole fill policy, cancellation/refund, atomic token-for-token transfers, fees, replay/double-fill prevention, expiry, timeout recovery and accurate order history. Add a market-order path only once there is confirmed available liquidity and bounded slippage. Use Aiken validation, offchain build/evaluate, CIP-30 signing, independent chain confirmation and stable indexing.
4. **Session enforcement:** deploy validity-bounded on-chain rules and verified calendar service; confirm closed-session attempts fail at the script, not merely the UI; demonstrate correctly accepted queued/cancellable limits if those are supported.
5. **Expanded markets, analytics and optional issuer integration:** verifiable orderbook, traded volume, genuine OHLCV, holdings, PnL only where computable, real protocol metrics and governance; for real-backed assets, issuer authorization, reserve/redemption support, compliance controls and legal review are separate prerequisites.

Do not turn on Buy/Sell or deposit buttons for nonfunctional contracts. Never claim the current test certificates transfer legal title, equity voting rights, dividend entitlements or guaranteed yield.

## Later Ubuntu + public Preprod rehearsal

After implementation: on Ubuntu clone `mushee-io/Symbiotic-v2`; run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `aiken check --max-success=5000`, `aiken build`, and relevant contract manifest/tests. Supply a server-side Preprod API key and funded Preprod wallet. Verify one real asset mint and metadata, two-wallet balance reads, a scheduled closed/open boundary, a create/cancel/fill sequence once validators are deployed, invalid-network rejection, stale-feed rejection, and confirmed Cardano Preprod explorer hashes. Scripted unit tests alone do **not** establish live public testnet readiness.

References: https://www.synfutures.com/ ; https://app.synfutures.com/ ; https://blog.synfutures.com/spacex-listing-is-here-how-to-trade-on-synfutures/ ; existing V2 architecture at `docs/rwa-preprod.md`.

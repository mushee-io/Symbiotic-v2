# RWA Stock Trading: Preprod readiness gate

This implementation is a READ-ONLY infrastructure milestone. No real Apple, NVIDIA, or ETF share ownership is implied or transferable. There is no executable stock-linked trade yet.

- /api/rwa/readiness?ticker=AAPL checks the Cardano Preprod Koios chain tip and pins the on-chain test sUSD mint policy, asset name, originating transaction, and nonzero supply. Provider errors fail closed.
- /rwa shows instrument-specific readiness with unambiguous statuses.
- US Eastern market session now follows published NYSE 2026–2028 calendar holidays and early closures, including DST. Unreviewed years fail closed. Company halts and issuer/market-specific calendars are not included.
- Stock execution remains explicitly disabled. TradingView is RESEARCH ONLY, never an execution oracle.

Unfinished milestones: licensed multi-source stock-price oracle; validator adaptation/deployment for stock-linked derivatives; quotes and live liquidity; safe matching and cancellation; collateral accounting, liquidation and withdrawal; wallet-funded transaction rehearsal; independent Preprod receipts and security testing.

Verification: npm test, npm run typecheck, npm run build, Aiken CI checks. Existing Preprod mint is only collateral evidence, not evidence of RWA market settlement.

Official exchange calendar: https://www.nyse.com/trade/hours-calendars


## Engineering progress — authenticated reference price, matching, CIP-30 preflight

- `GET /api/rwa/oracle?ticker=AAPL`: requires `SYMBIOTIC_EQUITY_FEEDS_JSON`
  with **at least two** independent HTTPS origins and Ed25519 public signing keys.
  Source observations must sign exactly:
  `SYMBIOTIC-EQUITY-V1|TICKER|PRICE_MICROS|AS_OF_ISO|ROUND_ID`
  Signed prices expire after 30 seconds, use a 50 bps maximum source deviation,
  and fail closed outside reviewed NYSE regular trading sessions.
  This is an **informational oracle** only; there is no on-chain oracle signing
  authority or stock-trading permission yet.
- `lib/rwa-order-engine.ts`: deterministic micro-unit, price/time priority limit
  matching, duplicate nonce rejection, crossing/slippage controls, expirations,
  per-ticker isolation, bounded book size and partial-fill proposals.
  The output is a **dry-run proposal**, not a real exchange orderbook or fill.
- `GET /api/rwa/execution`: exact missing execution prerequisites, always disabled.
  `POST /api/rwa/execution`: always rejects attempted fund movements.
- `components/RwaWalletPreflight.tsx`: CIP-30 read-only wallet flow, network ID,
  test-address and UTxO check, with `/api/rwa/preflight` server verifying UTxOs
  really exist on Preprod (Preview alone is not enough). Requires server-side
  `SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID`; never requests a private key.
- `rwa-contracts/`: **separate** experimental Aiken stock-pair escrow package,
  compiled on a separate GitHub workflow. Contains bilateral test sUSD payout
  conservation, matched long/short payoff caps, dual-oracle + keeper settlement
  signature requirement and a consent-based mutual refund path. Not deployed and
  not audited. No single-party timeout recovery yet; nobody should deposit funds
  until exit safety has been reviewed.
- `scripts/rwa-preprod-audit.mjs`: independent read-only Koios cross-check for
  tip, canonical sUSD mint, and a local five-reference-validator deployment manifest.
  It exits nonzero while stock trading remains unverified.

### Ubuntu test commands

```bash
git clone https://github.com/mushee-io/Symbiotic-v2.git
cd Symbiotic-v2
npm ci
npm run typecheck
npm test
npm run build
aiken check --max-success=5000
aiken build
cd rwa-contracts
aiken check --max-success=5000
aiken build
cd ..
node scripts/rwa-preprod-audit.mjs mm/.secrets/preprod-validator-deployment.json
```

The deployment-manifest file is local under `mm/.secrets/`, not in git. The
public audit exits nonzero until verifiable contract receipts are present and
still declares stock-specific lifecycle proof missing.

### Production deployment blockers

1. Configure independent **licensed** Ed25519-signed US equity quote feeds; a
   TradingView iframe is NOT a legal data source for settlement.
2. Provide a Blockfrost Preprod server credential and verify real wallet UTxOs.
3. An independent security review must verify the separate stock-pair Aiken
   escrow, especially unilateral timeout recovery, oracle authorization,
   transaction validity windows, quote conservation and denial-of-service cases.
4. With a funded Preprod-only signer in local Ubuntu, deploy a reviewed stock
   script generation, record reference-script UTxO and verify receipts.
5. Prove **two-party fund / open / settle / cancel / refund** on live Preprod,
   confirm both owner balances and script spendability, record tx hashes.
6. Only then build enablement gating. Never set `tradingEnabled=true` via an
   environment toggle, frontend counter, fake quote or unit-test fixture.

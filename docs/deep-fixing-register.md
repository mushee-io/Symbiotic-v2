# Symbiotic V2 — 17-Module Deep-Fixing Register (18 Oct 2026)

This is an engineering backlog, not a claim of completion. Compilation, test fixtures,
public price charts and a real sUSD token mint do not prove that trades, loans,
liquidations or withdrawals can occur safely on Cardano Preprod.

**Live evidence:** use \`/status\` for the 51-point protocol release gate,
\`/status/wiring\` or \`/api/status/wiring\` for the missing modules,
\`/api/rwa/readiness?ticker=AAPL\` for independent sUSD-chain evidence,
and \`scripts/rwa-preprod-audit.mjs\` for an operator's verified manifests.

## What the latest repair pass changed

1. **Equity-feed SSRF:** reject direct IP literals and private hostnames;
   HTTP redirects now fail closed when fetching independently signed quotes.
   Remains to harden DNS rebinding with a controlled network egress proxy.
2. **RWA matching:** self-trade scenarios now fail closed instead of
   silently skipping the resting sell order. It remains a memory-only, unsigned
   **proposal**, not an escrow matching engine.
3. **Longbow:** new \`lib/folder-risk.ts\` uses integer micro-unit loan math for
   collateral valuation, LTV, interest accrual, liquidation and health factor.
   Exposed via the Folder scenario UI and \`POST /api/folder/risk\`.
   All limits are hypothetical, and no collateral is actually verified.
4. **Twofold:** the same library enforces a reserve and utilisation cap,
   share-redemption arithmetic and explicit queueing when pool cash is insufficient.
   This is a sandbox calculation, not a deposit or liquidity pool.
5. **Transaction-builder interface:** Preprod-only API binding in both
   prepare and assemble routes, with HTTPS validation, bounded timeouts,
   no credential-bearing redirects and tests.
6. **Status/wiring:** a 17-module evidence register that never equates config
   keys to live transaction receipts. The endpoint leaks no credentials.

## Acceptance gates per module

| Module | Complete only when ... |
| --- | --- |
| Stock trading | Stock-linked position opens, matches, closes, cancels and withdrawals prove out with chain TX hashes |
| Stock oracle | Two independently controlled licensed equity feeds, authenticated signing, onchain oracle rounds and halts |
| RWA contracts | Independent security review, unilateral refund/collateral recovery, stable script hash and confirmed Preprod reference script |
| RWA orderbook | Persisted user-signed intents, expiry/replay controls, escrow matching and chain reconciliation |
| RWA mint/verify | Real browser-wallet mint→verify→transfer plus indexer and proof that test certificates convey no issuer title |
| BTC perpetuals | Funded open→funding→normal close and open→liquidate→withdraw on same current validator generation |
| Preprod infrastructure | Verified provider chain tips, indexers, five unspent script references, configured operator/builder and manifest |
| Market maker | Funded automated quotes/fills, correct risk bounds, loss limits, recovery tests and 24h+ audited logs |
| Options | Write→buy→exercise/expiry→settle→withdraw with proven collateral conservation |
| Private notional | Multiple signed solver bids, selection, commitment, cancel, settlement and dispute evidence |
| Portfolio | Address, positions, debt, fees and PnL reconcile against independently confirmed chain data |
| Vault & Earn | Audited vault, liquid withdrawal, receipt shares, reward distribution, bad-debt and emergency exits |
| Longbow | User-approved stock collateral rights, debt token accounting, repayments, oracle, liquidations and return of collateral |
| Twofold | User-approved lending assets, utilisation, reserve buffers, loan recovery, share accounting, redemption |
| Stats | Indexed volume, fees, PnL and OI from deduplicated, confirmed transactions; no invented TVL |
| Corporate actions | Verified issuer rights, splits/dividends, market halts, event accounting and entitlement testing |
| Security release | Independent audits, recovery/drill suite, pinned hashes, immutable records and 51-point attestation |

## Blocked by external inputs — do not fabricate

* Vercel runtime has no environment variables listed at audit time.
  An operator must configure Preprod Blockfrost/indexer and transaction
  builder endpoints/tokens after local validation. Do NOT share signing
  secrets via chat or git.
* Stock execution requires authorised/licensed feeds plus an independent
  oracle-attestation design. TradingView charts are not execution evidence.
* Stock-backed lending for **actual Apple shares** requires lawful issuer and
  custody/right-of-redemption arrangements. A Cardano test certificate or
  synthetic derivative is not stock ownership.
* The experimental stock-pair Aiken escrow lacks safe unilateral expiry
  exits and audited settlement-oracle round binding. Do not fund it.
* Real Preprod lifecycle rehearsal requires funded Preprod wallets, owner
  signatures, operator authorisation, signable transaction CBOR and public
  transaction hashes. No tool may invent these.
* User still needs to specify approved product rules for Folder:
  acceptable collateral, interest, LTV/health limits, liquidity utilisation,
  reserve policy, liquidation grace, withdrawal priority and loss allocation.

## Reproducible checks

\`\`\`bash
git clone https://github.com/mushee-io/Symbiotic-v2.git
cd Symbiotic-v2
npm ci
npm run typecheck
npm test
npm run build
# From a pinned Aiken v1.1.22 installation:
aiken check --max-success=5000
aiken build
cd rwa-contracts
aiken check --max-success=5000
aiken build
cd ..
node scripts/rwa-preprod-audit.mjs mm/.secrets/preprod-validator-deployment.json
\`\`\`

The audit script intentionally returns nonzero unless a complete matching
unspent-reference manifest is verified, and it still refuses to claim stock
trades are live until real stock-specific lifecycle receipts exist.

Do not commit credentials, private keys, mnemonic phrases or tokenized
issuer secrets. Do not treat a test contract as an audited production vault.

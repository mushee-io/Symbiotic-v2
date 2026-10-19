# Folder — Longbow & Twofold standalone experimental validators

**TESTNET EXPERIMENT ONLY — UNDEPLOYED, UNAUDITED, NOT SAFE TO FUND.**

This package implements two separate Plutus V3 validators **without modifying**
Symbiotic's frozen original five-validator blueprint.

- `longbow.longbow.spend`: fixed-amount debt against *synthetic test*
  collateral. Borrower signed repayment must return the exact locked collateral
  and pay at least principal plus fixed interest to lender. Two-party consent
  can cancel; after expiry the lender may reclaim collateral; before expiry an
  oracle + keeper + lender-signed undercollateralization test permits liquidation.
  It deliberately does **not** mint sUSD, distribute the opening loan, source a
  licensed equity price feed, authenticate issuance, or create legal ownership.
- `twofold.twofold.spend`: **single-owner operator test vault**, not a public
  multi-depositor market. Tracks real quote-asset UTxO balances, internal shares,
  outstanding debt, minimum reserve, utilization cap, and monotonically
  increasing nonce. Owner-approved supply, redemption, lender+operator-approved
  lending, accounting-backed repayments and zero-debt close are enforced.

## Boundaries before public beta

1. **No entry / origination validation**: funding a loan or initializing the
   vault must be built with correct datum, consent and transaction identity.
2. The fixed-debt Longbow test does not provide accrual, dynamic interest,
   KYC, tokenized stock rights, corporate actions or licensed external prices.
3. Twofold does not tokenize LP shares or enforce per-borrower loan security,
   bad-debt recovery, withdrawal queues, depositor entitlements or interest
   payment schedules. It requires an owner's signature on every value-moving
   action. Debt updates are approved by two distinct operator keys.
4. Liquidation requires independent oracle and keeper signatures, but the
   oracle's signed round and the quote source need additional governance,
   expiry and state-replay controls before production use.
5. In both escrows, collateral / quote payout checks are **whole-transaction**
   invariants. Adversarial multi-input / dust / poisoning tests must be added.
6. Plutus validity and script correctness must be proven with adversarial
   transaction tests, independent audit, Preprod deployments and receipts.
7. Neither validator is connected to frontend deposit, borrow or redeem
   buttons. There is no backend wallet seed or automatic fund movement.

## Compile and test

```bash
cd folder-contracts
aiken check --max-success=5000
aiken build
```

The workflow publishes a standalone blueprint artifact. Do **not** merge
compiled hashes with the pinned core validators or enable the Folder UI based
on CI alone. Make user-approved Preprod transactions with a CIP-30 wallet,
independently verify collateral return, liquidation, repayment, double-spend
and emergency tests, then audit.

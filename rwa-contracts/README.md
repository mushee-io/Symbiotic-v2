# Symbiotic Stock Pair Escrow — isolated experimental Aiken project

**NO CONTRACT IN THIS DIRECTORY HAS BEEN DEPLOYED TO CARDANO PREPROD.**

This separate Aiken package does not change the pinned root protocol blueprint
or the existing five-validator market maker.

The experimental validator is a bilateral AAPL/NVDA **synthetic test position**
escrowed in sUSD test collateral, *not ownership of either stock*.

### Intended behavior

1. A funded buyer and funded counterparty co-create an inline-datum escrow
   holding exactly their combined test sUSD. The contract cannot independently
   prove consent when funds are initially deposited: a future offchain builder
   must enforce owner consent and quote identity.
2. The seller/long owner address and short owner address are pinned in datum.
3. Close requires BOTH authorized oracle signers AND a settlement keeper.
   The oracle attestation timestamp must fall in the Cardano validity range.
4. Mathematical PnL is paid in test sUSD, capped by combined locked collateral.
   The transaction must pay exactly those amounts to the pinned owners.
5. Mutual refund requires BOTH owner signatures and exact original payouts.
6. After `expiry_ms`, either owner can unilaterally trigger a `TimeoutRefund` that returns exactly each party's original collateral. Settlement validity ranges must be entirely BEFORE expiry; timed-out refunds must be entirely AFTER expiry. The two branches are disjoint.
7. Only one stock-pair script input per transaction is allowed to prevent
   crediting the same outputs to multiple positions.

### Critical risks / blockers

- No on-chain market-hours/halts enforcement, independent oracle-round NFT
  state, replay register, order matching or user-side entry-intent proof yet.
- Unilateral expiry refunds are implemented but **need transaction-level adversarial tests**, correct datum construction and independent audit. There is no early liquidation, leverage risk recovery or asynchronous market halts. Not suitable for unattended custody, production or public deposits. This is still an experimental test-only prototype.
- No funds can be moved by this repository without local signing keys; none
  should ever be committed or sent to the assistant.
- No per-contract mainnet deploy, and no backing in real equities.

### Build

From `rwa-contracts` run `aiken check --max-success=5000` and `aiken build`.
Inspect the standalone `plutus.json`, derive parameterized hashes and
addresses using an audited builder, then independently verify Preprod deployment
and open/settle/refund transaction receipts before any UI action is enabled.

**This is NOT the existing production-ready five-validator blueprint.**

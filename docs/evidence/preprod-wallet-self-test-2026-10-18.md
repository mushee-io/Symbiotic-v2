# Symbiotic V2 — Cardano Preprod wallet self-test (confirmed)

**Network:** Cardano Preprod (magic 1)  
**Date:** 18 October 2026  
**Status:** Confirmed on-chain (not just submitted)  
**Transaction:** `40e9baaeeec09755ea05ac6a60766ac9944d7bf3ef0b5596efcace9712f8d09d`  
**Explorer:** https://preprod.cexplorer.io/tx/40e9baaeeec09755ea05ac6a60766ac9944d7bf3ef0b5596efcace9712f8d09d

## Verified on-chain evidence

- **Block:** 5,308,128
- **Epoch:** 320
- **Slot:** 136,677,529
- **Included:** 2026-10-18 21:58 UTC (per Cexplorer)
- **Fee:** approximately 0.1705 test ADA
- **Inputs / outputs:** 1 input, 2 outputs
- **Destination guard:** Both outputs returned to the same sending wallet address; one output was exactly 2 test ADA and the other returned the remaining balance less fee.
- **Scope:** ADA-only wallet-to-self transaction on Preprod. No Plutus scripts, perps, options, stock contracts, or lending positions were exercised.

## Tested path

1. CIP-30 Lace wallet detected and connected on testnet.
2. Spendable wallet UTxO selected and checked independently against Cardano Preprod.
3. Authenticated standalone builder prepared an unsigned ADA-only wallet-return transaction.
4. Lace wallet signed, builder assembled, and Lace submitted the transaction to Cardano Preprod.
5. Independent blockchain explorer confirmed inclusion and correct same-wallet outputs.

## What this does and does not prove

**Proves:** A functioning end-to-end Preprod wallet transaction path from the Symbiotic V2 application through the authenticated builder, wallet, and chain, with fee-only net wallet spend.

**Does not prove:** Live contract execution, derivative trading, custody, lending/earn lifecycle, or production-grade backend availability. The builder is currently accessed through a temporary Cloudflare Quick Tunnel with no uptime guarantee. Persistent authenticated networking, operational monitoring, and other protocol lifecycle tests remain separate work items.

**Do not** place wallet seed phrases, signing keys, Blockfrost API credentials, or bearer tokens in this evidence record.

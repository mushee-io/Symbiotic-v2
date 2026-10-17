# Symbiotic V2 — Real World Asset test certificates on Cardano Preprod

## Release status

This module builds **real Cardano Preprod transactions** with Mesh SDK. Minting and transferring use wallet-held keys, CIP-30 signing, and native-asset transaction construction. The module does **not** claim that a live mint or transfer has been submitted until there is an independently verifiable transaction hash and confirmed asset lookup.

All tokens are **test certificates only**. They are not backed by real-world assets by default, do not create legal title, do not identify an accredited issuer and do not enforce KYC, transfer limits, investor suitability, redemption, custody or financial regulation.

## Operator checklist

1. Configure a **Preprod** Blockfrost project and set `SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID` in Vercel's **server-side** environment (never use `NEXT_PUBLIC_`). Redeploy after setting it.
2. Open `/rwa` and connect Lace or another Mesh-compatible CIP-30 wallet configured for **Cardano Preprod**.
3. Acquire **test ADA** from the official Cardano testnet faucet. Do not send real ADA to testnet addresses.
4. The wallet check validates CIP-30 testnet ID 0 and confirms a wallet UTxO exists **on Preprod**, distinguishing Preprod from Preview. A newly funded wallet may need a minute or two to index.
5. Upload an example document **locally** to compute SHA-256 in the browser, or paste its SHA-256. No document bytes are uploaded.
6. Enter the simulated asset name, self-declared issuer and asset category; acknowledge test-only use.
7. Sign the native-asset mint transaction in the wallet. The transaction mints **one** uniquely named test certificate, deposits it into the wallet and attaches metadata label 721, including the document hash and explicit `SYMBIOTIC_PREPROD_TEST_V1` marker.
8. Open the transaction on Cardanoscan Preprod. After indexer confirmation, use the **Verify** panel to query the actual chain via the Blockfrost Preprod API.
9. Optionally transfer one verified certificate to a second **Preprod** wallet and check the transfer hash.

## New web routes

- `/rwa`: issuer/verification/transfer console.
- `POST /api/rwa/preflight`: verifies submitted CIP-30 UTxO references exist on **Preprod** before signing.
- `GET /api/rwa/verify?unit=<policyId+assetNameHex>`: fetches the indexed asset, on-chain metadata, token quantity and initial mint transaction. It only claims verified status when the RWA test marker is present.

## Security boundaries

- Signing and private keys remain in the wallet extension; never accept wallet seed phrases.
- Blockfrost project ID is **server-side** and is not included in client code.
- Preprod validation is fail-closed if the provider is unavailable or lacks credentials. It does not quietly fall back to Preview or mock data.
- Document hashes are public and immutable once minted; a hash matches specific bytes but does **not** verify document authenticity, ownership or issuer identity.
- The native-asset policy is signature-gated by the user's wallet. It **does not enforce a fixed supply cap**: the signer could later mint more of the same token. One unit is minted by this interface per request.
- Token transfers are unrestricted native-asset transfers. Implement issuer registries, legal custody/title agreements, whitelist enforcement, redemption and audited Plutus policies before calling this a permissioned or real-backed RWA platform.
- "Submitted" does not mean "confirmed"; the explorer and verification endpoint are required for evidence.
- Transfers to the wrong testnet address can be unrecoverable. The UI checks the Bech32 prefix; users must verify the destination wallet itself is on Preprod.

## References

Cardano developer documentation: https://docs.cardano.org/native-tokens/getting-started/

Mesh SDK native asset minting: https://meshjs.dev/apis/txbuilder/minting

Blockfrost Preprod API: https://cardano-preprod.blockfrost.io/api/v0

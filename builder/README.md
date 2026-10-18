# Symbiotic V2 — Preprod Transaction Builder

This standalone Node 22+ service builds **actual Cardano Preprod unsigned CBOR**
for a restricted wallet self-test, and assembles a CIP-30 witness set back
into the original transaction for local wallet submission.

**It does not sign transactions, retain private keys or submit transactions.**

## Supported action

- `WALLET_SELF_TEST`: send exactly 2 test ADA from a Preprod wallet back to
  the **same** wallet, with change to the **same** wallet. Source selection is
  restricted to pure-ADA outputs from the real Blockfrost Preprod provider.
  The service independently checks the serialized transaction output
  addresses, values and maximum fee, and rejects token-bearing UTxOs.
- Perps, options, RWA, notional, lending, collateral deposits, withdrawals and
  deployments remain **DISABLED** until an audited, fully evidenced builder
  action is implemented.

## Install on Ubuntu

```bash
git clone https://github.com/mushee-io/Symbiotic-v2.git
cd Symbiotic-v2/builder
npm ci || npm install
cp .env.example .env
# Set BLOCKFROST_PROJECT_ID (Preprod) and a random, independent
# BUILDER_AUTH_TOKEN (at least 32 characters), LOCALLY.
# Suggested token generation:
openssl rand -hex 32
set -a; source .env; set +a
npm run typecheck
npm test
npm start
```

The service listens on **127.0.0.1:8788**, never `0.0.0.0`.
Use a TLS-authenticated reverse proxy and request rate limiting for
remote use. On Vercel configure `SYMBIOTIC_TX_BUILDER_ENDPOINT` to the
authenticated HTTPS proxy URL and `SYMBIOTIC_TX_BUILDER_TOKEN` to the
builder token. Never configure these before establishing private
network boundaries and public API rate limits.

### Local diagnostic requests

```bash
curl -fsS http://127.0.0.1:8788/healthz
curl -fsS -H "Authorization: Bearer $BUILDER_AUTH_TOKEN" http://127.0.0.1:8788/ready
```

`/prepare` accepts JSON
`{ "action":"WALLET_SELF_TEST", "network":"preprod",
"account":"addr_test1...", "payload":{}, "intentHash":"..." }`.
The intent hash is SHA-256 of
`symbiotic-builder-v1|preprod|WALLET_SELF_TEST|<wallet_address>|2000000`.
Use `openssl dgst -sha256` over this exact UTF-8 text or the
`intentForSelfTest(address)` function in `src/policy.ts`.

`/assemble` accepts `requestId`, the original `unsignedTxCborHex`, and
the CIP-30 `witnessSetCborHex`. It refuses mutated CBOR, missing vkey
witnesses, script witnesses, expired IDs and repeated assembly. The
client wallet must inspect, sign and submit the returned transaction.
**No transaction is submitted by this service.**

### Safety and operational limits

- Builder session cache is in memory: restart clears sessions, and
  multi-instance hosting is unsupported until a durable atomic store exists.
- Authentication is required for all request-processing APIs.
- A testnet wallet will pay network fees even when sending to itself.
- The CIP-30 network ID `0` alone cannot distinguish Preview from Preprod.
  The builder obtains UTxOs from Blockfrost **Preprod**.
- A live Preprod wallet signing test is still required. **Do not call the
  infrastructure milestone complete based only on CI and `/ready`.**

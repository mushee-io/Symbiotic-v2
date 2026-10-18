# Symbiotic V2 — Ubuntu desktop to Vercel builder tunnel

Use this runbook only for the restricted **Cardano Preprod** wallet self-test.
The builder is pinned to `127.0.0.1:8788`, and stores no signing keys.

## Local prerequisites

- `curl -fsS http://127.0.0.1:8788/healthz` must return `running:true`.
- Run from `builder/`: `set -a; source .env; set +a`, then verify
  `curl -fsS -H "Authorization: Bearer $BUILDER_AUTH_TOKEN" http://127.0.0.1:8788/ready`
  returns `ready:true`. Do not paste private tokens or credentials into chat.
- The Ubuntu desktop must stay awake with builder and cloudflared running.

## Install official Cloudflare tunnel client on Ubuntu

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
 | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
 | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install -y cloudflared
cloudflared --version
```

Official documentation:
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/

## A. Temporary transport test — NOT production

```bash
cloudflared tunnel --url http://127.0.0.1:8788
```

This prints an ephemeral `https://<random>.trycloudflare.com` public URL.
Do not post its secret bearer token. Before sending credentials over HTTPS,
test that unauthenticated `GET <URL>/ready` returns HTTP **401**,
then test an authenticated `/ready` request privately. Stop `cloudflared`
to close the public endpoint. This mode has no uptime commitment, public
routing, and is **only for a brief supervised end-to-end test**.

Official limitations:
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/

## B. Durable protected hostname — recommended

This requires a domain on Cloudflare DNS.

1. In Cloudflare Zero Trust, create a **Service Token** for the builder.
   Save the Client ID and Client Secret securely.
2. Create a **self-hosted Access application** for the exact builder
   hostname, with a **Service Auth** policy including only that service
   token. Choose the option that returns 401 on unauthorized requests.
   Do this **before** exposing a hostname.
3. In Cloudflare Tunnel, create a tunnel for the Ubuntu desktop, follow
   the provided `cloudflared` installation and tunnel-run commands,
   and publish the hostname to `http://127.0.0.1:8788`.
   Leave the builder bound to loopback; no router port forwarding.
4. Confirm anonymous `GET https://<builder-host>/ready` gets 401.
   Test authorized `GET /ready` privately with **both**
   `CF-Access-Client-Id`, `CF-Access-Client-Secret` headers and
   `Authorization: Bearer $BUILDER_AUTH_TOKEN`.
5. In the **Vercel Production environment** configure:

   - `SYMBIOTIC_TX_BUILDER_ENDPOINT`: `https://<builder-host>`
   - `SYMBIOTIC_TX_BUILDER_TOKEN`: same local builder bearer token.
   - `SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_ID`: Access service token ID.
   - `SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_SECRET`: Access secret.
   - `SYMBIOTIC_WALLET_SELF_TEST_ENABLED`: `true` **only while supervised**.

   Never use `NEXT_PUBLIC_` for any secret.
6. Redeploy the Vercel app to load the new variables.
   `/api/cardano/builder/status` must return `ready:true`.
   Open `/status/builder` and run the small testnet self-send,
   inspect the wallet popup, submit, then verify its Preprod receipt.

Documentation:
https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/

**Important:** Cloudflare Access protects the local builder, but Vercel's
`/api/cardano/prepare` and `/api/cardano/assemble` routes are still public
proxies. This limited self-test should be enabled only temporarily.
Before permanent or broader financial execution, add user authentication,
distributed rate limiting, abuse monitoring and production-grade session
storage. An always-on host or VPS is needed for persistent availability.

After testing, set `SYMBIOTIC_WALLET_SELF_TEST_ENABLED=false` in Vercel
and redeploy until that public boundary is hardened.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BrowserWallet,
  ForgeScript,
  MeshTxBuilder,
  resolveScriptHash,
  stringToHex,
  type UTxO,
} from "@meshsdk/core";
import {
  RWA_CATEGORIES,
  RWA_MARKER,
  buildRwaTokenName,
  isAssetUnit,
  shortIdentifier,
  validateRwaDraft,
  type RwaDraft,
} from "@/lib/rwa";
import styles from "./rwa.module.css";

type Verification = {
  verifiedOnPreprod: boolean;
  legalOwnershipVerified: boolean;
  unit: string;
  name: string | null;
  issuer: string | null;
  category: string | null;
  documentSha256: string | null;
  reference: string | null;
  quantity: string;
  firstMintTransaction: string | null;
};
type Issuance = { unit: string; policyId: string; tokenName: string; txHash: string };
type WalletOption = { name: string };

const INITIAL_DRAFT: RwaDraft = {
  name: "",
  issuer: "",
  category: "PROPERTY",
  documentSha256: "",
  reference: "",
};

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function toRefs(utxos: UTxO[]) {
  return utxos.slice(0, 3).map(({ input }) => input.txHash + "#" + input.outputIndex);
}

async function assertActualPreprod(utxos: UTxO[]) {
  if (!utxos.length) throw new Error("Wallet has no UTxOs. Fund it with Preprod test ADA first.");
  const response = await fetch("/api/rwa/preflight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ utxoRefs: toRefs(utxos) }),
    cache: "no-store",
  });
  const result: { error?: string; verified?: boolean } = await response.json();
  if (!response.ok || !result.verified) throw new Error(result.error || "Unable to prove wallet is on Preprod");
}

function ErrorText({ value }: { value: string }) {
  return value ? <p className={styles.error} role="alert">{value}</p> : null;
}

export default function RwaPage() {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [choice, setChoice] = useState("");
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [address, setAddress] = useState("");
  const [draft, setDraft] = useState<RwaDraft>(INITIAL_DRAFT);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("CONNECT WALLET TO BEGIN");
  const [error, setError] = useState("");
  const [issuance, setIssuance] = useState<Issuance | null>(null);
  const [lookup, setLookup] = useState("");
  const [verification, setVerification] = useState<Verification | null>(null);
  const [recipient, setRecipient] = useState("");
  const [transferHash, setTransferHash] = useState("");

  useEffect(() => {
    const available = BrowserWallet.getInstalledWallets();
    setWallets(available.map(({ name }) => ({ name })));
    if (available.length) setChoice(available[0].name);
  }, []);

  function setField<K extends keyof RwaDraft>(key: K, value: RwaDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError("");
  }

  async function connect() {
    if (!choice || busy) return;
    setBusy(true); setError(""); setPhase("CHECKING CARDANO PREPROD…");
    try {
      const connected = await BrowserWallet.enable(choice);
      if ((await connected.getNetworkId()) !== 0) throw new Error("Switch your wallet from Mainnet to Cardano Preprod");
      const change = await connected.getChangeAddress();
      if (!change.startsWith("addr_test1")) throw new Error("Wallet must use a Cardano testnet address");
      const utxos = await connected.getUtxos();
      await assertActualPreprod(utxos ?? []);
      setWallet(connected);
      setAddress(change);
      setPhase("PREPROD WALLET VERIFIED");
    } catch (issue) {
      setWallet(null); setAddress("");
      setPhase("PREFLIGHT FAILED");
      setError(issue instanceof Error ? issue.message : "Unable to connect wallet");
    } finally { setBusy(false); }
  }

  async function hashDocument(file?: File) {
    if (!file) return;
    setError("");
    try {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      setField("documentSha256", hex(new Uint8Array(digest)));
      setPhase("FILE HASHED LOCALLY — FILE NOT UPLOADED");
    } catch {
      setError("Unable to fingerprint this file");
    }
  }

  async function issue() {
    if (!wallet || busy) return;
    setBusy(true); setError(""); setIssuance(null);
    try {
      if (!acknowledged) throw new Error("Confirm this is a test-only certificate before minting");
      const details = validateRwaDraft(draft);
      if ((await wallet.getNetworkId()) !== 0) throw new Error("Switch your wallet back to Cardano Preprod");
      const changeAddress = await wallet.getChangeAddress();
      if (!changeAddress.startsWith("addr_test1")) throw new Error("Expected a Cardano testnet address");
      const utxos = await wallet.getUtxos();
      setPhase("VERIFYING LIVE PREPROD UTxOs…");
      await assertActualPreprod(utxos ?? []);

      const nonce = hex(crypto.getRandomValues(new Uint8Array(6)));
      const tokenName = buildRwaTokenName(nonce);
      const tokenNameHex = stringToHex(tokenName);
      const script = ForgeScript.withOneSignature(changeAddress);
      const policyId = resolveScriptHash(script);
      const unit = policyId + tokenNameHex;

      setPhase("BUILDING SIGNATURE-GATED RWA CERTIFICATE…");
      const unsignedTx = await new MeshTxBuilder()
        .mint("1", policyId, tokenNameHex)
        .mintingScript(script)
        .txOut(changeAddress, [
          { unit: "lovelace", quantity: "2000000" },
          { unit, quantity: "1" },
        ])
        .metadataValue(721, {
          [policyId]: {
            [tokenName]: {
              name: details.name,
              issuer: details.issuer,
              category: details.category,
              document_sha256: details.documentSha256,
              reference: details.reference,
              rwa_profile: RWA_MARKER,
              description: "Test certificate only. No legal asset rights.",
            },
          },
        })
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos ?? [])
        .complete();

      setPhase("AWAITING WALLET SIGNATURE…");
      const signedTx = await wallet.signTx(unsignedTx);
      setPhase("SUBMITTING TRANSACTION TO CARDANO…");
      const txHash = await wallet.submitTx(signedTx);
      if (!/^[0-9a-f]{64}$/i.test(txHash)) throw new Error("Wallet returned an invalid transaction hash");
      setIssuance({ unit, policyId, tokenName, txHash });
      setLookup(unit);
      setVerification(null);
      setPhase("SUBMITTED — AWAIT CONFIRMATION / INDEXING");
    } catch (issue) {
      setPhase("TRANSACTION NOT CONFIRMED");
      setError(issue instanceof Error ? issue.message : "Unable to issue RWA certificate");
    } finally { setBusy(false); }
  }

  async function verify() {
    setError(""); setVerification(null); setBusy(true);
    setPhase("QUERYING LIVE CARDANO PREPROD…");
    try {
      const unit = lookup.trim().toLowerCase();
      if (!isAssetUnit(unit)) throw new Error("Enter a complete policy ID + token name hex");
      const response = await fetch("/api/rwa/verify?unit=" + encodeURIComponent(unit), { cache: "no-store" });
      const body: Verification & { error?: string } = await response.json();
      if (!response.ok || !body.verifiedOnPreprod) throw new Error(body.error || "Asset has not been indexed on Preprod");
      setVerification(body);
      setPhase("CARDANO PREPROD RECORD CONFIRMED");
    } catch (issue) {
      setPhase("VERIFICATION INCOMPLETE");
      setError(issue instanceof Error ? issue.message : "Verification failed");
    } finally { setBusy(false); }
  }

  async function transfer() {
    if (!wallet || !verification || busy) return;
    setBusy(true); setError(""); setTransferHash("");
    try {
      if (!/^addr_test1[0-9a-z]+$/.test(recipient)) throw new Error("Recipient must be a valid Cardano testnet payment address");
      if ((await wallet.getNetworkId()) !== 0) throw new Error("Switch wallet to Cardano Preprod");
      const utxos = await wallet.getUtxos();
      setPhase("VERIFYING PREPROD AND CERTIFICATE BALANCE…");
      await assertActualPreprod(utxos ?? []);
      const held = (utxos ?? []).reduce((n, utxo) =>
        n + utxo.output.amount.reduce((sum, asset) =>
          sum + (asset.unit === verification.unit ? BigInt(asset.quantity) : 0n), 0n), 0n);
      if (held < 1n) throw new Error("Connected wallet does not hold this certificate");
      const change = await wallet.getChangeAddress();
      const unsignedTx = await new MeshTxBuilder()
        .txOut(recipient, [
          { unit: "lovelace", quantity: "2000000" },
          { unit: verification.unit, quantity: "1" },
        ])
        .metadataValue(674, { msg: ["Symbiotic RWA Preprod test transfer"] })
        .changeAddress(change)
        .selectUtxosFrom(utxos ?? [])
        .complete();
      setPhase("AWAITING TRANSFER SIGNATURE…");
      const signedTx = await wallet.signTx(unsignedTx);
      setPhase("SUBMITTING PREPROD TRANSFER…");
      const txHash = await wallet.submitTx(signedTx);
      if (!/^[0-9a-f]{64}$/i.test(txHash)) throw new Error("Wallet returned an invalid transaction hash");
      setTransferHash(txHash);
      setPhase("TRANSFER SUBMITTED — CONFIRM ON EXPLORER");
    } catch (issue) {
      setPhase("TRANSFER NOT CONFIRMED");
      setError(issue instanceof Error ? issue.message : "Transfer failed");
    } finally { setBusy(false); }
  }

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>S</span><b>SYMBIOTIC</b><small>RWA LAB</small></Link>
        <nav><Link href="/">OVERVIEW</Link><Link href="/trade">TRADE</Link><Link href="/rwa" className={styles.current}>RWA</Link><Link href="/portfolio">PORTFOLIO</Link><Link href="/earn">VAULT &amp; EARN</Link><Link href="/stats">STATS</Link><a href="https://github.com/mushee-io/Symbiotic-v2" target="_blank" rel="noreferrer">SOURCE ↗</a></nav>
        <span className={styles.net}>● CARDANO PREPROD</span>
      </header>

      <div className={styles.eyebrow}><span>SYMBIOTIC / TOKENISATION</span><span>01 / PREPROD TEST ASSET INFRASTRUCTURE</span></div>
      <section className={styles.hero}>
        <div><p className={styles.kicker}>PROOF IS THE PRODUCT</p><h1>REAL ASSETS.<br /><em>ONCHAIN</em> RECORDS.</h1><p className={styles.lead}>Issue wallet-signed test certificates, anchor source-document hashes, transfer token ownership and independently inspect Cardano Preprod evidence.</p></div>
        <div className={styles.heroPanel}><div>ISSUANCE PIPELINE</div><b>DOCUMENT → SHA-256 → NATIVE ASSET → WALLET SIGNATURE → PREPROD</b><small>Test-only issuance. No financial or legal ownership rights conveyed.</small></div>
      </section>

      <section className={styles.statRow}>
        <div><span>NETWORK</span><strong>PREPROD / MAGIC 1</strong></div>
        <div><span>STANDARD</span><strong>CARDANO NATIVE ASSET</strong></div>
        <div><span>METADATA</span><strong>LABEL 721</strong></div>
        <div><span>LEGAL ATTESTATION</span><strong>NOT PROVIDED</strong></div>
      </section>

      <section className={styles.content}>
        <div className={styles.column}>
          <div className={styles.sectionHead}><span>01 / CONNECT</span><h2>YOUR SIGNATURE.<br />YOUR CERTIFICATE.</h2></div>
          <div className={styles.panel}>
            <p>Connect a Cardano extension wallet set to <b>Preprod</b>. We verify a real wallet UTxO against the Preprod provider — CIP-30 network ID 0 alone cannot distinguish Preview.</p>
            <div className={styles.walletRow}>
              <select aria-label="Select Cardano wallet" value={choice} onChange={(e) => setChoice(e.target.value)} disabled={busy || !!wallet}>
                {wallets.length === 0 ? <option value="">NO WALLET FOUND</option> : wallets.map((item) => <option key={item.name} value={item.name}>{item.name.toUpperCase()}</option>)}
              </select>
              <button className={styles.action} type="button" onClick={connect} disabled={busy || !choice || !!wallet}>{wallet ? "PREPROD VERIFIED ✓" : "CONNECT WALLET ↗"}</button>
            </div>
            {address ? <div className={styles.address}><span>CONNECTED ADDRESS</span><code>{address}</code></div> : null}
            <p className={styles.helper}>A Preprod Blockfrost project ID must be configured server-side for network confirmation. Wallet signatures never leave your wallet.</p>
          </div>

          <div className={styles.sectionHead}><span>02 / ISSUE</span><h2>CREATE AN ASSET<br />CERTIFICATE.</h2></div>
          <div className={styles.panel}>
            <div className={styles.twoFields}>
              <label><span>ASSET NAME</span><input maxLength={48} placeholder="Example: Warehouse Unit A" value={draft.name} onChange={(e) => setField("name", e.target.value)} /></label>
              <label><span>ISSUER LABEL (SELF-DECLARED)</span><input maxLength={48} placeholder="Example: Mushee Research" value={draft.issuer} onChange={(e) => setField("issuer", e.target.value)} /></label>
            </div>
            <div className={styles.twoFields}>
              <label><span>ASSET CLASS</span><select value={draft.category} onChange={(e) => setField("category", e.target.value as RwaDraft["category"])}>{RWA_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>REFERENCE (OPTIONAL)</span><input maxLength={48} placeholder="INTERNAL-REF-001" value={draft.reference} onChange={(e) => setField("reference", e.target.value)} /></label>
            </div>
            <label><span>SOURCE DOCUMENT / HASH LOCALLY</span><input type="file" onChange={(e) => void hashDocument(e.target.files?.[0])} /></label>
            <label><span>SHA-256 DOCUMENT FINGERPRINT</span><input className={styles.monoInput} spellCheck={false} placeholder="64-character SHA-256 hex (or choose a file)" value={draft.documentSha256} onChange={(e) => setField("documentSha256", e.target.value)} /></label>
            <p className={styles.helper}>File contents stay in your browser. The 64-character document hash and the entered labels are public blockchain metadata. Do not enter confidential personal information.</p>
            <label className={styles.confirm}><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />I understand this creates one transferable Preprod <b>test certificate</b>, not legal title, an investment, or a permissioned RWA.</label>
            <button className={styles.mintButton} type="button" disabled={!wallet || busy || !acknowledged} onClick={issue}>{busy ? "PROCESSING…" : "MINT 1 PREPROD CERTIFICATE ↗"}</button>
            {issuance ? (
              <div className={styles.result}>
                <span>TRANSACTION SUBMITTED / NOT YET FINALITY-CONFIRMED</span>
                <strong>{issuance.tokenName}</strong>
                <code>POLICY: {issuance.policyId}</code>
                <code>UNIT: {issuance.unit}</code>
                <a href={"https://preprod.cardanoscan.io/transaction/" + issuance.txHash} target="_blank" rel="noreferrer">VIEW MINT TRANSACTION ↗</a>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.sectionHead}><span>03 / VERIFY</span><h2>INDEPENDENT<br />CHAIN EVIDENCE.</h2></div>
          <div className={styles.panel}>
            <p>Paste a token unit or use the unit generated after minting. The server checks the actual Cardano Preprod asset index, original mint transaction and on-chain metadata marker.</p>
            <label><span>POLICY ID + ASSET NAME HEX</span><input className={styles.monoInput} spellCheck={false} value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="56 hex policy ID followed by asset name hex" /></label>
            <button className={styles.action} type="button" onClick={verify} disabled={busy || !isAssetUnit(lookup.trim())}>VERIFY AGAINST PREPROD ↗</button>
            {verification ? (
              <div className={styles.proof}>
                <div className={styles.proofSuccess}>● VERIFIED: TOKEN PRESENT ON PREPROD</div>
                <dl>
                  <div><dt>ASSET</dt><dd>{verification.name || "—"}</dd></div>
                  <div><dt>CLASS</dt><dd>{verification.category || "—"}</dd></div>
                  <div><dt>ISSUER CLAIM</dt><dd>{verification.issuer || "—"}</dd></div>
                  <div><dt>TOTAL MINTED NET SUPPLY</dt><dd>{verification.quantity}</dd></div>
                  <div><dt>DOCUMENT SHA-256</dt><dd><code>{verification.documentSha256}</code></dd></div>
                  <div><dt>REFERENCE</dt><dd>{verification.reference || "—"}</dd></div>
                  <div><dt>ONCHAIN STATUS</dt><dd>INDEXED / PREPROD</dd></div>
                  <div><dt>LEGAL TITLE</dt><dd>NOT VERIFIED</dd></div>
                </dl>
                {verification.firstMintTransaction ? <a href={"https://preprod.cardanoscan.io/transaction/" + verification.firstMintTransaction} target="_blank" rel="noreferrer">VIEW ORIGINAL MINT ↗</a> : null}
              </div>
            ) : null}
          </div>

          <div className={styles.sectionHead}><span>04 / TRANSFER</span><h2>MOVE THE<br />TEST CERTIFICATE.</h2></div>
          <div className={styles.panel}>
            <p>After verifying a certificate, send exactly one token from your connected wallet to another Preprod payment address. This is an unrestricted test-token transfer, not a regulated settlement workflow.</p>
            <label><span>RECIPIENT CARDANO PREPROD ADDRESS</span><input className={styles.monoInput} value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="addr_test1…" /></label>
            <button className={styles.action} type="button" disabled={busy || !wallet || !verification} onClick={transfer}>TRANSFER 1 VERIFIED CERTIFICATE ↗</button>
            {transferHash ? <div className={styles.result}><span>TRANSFER SUBMITTED / AWAIT CONFIRMATION</span><a href={"https://preprod.cardanoscan.io/transaction/" + transferHash} target="_blank" rel="noreferrer">VIEW PREPROD TRANSFER ↗</a></div> : null}
          </div>

          <div className={styles.status}><span>RWA ENGINE / PREPROD STATUS</span><strong>{phase}</strong><ErrorText value={error}/><small>Onchain presence proves transaction history, not asset backing, issuer identity, title, valuation or redemption rights. Current minting policy is signer-controlled, without a hard supply cap.</small></div>
        </div>
      </section>
      <footer className={styles.footer}><span>SYMBIOTIC V2 / RWA TESTNET LAB</span><span>{address ? shortIdentifier(address) : "WALLET NOT CONNECTED"}</span><span>CARDANO PREPROD ONLY</span></footer>
    </main>
  );
}

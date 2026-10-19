"use client";

import Link from "next/link";
import {PreprodProtocolActivity} from "@/components/PreprodProtocolActivity";
import {PreprodPositions} from "@/components/PreprodPositions";
import { BrowserWallet, type UTxO } from "@meshsdk/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assertPreprodPaymentAddress,
  formatAda,
  shortAddress,
} from "@/lib/portfolio-analytics";
import type {
  NetworkObservation,
  ObservedLeaderboard,
  PortfolioObservation,
  VaultObservation
} from "@/lib/dashboard-types";
import styles from "@/app/command-center.module.css";

type View = "portfolio" | "earn" | "stats";
type ResponseError = { error?: string };

function errorMessage(value: unknown) {
  return value instanceof Error ? value.message : "Preprod request failed";
}
function txUrl(hash: string) {
  return "https://preprod.cardanoscan.io/transaction/" + hash;
}
function refUrl(address: string) {
  return "https://preprod.cardanoscan.io/address/" + address;
}
function friendlyDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}
function compact(num: number) {
  return Number.isFinite(num) ? num.toLocaleString("en-GB") : "—";
}
function truncHash(hash: string) {
  return hash.length > 30 ? hash.slice(0, 14) + "…" + hash.slice(-8) : hash;
}
function RenderError({ message }: { message: string }) {
  return message ? <div className={styles.alert} role="alert">{message}</div> : null;
}
function Metric({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{subtitle || "CHAIN OBSERVATION"}</small></div>;
}
function DataBarChart({ data, annotation }: { data: { day: string; count: number }[]; annotation: string }) {
  const max = Math.max(1, ...data.map(x => x.count));
  return <div className={styles.chartWrap}>
    <div className={styles.chartHead}><span>ONCHAIN ADDRESS TRANSACTION ACTIVITY</span><small>LAST 7 UTC DAYS</small></div>
    <div className={styles.bars} role="img" aria-label={"Observed daily transaction counts: " + data.map(d => d.day + " " + d.count).join(", ")}>
      {data.map(item => <div className={styles.barColumn} key={item.day}>
        <span className={styles.barValue}>{item.count || "—"}</span>
        <div className={styles.barTrack}><div style={{ height: (item.count ? Math.max(7, 100 * item.count / max) : 0) + "%" }} /></div>
        <small>{item.day.slice(5)}</small>
      </div>)}
    </div><p className={styles.footnote}>{annotation}</p>
  </div>;
}

export function PreprodCommandCenter({ view }: { view: View }) {
  const [wallets, setWallets] = useState<string[]>([]);
  const [walletChoice, setWalletChoice] = useState("");
  const [address, setAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioObservation | null>(null);
  const [vault, setVault] = useState<VaultObservation | null>(null);
  const [network, setNetwork] = useState<NetworkObservation | null>(null);
  const [leaderboard, setLeaderboard] = useState<ObservedLeaderboard | null>(null);
  const [error, setError] = useState("");
  const [vaultError, setVaultError] = useState("");
  const [networkError, setNetworkError] = useState("");
  const [leaderboardError, setLeaderboardError] = useState("");
  const [list, setList] = useState<string[]>([]);
  const [candidate, setCandidate] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const available = BrowserWallet.getInstalledWallets().map(({ name }) => name);
    setWallets(available);
    if (available.length) setWalletChoice(available[0]);
    const stored = window.localStorage.getItem("symbiotic-v2-last-preprod-address") || "";
    if (stored) {
      try { setAddress(assertPreprodPaymentAddress(stored)); }
      catch { window.localStorage.removeItem("symbiotic-v2-last-preprod-address"); }
    }
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem("symbiotic-v2-tracked-wallets") || "[]");
      if (Array.isArray(saved)) setList(saved.filter((s): s is string => {
        if (typeof s !== "string") return false;
        try { assertPreprodPaymentAddress(s); return true; } catch { return false; }
      }).slice(0, 5));
    } catch { /* Invalid local state is discarded. */ }
    setReady(true);
  }, []);

  const chooseAddress = useCallback((value: string) => {
    const verified = assertPreprodPaymentAddress(value.trim());
    setAddress(verified);
    window.localStorage.setItem("symbiotic-v2-last-preprod-address", verified);
    setError("");
  }, []);

  const refresh = useCallback(() => setRefreshCounter(x => x + 1), []);

  useEffect(() => {
    if (!ready || !address) { setPortfolio(null); return; }
    let cancelled = false;
    setPortfolio(null);
    setChecking(true); setError("");
    (async () => {
      try {
        const response = await fetch("/api/portfolio?address=" + encodeURIComponent(address), { cache: "no-store" });
        const data: PortfolioObservation & ResponseError = await response.json();
        if (!response.ok) throw new Error(data.error || "Portfolio provider unavailable");
        if (!cancelled) setPortfolio(data);
      } catch (issue) {
        if (!cancelled) setError(errorMessage(issue));
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, address, refreshCounter]);

  useEffect(() => {
    if (view !== "earn") return;
    let cancelled = false;
    setVault(null); setVaultError("");
    (async () => {
      try {
        const response = await fetch("/api/earn", { cache: "no-store" });
        const body: VaultObservation & ResponseError = await response.json();
        if (!response.ok) throw new Error(body.error || "Vault observer unavailable");
        if (!cancelled) setVault(body);
      } catch (issue) {
        if (!cancelled) setVaultError(errorMessage(issue));
      }
    })();
    return () => { cancelled = true; };
  }, [view, refreshCounter]);

  useEffect(() => {
    if (view !== "stats") return;
    let cancelled = false;
    setNetwork(null); setNetworkError("");
    (async () => {
      try {
        const response = await fetch("/api/stats", { cache: "no-store" });
        const body: NetworkObservation & ResponseError = await response.json();
        if (!response.ok) throw new Error(body.error || "Network index unavailable");
        if (!cancelled) setNetwork(body);
      } catch (issue) {
        if (!cancelled) setNetworkError(errorMessage(issue));
      }
    })();
    return () => { cancelled = true; };
  }, [view, refreshCounter]);

  useEffect(() => {
    if (!ready || view !== "stats" || !list.length) { setLeaderboard(null); return; }
    let cancelled = false;
    setLeaderboard(null); setLeaderboardError("");
    (async () => {
      try {
        const params = new URLSearchParams();
        list.forEach(s => params.append("address", s));
        const response = await fetch("/api/leaderboard?" + params, { cache: "no-store" });
        const body: ObservedLeaderboard & ResponseError = await response.json();
        if (!response.ok) throw new Error(body.error || "Tracked leaderboard unavailable");
        if (!cancelled) setLeaderboard(body);
      } catch (issue) {
        if (!cancelled) setLeaderboardError(errorMessage(issue));
      }
    })();
    return () => { cancelled = true; };
  }, [ready, view, list, refreshCounter]);

  async function connect() {
    if (!walletChoice || connecting) return;
    setConnecting(true); setError("");
    try {
      const wallet = await BrowserWallet.enable(walletChoice);
      if ((await wallet.getNetworkId()) !== 0) throw new Error("Set wallet network to Cardano Preprod, not Mainnet");
      const walletAddress = assertPreprodPaymentAddress(await wallet.getChangeAddress());
      const utxos: UTxO[] = await wallet.getUtxos() || [];
      if (!utxos.length) throw new Error("Fund your Cardano Preprod wallet with test ADA before connecting");
      const response = await fetch("/api/rwa/preflight", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utxoRefs: utxos.slice(0, 3).map(u => u.input.txHash + "#" + u.input.outputIndex) }),
      });
      const result: ResponseError & { verified?: boolean } = await response.json();
      if (!response.ok || !result.verified) throw new Error(result.error || "Wallet UTxOs could not be verified on Preprod");
      chooseAddress(walletAddress);
      setWalletConnected(true);
      refresh();
    } catch (issue) { setError(errorMessage(issue)); }
    finally { setConnecting(false); }
  }

  function inspect() {
    try { chooseAddress(manualAddress); setWalletConnected(false); }
    catch (issue) { setError(errorMessage(issue)); }
  }

  function saveList(next: string[]) {
    setList(next);
    window.localStorage.setItem("symbiotic-v2-tracked-wallets", JSON.stringify(next));
  }

  function track(value: string) {
    try {
      const next = assertPreprodPaymentAddress(value.trim());
      if (list.includes(next)) throw new Error("Wallet is already on your local watchlist");
      if (list.length >= 5) throw new Error("Track a maximum of five public Preprod addresses");
      saveList([...list, next]);
      setCandidate(""); setLeaderboardError("");
    } catch (issue) { setLeaderboardError(errorMessage(issue)); }
  }

  const items = useMemo(() => {
    if (!portfolio) return [];
    return portfolio.assets
      .filter(a => a.unit !== "lovelace")
      .sort((a, b) => a.unit.localeCompare(b.unit))
      .slice(0, 15);
  }, [portfolio]);

  const vaultNotReady = "Deposits, withdrawals and guaranteed yield are disabled until a reviewed vault contract, redemption path, and verified Preprod lifecycle exist.";
  const subtitle = view === "portfolio" ? "NON-CUSTODIAL PORTFOLIO"
    : view === "earn" ? "VAULT & EARN / SAFETY FIRST"
      : "STATS / LEADERBOARD / ANALYTICS";

  return <main className={styles.root}>
    <header className={styles.top}>
      <Link href="/" className={styles.logo}><span>S</span><b>SYMBIOTIC</b><small>V2</small></Link>
      <nav aria-label="Symbiotic navigation">
        <Link href="/trade">TRADE</Link><Link href="/rwa">RWA</Link><Link href="/folder">FOLDER</Link>
        <Link href="/portfolio" className={view === "portfolio" ? styles.selected : ""}>PORTFOLIO</Link>
        <Link href="/earn" className={view === "earn" ? styles.selected : ""}>VAULT & EARN</Link>
        <Link href="/stats" className={view === "stats" ? styles.selected : ""}>STATS</Link>
      </nav>
      <span className={styles.networkBadge}>● PREPROD</span>
    </header>
    <div className={styles.context}><span>SYMBIOTIC / CARDANO / {subtitle}</span><span>OBSERVED DATA · NO MOCK RETURNS</span></div>

    <section className={styles.titleRow}>
      <div>
        <span className={styles.overline}>{subtitle}</span>
        <h1>{view === "portfolio" ? <>YOUR ASSETS.<br/><em>YOUR CONTROL.</em></>
          : view === "earn" ? <>VAULTS.<br/><em>EARN WITH PROOF.</em></>
          : <>EVERY METRIC.<br/><em>ACCOUNTABLE.</em></>}</h1>
        <p>{view === "portfolio"
          ? "Read actual Preprod wallet holdings, staking rewards, native assets and confirmed transaction activity. No synthetic USD balances."
          : view === "earn"
            ? "Inspect protocol collateral-script balances and any confirmed Cardano stake rewards. Deposits and earning strategies remain disabled until redemption is proven."
            : "Follow confirmed Cardano Preprod network metrics, a locally curated address leaderboard and actual wallet activity. No fabricated volume or PnL."}</p>
      </div>
      <div className={styles.heroStatus}>
        <span>LIVE INDEXER STATUS</span>
        <strong>{checking ? "INDEXING WALLET…" : error ? "DATA UNAVAILABLE" : portfolio ? "PREPROD OBSERVED" : "AWAITING ADDRESS"}</strong>
        <small>Preprod Blockfrost · server-side credential</small>
        <button type="button" onClick={refresh} className={styles.outline}>↻ REFRESH DATA</button>
      </div>
    </section>

    <section className={styles.connectPanel}>
      <div className={styles.connectHeading}><span>01 / OBSERVE WALLET</span><b>{address ? shortAddress(address, 20) : "NO ADDRESS SELECTED"}</b><small>{walletConnected ? "CIP-30 WALLET VERIFIED ON PREPROD" : address ? "READ-ONLY ADDRESS OBSERVATION" : "CONNECT OR ENTER A PUBLIC PREPROD ADDRESS"}</small></div>
      <div className={styles.connectControls}>
        <select value={walletChoice} onChange={e => setWalletChoice(e.target.value)} aria-label="Wallet to connect" disabled={connecting}>{wallets.length ? wallets.map(name => <option key={name} value={name}>{name.toUpperCase()}</option>) : <option value="">NO CIP-30 WALLET</option>}</select>
        <button className={styles.primary} onClick={() => void connect()} disabled={!walletChoice || connecting}>{connecting ? "VERIFYING…" : "CONNECT WALLET ↗"}</button>
      </div>
      <div className={styles.manualControls}><input aria-label="Public Cardano Preprod address" value={manualAddress} onChange={e => setManualAddress(e.target.value.trim())} placeholder="Or inspect an addr_test1… address" /><button className={styles.outline} type="button" onClick={inspect}>INSPECT</button></div>
      <RenderError message={error}/>
    </section>

    {view === "portfolio" ? <>
      <PreprodPositions address={address} refreshCounter={refreshCounter}/>
      <div className={styles.metrics}>
        <Metric label="ADA (TESTNET)" value={portfolio ? formatAda(portfolio.adaLovelace) + " ₳" : "—"} subtitle="ADDRESS BALANCE · NOT USD" />
        <Metric label="NATIVE TOKEN TYPES" value={portfolio ? compact(portfolio.nativeAssetTypes) : "—"} subtitle="NONZERO TOKENS AT ADDRESS" />
        <Metric label="ADDRESS TRANSACTIONS" value={portfolio ? compact(portfolio.transactionCount) : "—"} subtitle="INDEXED HISTORIC COUNT" />
        <Metric label="STAKING REWARDS AVAILABLE" value={portfolio?.staking ? formatAda(portfolio.staking.withdrawableLovelace) + " ₳" : "—"} subtitle="ACTUAL REWARD ACCOUNT · IF ACTIVE" />
      </div>
      <div className={styles.columns}>
        <section className={styles.panel}><div className={styles.panelTitle}><span>02 / ASSET ALLOCATION</span><b>ONCHAIN HOLDINGS</b></div>
          {!portfolio ? <div className={styles.empty}>Connect or inspect a Preprod wallet to load real balances.</div>
            : <>
              <div className={styles.allocation}>
                <div><span>ADA TESTNET</span><strong>{formatAda(portfolio.adaLovelace)} ₳</strong></div>
                <div><span>NATIVE ASSET TYPES</span><strong>{portfolio.nativeAssetTypes}</strong></div>
              </div>
              <p className={styles.caption}>ADA and tokens have different units and cannot be combined into a meaningful USD allocation without verified pricing.</p>
              <div className={styles.tableScroll}><table><thead><tr><th>ASSET UNIT</th><th>RAW QUANTITY</th><th>REFERENCE</th></tr></thead><tbody>
                {items.map(asset => <tr key={asset.unit}><td title={asset.unit}><code>{truncHash(asset.unit)}</code></td><td>{asset.quantity}</td><td><a target="_blank" rel="noreferrer" href={"https://preprod.cardanoscan.io/token/" + asset.unit}>EXPLORER ↗</a></td></tr>)}
                {!items.length ? <tr><td colSpan={3}>No non-ADA assets found at this address.</td></tr> : null}
              </tbody></table></div>
              {portfolio.nativeAssetTypes > 15 ? <p className={styles.caption}>Showing first 15 of {portfolio.nativeAssetTypes} token types.</p> : null}
            </>}
        </section>
        <section className={styles.panel}><div className={styles.panelTitle}><span>03 / RECENT ACTIVITY</span><b>CONFIRMED TRANSACTIONS</b></div>
          {!portfolio ? <div className={styles.empty}>No wallet activity loaded.</div> : <>
            <DataBarChart data={portfolio.activity} annotation={portfolio.activityWindowNote} />
            <div className={styles.recentList}>{portfolio.recentTransactions.length ? portfolio.recentTransactions.map(tx => <a key={tx.hash} target="_blank" rel="noreferrer" href={txUrl(tx.hash)}><span><b>{truncHash(tx.hash)}</b><small>{friendlyDate(tx.time)}</small></span><span>VIEW ↗</span></a>) : <div className={styles.empty}>No indexed transactions.</div>}</div>
          </>}
        </section>
      </div>
      <section className={styles.footerPanel}><div><span>VAULTS & REWARDS</span><h2>Put every ADA to work?<br/><em>Only with verified contracts.</em></h2><p>Explore actual staking balances and our upcoming vault proof framework. We won't present synthetic yield as real income.</p></div><Link className={styles.primary} href="/earn">OPEN VAULT & EARN ↗</Link></section>
    </> : null}

    {view === "earn" ? <>
      <div className={styles.metrics}>
        <Metric label="CONFIRMED REWARDS EARNED" value={portfolio?.staking ? formatAda(portfolio.staking.earnedLovelace) + " ₳" : "—"} subtitle="CUMULATIVE STAKE REWARDS · TESTNET" />
        <Metric label="WITHDRAWABLE STAKE REWARDS" value={portfolio?.staking ? formatAda(portfolio.staking.withdrawableLovelace) + " ₳" : "—"} subtitle="INDEXED REWARD ACCOUNT" />
        <Metric label="DELEGATION" value={portfolio?.staking ? portfolio.staking.active ? "ACTIVE" : "INACTIVE" : "—"} subtitle="CARDANO STAKE ACCOUNT" />
        <Metric label="VAULT YIELD / APY" value="NOT LIVE" subtitle="NO PROMISED REWARD RATE" />
      </div>
      <div className={styles.columns}>
        <section className={styles.panel}><div className={styles.panelTitle}><span>02 / PROTOCOL VAULT OBSERVER</span><b>PERPETUAL COLLATERAL SCRIPT</b></div>
          <h2>Collateral UTxOs.<br/><em>Direct from Preprod.</em></h2>
          <p className={styles.paragraph}>This is a view of an existing Symbiotic perpetual script, not a separate yield vault or an account-specific deposit balance.</p>
          <RenderError message={vaultError}/>
          {vault ? <>
            <div className={styles.allocation}>
              <div><span>SCRIPT ADA (TESTNET)</span><strong>{formatAda(vault.adaLovelace)} ₳</strong></div>
              <div><span>SCRIPT sUSD BASE UNITS</span><strong>{vault.stableCollateralBaseUnits}</strong></div>
            </div>
            <div className={styles.detail}><span>VALIDATOR HASH</span><code>{vault.scriptHash}</code></div>
            <div className={styles.detail}><span>SCRIPT ADDRESS</span><code>{vault.scriptAddress}</code></div>
            <div className={styles.detail}><span>INDEXED TRANSACTIONS</span><b>{compact(vault.transactionCount)}</b></div>
            <a className={styles.external} href={refUrl(vault.scriptAddress)} target="_blank" rel="noreferrer">VIEW SCRIPT ON CARDANOSCAN ↗</a>
            <p className={styles.caption}>{vault.note}</p>
          </> : !vaultError ? <div className={styles.empty}>Loading collateral script UTxOs from Cardano Preprod…</div> : null}
          <div className={styles.lockedActions}><button disabled title={vaultNotReady}>DEPOSIT INTO VAULT — DISABLED</button><button disabled title={vaultNotReady}>WITHDRAW — DISABLED</button></div>
          <p className={styles.safety}>{vaultNotReady}</p>
        </section>
        <section className={styles.panel}><div className={styles.panelTitle}><span>03 / NATIVE CARDANO EARN</span><b>STAKING REWARD ACCOUNT</b></div>
          <h2>Measured rewards.<br/><em>Not promised APY.</em></h2>
          {portfolio?.staking ? <>
            <div className={styles.detail}><span>POOL ID</span><code>{portfolio.staking.poolId || "NOT DELEGATED"}</code></div>
            <div className={styles.detail}><span>CUMULATIVE REWARDS</span><b>{formatAda(portfolio.staking.earnedLovelace)} TEST ADA</b></div>
            <div className={styles.detail}><span>REWARDS WITHDRAWN</span><b>{formatAda(portfolio.staking.withdrawnLovelace)} TEST ADA</b></div>
            <div className={styles.detail}><span>AVAILABLE REWARDS</span><b>{formatAda(portfolio.staking.withdrawableLovelace)} TEST ADA</b></div>
            <div className={styles.detail}><span>DELEGATED STAKE</span><b>{formatAda(portfolio.staking.controlledLovelace)} TEST ADA</b></div>
            {portfolio.staking.stakeAddress ? <a className={styles.external} target="_blank" rel="noreferrer" href={"https://preprod.cardanoscan.io/stakeKey/" + portfolio.staking.stakeAddress}>VIEW STAKE ACCOUNT ↗</a> : null}
          </> : <div className={styles.empty}>{address ? "No active or indexed staking account associated with this payment address." : "Connect or inspect a Preprod address to view observed staking rewards."}</div>}
          <p className={styles.caption}>These are Cardano protocol staking rewards, not revenue produced by Symbiotic. Reward accounts can cover multiple payment addresses; figures may exceed this address's ADA balance.</p>
          <button className={styles.disabled} disabled>DELEGATE / CLAIM VIA SYMBIOTIC — NOT ENABLED</button>
        </section>
      </div>
      <section className={styles.footerPanel}><div><span>VAULT SAFETY STANDARD</span><h2>Escrow isn't earning.<br/><em>Withdrawal matters.</em></h2><p>Future active vaults require audited validators, enforced share accounting, solvency, redemption, emergency controls and a demonstrated full Preprod deposit-to-withdrawal cycle.</p></div><Link className={styles.outline} href="/portfolio">VIEW PORTFOLIO ↗</Link></section>
    </> : null}

    {view === "stats" ? <>
      <PreprodProtocolActivity />
      <div className={styles.metrics}>
        <Metric label="PREPROD BLOCK HEIGHT" value={network ? compact(network.latestBlock.height) : "—"} subtitle="LATEST INDEXED BLOCK" />
        <Metric label="CURRENT EPOCH" value={network ? compact(network.epoch.number) : "—"} subtitle="CARDANO PREPROD NETWORK" />
        <Metric label="EPOCH TRANSACTIONS" value={network ? compact(network.epoch.transactionCount) : "—"} subtitle="NETWORK-WIDE, NOT SYMBIOTIC VOLUME" />
        <Metric label="TRACKED ADDRESSES" value={String(list.length)} subtitle="YOUR LOCAL OPT-IN WATCHLIST" />
      </div>
      <RenderError message={networkError}/>
      <div className={styles.columns}>
        <section className={styles.panel}><div className={styles.panelTitle}><span>02 / LEADERBOARD</span><b>VERIFIED WALLET ACTIVITY</b></div>
          <h2>Rank what we<br/><em>can prove.</em></h2>
          <p className={styles.paragraph}>Add up to five public Preprod addresses to your private browser watchlist. Ranking is based on their observed historical transaction counts — not trading PnL or a global users chart.</p>
          <div className={styles.addWatch}><input aria-label="Add watched address" value={candidate} onChange={e => setCandidate(e.target.value.trim())} placeholder="addr_test1… public payment address"/><button className={styles.primary} onClick={() => track(candidate)} disabled={list.length >= 5}>ADD ↗</button></div>
          {address && !list.includes(address) ? <button className={styles.inlineButton} onClick={() => track(address)}>+ ADD CURRENT ADDRESS TO LEADERBOARD</button> : null}
          <RenderError message={leaderboardError}/>
          <div className={styles.tableScroll}><table><thead><tr><th>#</th><th>PREPROD ADDRESS</th><th>TXS</th><th>TEST ADA</th><th></th></tr></thead><tbody>
            {leaderboard?.rows.map((row, i) => <tr key={row.address}><td className={styles.rank}>{String(i+1).padStart(2,"0")}</td><td title={row.address}><code>{shortAddress(row.address, 10)}</code></td><td>{compact(row.txCount)}</td><td>{formatAda(row.lovelace)}</td><td><button className={styles.remove} type="button" aria-label={"Remove " + row.address} onClick={() => saveList(list.filter(x => x !== row.address))}>×</button></td></tr>)}
            {!leaderboard?.rows.length ? <tr><td colSpan={5}>{list.length ? "Querying verified wallet records…" : "No leaderboard yet. Add a real Preprod address to begin."}</td></tr> : null}
          </tbody></table></div>
          {leaderboard ? <p className={styles.caption}>{leaderboard.methodology}</p> : null}
        </section>
        <section className={styles.panel}><div className={styles.panelTitle}><span>03 / ANALYTICS</span><b>BLOCKCHAIN OBSERVATIONS</b></div>
          <h2>Follow activity.<br/><em>Never fake volume.</em></h2>
          {portfolio ? <DataBarChart data={portfolio.activity} annotation={portfolio.activityWindowNote} /> : <div className={styles.empty}>Select a wallet above to see confirmed transaction history by day.</div>}
          {network ? <>
            <div className={styles.detail}><span>LAST BLOCK</span><code>{truncHash(network.latestBlock.hash)}</code></div>
            <div className={styles.detail}><span>BLOCK TIME</span><b>{friendlyDate(network.latestBlock.time)}</b></div>
            <div className={styles.detail}><span>TRANSACTIONS IN LAST BLOCK</span><b>{compact(network.latestBlock.txCount)}</b></div>
            <div className={styles.detail}><span>EPOCH BLOCK COUNT</span><b>{compact(network.epoch.blockCount)}</b></div>
            <p className={styles.caption}>{network.note}</p>
          </> : <div className={styles.empty}>{networkError || "Loading Preprod network observations…"}</div>}
        </section>
      </div>
      <section className={styles.footerPanel}><div><span>INTEGRITY / INDEXER-BASED METRICS</span><h2>No made-up TVL.<br/><em>No fictional traders.</em></h2><p>Protocol-wide volume, trader PnL, ROI, APY and unique-user leaderboards will only appear after an independently verifiable indexer and settlement accounting exist.</p></div><Link className={styles.outline} href="/portfolio">VIEW WALLET ↗</Link></section>
    </> : null}
    <footer className={styles.footer}><span>SYMBIOTIC V2 / CARDANO PREPROD</span><span>{portfolio ? "WALLET OBSERVED " + friendlyDate(portfolio.observedAt) : "AWAITING WALLET DATA"}</span><a href="https://github.com/mushee-io/Symbiotic-v2" target="_blank" rel="noreferrer">VIEW CODE ↗</a></footer>
  </main>;
}

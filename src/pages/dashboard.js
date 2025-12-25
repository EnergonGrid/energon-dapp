// src/pages/dashboard.js
import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import Nav from "../components/Nav";
import {
  ABI,
  CONTRACT_ADDRESS,
  MAINNET_CHAIN_ID,
  MAINNET_HEX,
  NETWORK_NAME,
  RPCS,
} from "../lib/contract";

/**
 * ✅ Mainnet contracts (locked)
 */
const EON_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";

// Minimal ABIs (dashboard only)
const CONTROLLER_ABI = [
  "function energonHeight() view returns (uint256)",
  "function secondsUntilNextEnergonBlock() view returns (uint256)",
  "function tickEnergon() external",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export default function Dashboard() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState(
    "Ready. (Connect wallet for eligibility + balances)"
  );

  const [totalMinted, setTotalMinted] = useState("-");
  const [cubeBal, setCubeBal] = useState("-");
  const [eligibleText, setEligibleText] = useState("-");
  const [tokenUri, setTokenUri] = useState("-");

  const [eonBal, setEonBal] = useState("-");

  // Controller-driven stats
  const [controllerAddr, setControllerAddr] = useState("-");
  const [energonHeight, setEnergonHeight] = useState("-");
  const [secondsUntilNext, setSecondsUntilNext] = useState("-");
  const [tickAllowed, setTickAllowed] = useState(false);

  // Tick UX
  const [autoTickOn, setAutoTickOn] = useState(false); // default OFF
  const [isTicking, setIsTicking] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [lastTickTx, setLastTickTx] = useState("");

  // Auto-tick backoff (guardrail)
  const [backoffMs, setBackoffMs] = useState(0);
  const backoffRef = useRef(0);

  /**
   * ✅ FINAL GUARDRAIL: only allow ONE tick per height change
   */
  const lastTickHeightRef = useRef(null);

  /**
   * ✅ FIX: keep the latest connected wallet for periodic refresh
   * (prevents cubeBal/eligibility from resetting to "-" due to stale closure)
   */
  const accountRef = useRef("");
  useEffect(() => {
    accountRef.current = account || "";
  }, [account]);

  const roProvider = useMemo(() => {
    return new ethers.JsonRpcProvider(RPCS[MAINNET_CHAIN_ID]);
  }, []);

  const shortAddr = (a) =>
    a ? `${a.slice(0, 6)}…${a.slice(a.length - 4)}` : "-";
  const chainOk = Number(chainId) === MAINNET_CHAIN_ID;

  function tile(label, value, extra = null) {
    return (
      <div style={styles.tile}>
        <div style={styles.tileLabel}>{label}</div>
        <div style={styles.tileValue}>{value}</div>
        {extra}
      </div>
    );
  }

  // -----------------------------------------
  // Helpers (tick guardrails)
  // -----------------------------------------

  function setCooldown(seconds) {
    setCooldownLeft(Math.max(0, Number(seconds || 0)));
  }

  function lockTickForAllTabs(seconds = 45) {
    try {
      const until = Date.now() + seconds * 1000;
      localStorage.setItem("energon_tick_lock_until", String(until));
      return until;
    } catch {
      return 0;
    }
  }

  function isTickLocked() {
    try {
      const v = localStorage.getItem("energon_tick_lock_until") || "0";
      return Date.now() < Number(v);
    } catch {
      return false;
    }
  }

  function bumpBackoff() {
    const next =
      backoffRef.current === 0
        ? 15000
        : Math.min(backoffRef.current * 2, 120000);
    backoffRef.current = next;
    setBackoffMs(next);
    return next;
  }

  function clearBackoff() {
    backoffRef.current = 0;
    setBackoffMs(0);
  }

  function parseHeight(h) {
    const n = Number(String(h));
    return Number.isFinite(n) ? n : null;
  }

  function alreadyTickedThisHeight(currentHeight) {
    const h = parseHeight(currentHeight);
    if (h === null) return false;
    return lastTickHeightRef.current === h;
  }

  function markTickHeight(currentHeight) {
    const h = parseHeight(currentHeight);
    if (h === null) return;
    lastTickHeightRef.current = h;
  }

  // -----------------------------------------
  // Network + wallet
  // -----------------------------------------

  async function switchToMainnet() {
    if (!window.ethereum) return setStatus("MetaMask not found");

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MAINNET_HEX }],
      });
      setStatus("Switched to Flare Mainnet ✅");
      await refreshRead(null, accountRef.current);
    } catch (err) {
      if (err?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: MAINNET_HEX,
                chainName: NETWORK_NAME,
                nativeCurrency: { name: "Flare", symbol: "FLR", decimals: 18 },
                rpcUrls: [RPCS[MAINNET_CHAIN_ID]],
              },
            ],
          });
          setStatus("Added + switched to Flare Mainnet ✅");
          await refreshRead(null, accountRef.current);
        } catch (e2) {
          setStatus(e2?.message || "Failed to add chain");
        }
      } else {
        setStatus(err?.message || "Failed to switch chain");
      }
    }
  }

  async function connectWallet() {
    if (!window.ethereum) return setStatus("MetaMask not found");

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const net = await browserProvider.getNetwork();
      setChainId(Number(net.chainId));

      if (Number(net.chainId) !== MAINNET_CHAIN_ID) {
        setStatus(`Wrong network. Click "Switch to ${NETWORK_NAME}".`);
        return;
      }

      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const addr = accounts?.[0] || "";

      // ✅ set ref immediately
      accountRef.current = addr;

      setAccount(addr);
      setStatus("Connected ✅");
      await refreshRead(browserProvider, addr);
    } catch (e) {
      setStatus(e?.message || "Connect failed");
    }
  }

  // -----------------------------------------
  // Reads (no cron dependency)
  // -----------------------------------------

  async function refreshRead(optionalProvider = null, optionalAccount = null) {
    try {
      const providerToUse = optionalProvider || roProvider;
      const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, providerToUse);

      // totalMinted
      try {
        const tm = await cube.totalMinted();
        setTotalMinted(tm.toString());
      } catch {
        setTotalMinted("-");
      }

      // controller address
      let ctrl = null;
      try {
        ctrl = await cube.controller();
        setControllerAddr(ctrl);
      } catch {
        ctrl = null;
        setControllerAddr("-");
      }

      // Controller reads: height + timer
      if (ctrl && ctrl !== ethers.ZeroAddress) {
        const controller = new ethers.Contract(
          ctrl,
          CONTROLLER_ABI,
          providerToUse
        );

        // height
        try {
          const h = await controller.energonHeight();
          const hs = h.toString();
          setEnergonHeight(hs);
        } catch {
          setEnergonHeight("-");
        }

        // seconds until next
        try {
          const s = await controller.secondsUntilNextEnergonBlock();
          const sec = Number(s.toString());
          setSecondsUntilNext(String(sec));
          setTickAllowed(sec === 0);
        } catch {
          setSecondsUntilNext("-");
          setTickAllowed(false);
        }
      } else {
        setEnergonHeight("-");
        setSecondsUntilNext("-");
        setTickAllowed(false);
      }

      // Wallet-specific
      const acct = optionalAccount || accountRef.current || account;

      if (acct) {
        try {
          const bal = await cube.balanceOf(acct);
          const n = Number(bal.toString());
          setCubeBal(String(n));
          if (n === 1) setEligibleText("Eligible ✅ (Exactly 1 Cube)");
          else setEligibleText(`Not eligible ❌ (${n} Cubes)`);
        } catch {
          // ✅ don’t clear on transient RPC errors; keep last-known values
          // (comment these out to keep stable display)
          // setCubeBal("-");
          // setEligibleText("-");
        }

        try {
          const uri = await cube.tokenURI(1);
          setTokenUri(uri);
        } catch {
          setTokenUri("-");
        }

        // EON balance
        try {
          const eon = new ethers.Contract(EON_ADDRESS, ERC20_ABI, providerToUse);
          let decimals = 18;
          try {
            decimals = Number(await eon.decimals());
          } catch {}
          const raw = await eon.balanceOf(acct);
          setEonBal(`${ethers.formatUnits(raw, decimals)} EON`);
        } catch {
          // ✅ don’t clear on transient RPC errors
          // setEonBal("-");
        }
      } else {
        // no wallet connected
        setCubeBal("-");
        setEligibleText("-");
        setEonBal("-");
      }

      // Update chainId if wallet exists
      if (window.ethereum) {
        const bp =
          optionalProvider || new ethers.BrowserProvider(window.ethereum);
        const n = await bp.getNetwork();
        setChainId(Number(n.chainId));
      }
    } catch (e) {
      setStatus(e?.message || "Unable to read contract");
    }
  }

  // -----------------------------------------
  // Manual tick (with guardrails + FINAL GUARDRAIL)
  // -----------------------------------------

  async function manualTick() {
    if (!window.ethereum) return setStatus("MetaMask not found");
    if (!accountRef.current) return setStatus("Connect wallet first");
    if (!chainOk) return setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
    if (isTicking) return;
    if (cooldownLeft > 0) return setStatus(`Cooldown: wait ${cooldownLeft}s`);
    if (isTickLocked())
      return setStatus("Tick locked (another tab / recent tick). Try again soon.");

    if (!tickAllowed) {
      return setStatus("Tick not allowed yet. Wait for Next Block to reach 0 sec.");
    }

    if (alreadyTickedThisHeight(energonHeight)) {
      return setStatus(
        `Already ticked at height ${energonHeight}. Waiting for height to change…`
      );
    }

    try {
      setIsTicking(true);
      setStatus("Submitting tick…");

      lockTickForAllTabs(45);
      setCooldown(20);

      markTickHeight(energonHeight);

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();

      const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const ctrl = await cube.controller();
      const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, signer);

      const tx = await controller.tickEnergon();
      setLastTickTx(tx.hash);
      setStatus(`Tick submitted: ${tx.hash}`);

      await tx.wait();
      clearBackoff();
      setStatus("Tick confirmed ✅");

      await refreshRead(browserProvider, accountRef.current);
    } catch (e) {
      const msg = e?.shortMessage || e?.message || "Tick failed";
      setStatus(msg);
      bumpBackoff();
    } finally {
      setIsTicking(false);
    }
  }

  // -----------------------------------------
  // Auto-tick loop (safe + FINAL GUARDRAIL)
  // -----------------------------------------
  useEffect(() => {
    let stopped = false;

    async function loop() {
      if (stopped) return;

      const acct = accountRef.current;

      if (!autoTickOn || !window.ethereum || !acct || !chainOk) return;
      if (isTicking || cooldownLeft > 0 || isTickLocked() || backoffRef.current > 0) return;
      if (!tickAllowed) return;
      if (alreadyTickedThisHeight(energonHeight)) return;

      try {
        setIsTicking(true);
        setStatus("Auto-tick: submitting…");

        lockTickForAllTabs(45);
        setCooldown(20);
        markTickHeight(energonHeight);

        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await browserProvider.getSigner();

        const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        const ctrl = await cube.controller();
        const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, signer);

        const tx = await controller.tickEnergon();
        setLastTickTx(tx.hash);
        setStatus(`Auto-tick submitted: ${tx.hash}`);
        await tx.wait();

        clearBackoff();
        setStatus("Auto-tick confirmed ✅");
        await refreshRead(browserProvider, acct);
      } catch (e) {
        const msg = e?.shortMessage || e?.message || "Auto-tick failed";
        setStatus(msg);
        bumpBackoff();
      } finally {
        setIsTicking(false);
      }
    }

    const interval = setInterval(loop, 6000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTickOn, chainOk, tickAllowed, isTicking, cooldownLeft, energonHeight]);

  // Backoff countdown
  useEffect(() => {
    if (backoffMs <= 0) return;
    const t = setInterval(() => {
      backoffRef.current = Math.max(0, backoffRef.current - 1000);
      setBackoffMs(backoffRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [backoffMs]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      setCooldownLeft((s) => Math.max(0, Number(s) - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  // ✅ Periodic refresh (FIXED: always uses latest account)
  useEffect(() => {
    refreshRead(null, accountRef.current);

    const t = setInterval(() => {
      refreshRead(null, accountRef.current);
    }, 8000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wallet listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const onChainChanged = () => window.location.reload();
    const onAccountsChanged = () => window.location.reload();

    window.ethereum.on("chainChanged", onChainChanged);
    window.ethereum.on("accountsChanged", onAccountsChanged);

    return () => {
      window.ethereum.removeListener("chainChanged", onChainChanged);
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
    };
  }, []);

  function tickBadge() {
    if (secondsUntilNext === "-") {
      return (
        <span style={{ ...styles.badge, ...styles.badgeUnknown }}>UNKNOWN</span>
      );
    }
    if (tickAllowed) {
      if (alreadyTickedThisHeight(energonHeight)) {
        return (
          <span style={{ ...styles.badge, ...styles.badgeWait }}>
            WAITING (height update)
          </span>
        );
      }
      return <span style={{ ...styles.badge, ...styles.badgeOk }}>TICK ALLOWED</span>;
    }
    return (
      <span style={{ ...styles.badge, ...styles.badgeWait }}>
        NOT ALLOWED ({secondsUntilNext}s)
      </span>
    );
  }

  return (
    <div style={styles.page}>
      <Nav />

      <div style={styles.wrap}>
        <h1 style={styles.h1}>Dashboard</h1>

        <div style={styles.btnRow}>
          {!account ? (
            <button style={styles.btn} onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div style={styles.connectedPill}>Connected: {shortAddr(account)}</div>
          )}

          {!chainOk ? (
            <button style={styles.btnSecondary} onClick={switchToMainnet}>
              Switch to {NETWORK_NAME}
            </button>
          ) : null}

          <button style={styles.btn} onClick={() => refreshRead(null, accountRef.current)}>
            Refresh
          </button>

          <button
            style={{
              ...styles.btnPrimary,
              opacity: !account || !chainOk ? 0.5 : 1,
            }}
            onClick={() => setAutoTickOn((v) => !v)}
            disabled={!account || !chainOk}
            title="Auto-tick only attempts when Next Block reaches 0 and guardrails allow."
          >
            Auto-tick: {autoTickOn ? "ON" : "OFF"}
          </button>

          <button
            style={{
              ...styles.btnPrimary,
              opacity:
                !account ||
                !chainOk ||
                !tickAllowed ||
                isTicking ||
                cooldownLeft > 0 ||
                alreadyTickedThisHeight(energonHeight)
                  ? 0.55
                  : 1,
            }}
            onClick={manualTick}
            disabled={
              !account ||
              !chainOk ||
              !tickAllowed ||
              isTicking ||
              cooldownLeft > 0 ||
              alreadyTickedThisHeight(energonHeight)
            }
            title="Manual tick spends gas. Enabled only when Next Block is 0 sec (and only once per height)."
          >
            {isTicking
              ? "Ticking…"
              : cooldownLeft > 0
              ? `Cooldown ${cooldownLeft}s`
              : alreadyTickedThisHeight(energonHeight)
              ? "Waiting…"
              : "Manual Tick"}
          </button>
        </div>

        <div style={styles.subLine}>
          {tickBadge()}{" "}
          <span style={{ opacity: 0.85 }}>
            {backoffMs > 0 ? `Backoff: ${Math.ceil(backoffMs / 1000)}s` : ""}
            {lastTickTx ? `  • Last tick tx: ${shortAddr(lastTickTx)}` : ""}
          </span>
        </div>

        <div style={styles.grid3}>
          {tile("Contract", shortAddr(CONTRACT_ADDRESS))}
          {tile("Chain ID", chainOk ? `14 (OK ✅)` : `${chainId || "-"} (Wrong ❌)`)}
          {tile("Total Minted", totalMinted)}

          {tile("Your Cube Balance", cubeBal)}
          {tile("Eligibility", eligibleText)}
          {tile("Energon Height", energonHeight)}

          {tile(
            "Next Block (sec)",
            secondsUntilNext,
            <div style={{ marginTop: 8 }}>{tickBadge()}</div>
          )}

          <div style={styles.tile}>
            <div style={styles.tileLabel}>Energon Token (EON)</div>
            <div style={styles.eonRow}>
              <img
                src="https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafybeiccfdp4aez6gqva5yx5cmixc7dugqxl6eee5nhb54sdhpnidpmt7u"
                alt="EON"
                style={styles.eonIcon}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>EON</div>
                <div style={{ opacity: 0.9, marginTop: 2 }}>
                  Your Balance: {eonBal}
                </div>
              </div>
            </div>
          </div>

          {tile("Controller", controllerAddr === "-" ? "-" : shortAddr(controllerAddr))}
        </div>

        <div style={styles.uriBox}>
          <div style={styles.uriLabel}>Token #1 URI</div>
          <div style={styles.uriValue}>{tokenUri}</div>
        </div>

        <div style={styles.status}>Status: {status}</div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 30% 10%, #1b2a5a 0%, #05060b 55%, #000 100%)",
    color: "#fff",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },
  wrap: { maxWidth: 980, margin: "0 auto", padding: "30px 18px 60px" },
  h1: { fontSize: 48, margin: "0 0 10px", letterSpacing: 0.3 },
  btnRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  subLine: { marginBottom: 10, fontSize: 13, opacity: 0.95 },

  btn: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "rgba(80,180,255,0.16)",
    border: "1px solid rgba(80,180,255,0.28)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
  },
  btnPrimary: {
    background: "rgba(80,180,255,0.22)",
    border: "1px solid rgba(80,180,255,0.35)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
  },
  connectedPill: {
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "10px 12px",
    borderRadius: 999,
    fontSize: 13,
    opacity: 0.95,
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 10,
  },
  tile: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    minHeight: 86,
  },
  tileLabel: {
    opacity: 0.8,
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  tileValue: { fontSize: 16, fontWeight: 700, wordBreak: "break-word" },

  eonRow: { display: "flex", gap: 10, alignItems: "center" },
  eonIcon: { width: 28, height: 28, borderRadius: 8 },

  uriBox: {
    marginTop: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 14,
  },
  uriLabel: { opacity: 0.8, fontSize: 12, marginBottom: 8 },
  uriValue: { fontSize: 14, fontWeight: 700, wordBreak: "break-word" },

  status: { marginTop: 12, fontSize: 14, opacity: 0.9 },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.4,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
  },
  badgeOk: {
    border: "1px solid rgba(80,255,160,0.35)",
    background: "rgba(80,255,160,0.12)",
  },
  badgeWait: {
    border: "1px solid rgba(255,200,80,0.35)",
    background: "rgba(255,200,80,0.12)",
  },
  badgeUnknown: {
    border: "1px solid rgba(255,80,80,0.35)",
    background: "rgba(255,80,80,0.12)",
  },
};
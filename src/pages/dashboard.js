import { useEffect, useMemo, useState } from "react";
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

// EON token address (from Flare explorer)
const EON_TOKEN_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";

// Controller ABI (dashboard needs reads + tick)
const CONTROLLER_ABI = [
  "function energonHeight() view returns (uint256)",
  "function secondsUntilNextEnergonBlock() view returns (uint256)",
  "function tickEnergon() external",
];

// EON ERC-20 minimal ABI
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export default function Dashboard() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("Ready. (Connect wallet for eligibility + balances)");

  const [totalMinted, setTotalMinted] = useState("-");
  const [cubeBal, setCubeBal] = useState("-");
  const [eligibleText, setEligibleText] = useState("-");
  const [tokenUri, setTokenUri] = useState("-");

  const [eonBal, setEonBal] = useState("-");
  const [eonSymbol, setEonSymbol] = useState("EON");
  const [eonDecimals, setEonDecimals] = useState(18);

  const [controllerAddr, setControllerAddr] = useState("-");
  const [energonHeight, setEnergonHeight] = useState("-");
  const [secondsUntilNext, setSecondsUntilNext] = useState("-");
  const [lastTickTx, setLastTickTx] = useState("-");

  const [ticking, setTicking] = useState(false);

  // Public read-only provider (works on Vercel)
  const roProvider = useMemo(() => {
    return new ethers.JsonRpcProvider(RPCS[MAINNET_CHAIN_ID]);
  }, []);

  const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(a.length - 4)}` : "-");
  const chainOk = Number(chainId) === MAINNET_CHAIN_ID;

  function tile(label, value) {
    return (
      <div style={styles.tile}>
        <div style={styles.tileLabel}>{label}</div>
        <div style={styles.tileValue}>{value}</div>
      </div>
    );
  }

  async function switchToMainnet() {
    if (!window.ethereum) return setStatus("Wallet not found");

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MAINNET_HEX }],
      });
      setStatus("Switched to Flare Mainnet ✅");
      await refreshRead();
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
          await refreshRead();
        } catch (e2) {
          setStatus(e2?.message || "Failed to add chain");
        }
      } else {
        setStatus(err?.message || "Failed to switch chain");
      }
    }
  }

  async function connectWallet() {
    if (!window.ethereum) return setStatus("Wallet not found");

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
      setAccount(addr);

      setStatus("Connected ✅");
      await refreshRead(browserProvider, addr);
    } catch (e) {
      setStatus(e?.message || "Connect failed");
    }
  }

  // Manual tick using the USER wallet signer (works on Vercel)
  async function manualTick() {
    if (!window.ethereum) return setStatus("Wallet not found");
    if (!account) return setStatus("Connect wallet first");

    try {
      setTicking(true);
      setStatus("Manual tick: sending tx…");

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const net = await browserProvider.getNetwork();
      setChainId(Number(net.chainId));

      if (Number(net.chainId) !== MAINNET_CHAIN_ID) {
        setStatus(`Wrong network. Click "Switch to ${NETWORK_NAME}".`);
        setTicking(false);
        return;
      }

      const signer = await browserProvider.getSigner();

      const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const ctrl = await cube.controller();

      if (!ctrl || ctrl === ethers.ZeroAddress) {
        setStatus("Controller not found on contract");
        setTicking(false);
        return;
      }

      const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, signer);

      const tx = await controller.tickEnergon();
      setLastTickTx(tx.hash);

      setStatus("Manual tick: waiting confirmation…");
      await tx.wait();

      setStatus("Done ✅");
      await refreshRead(browserProvider, account);
    } catch (e) {
      setStatus(e?.shortMessage || e?.message || "Manual tick failed");
    } finally {
      setTicking(false);
    }
  }

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
        const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, providerToUse);

        try {
          const h = await controller.energonHeight();
          setEnergonHeight(h.toString());
        } catch {
          setEnergonHeight("-");
        }

        try {
          const s = await controller.secondsUntilNextEnergonBlock();
          setSecondsUntilNext(s.toString());
        } catch {
          setSecondsUntilNext("-");
        }
      } else {
        setEnergonHeight("-");
        setSecondsUntilNext("-");
      }

      const acct = optionalAccount || account;

      // Wallet-specific reads
      if (acct) {
        // cube balance + eligibility
        try {
          const bal = await cube.balanceOf(acct);
          setCubeBal(bal.toString());
          const n = Number(bal.toString());
          if (n === 1) setEligibleText("Eligible ✅ (Exactly 1 Cube)");
          else setEligibleText(`Not eligible ❌ (${n} Cubes)`);
        } catch {
          setCubeBal("-");
          setEligibleText("-");
        }

        // tokenURI (keep token #1 like you had; you can swap to owned token later)
        try {
          const uri = await cube.tokenURI(1);
          setTokenUri(uri);
        } catch {
          setTokenUri("-");
        }

        // EON balance
        try {
          const eon = new ethers.Contract(EON_TOKEN_ADDRESS, ERC20_ABI, providerToUse);
          const [dec, sym] = await Promise.all([
            eon.decimals().catch(() => 18),
            eon.symbol().catch(() => "EON"),
          ]);
          setEonDecimals(Number(dec));
          setEonSymbol(sym);

          const b = await eon.balanceOf(acct);
          setEonBal(`${ethers.formatUnits(b, dec)} ${sym}`);
        } catch {
          setEonBal("-");
        }
      }

      // update chainId if wallet exists
      if (window.ethereum) {
        const bp = optionalProvider || new ethers.BrowserProvider(window.ethereum);
        const n = await bp.getNetwork();
        setChainId(Number(n.chainId));
      }
    } catch (e) {
      setStatus(e?.message || "Unable to read contract");
    }
  }

  // Auto-refresh every 5 seconds to show changes on Vercel
  useEffect(() => {
    refreshRead();

    const interval = setInterval(() => {
      refreshRead();
    }, 5000);

    if (!window.ethereum) return () => clearInterval(interval);

    const onChainChanged = () => window.location.reload();
    const onAccountsChanged = () => window.location.reload();

    window.ethereum.on("chainChanged", onChainChanged);
    window.ethereum.on("accountsChanged", onAccountsChanged);

    return () => {
      clearInterval(interval);
      window.ethereum.removeListener("chainChanged", onChainChanged);
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <div style={styles.connectedPill}>Connected ✅</div>
          )}

          {!chainOk ? (
            <button style={styles.btnSecondary} onClick={switchToMainnet}>
              Switch to {NETWORK_NAME}
            </button>
          ) : null}

          <button style={styles.btn} onClick={() => refreshRead()}>
            Refresh
          </button>

          <button
            style={{ ...styles.btnSecondary, opacity: ticking ? 0.6 : 1 }}
            onClick={manualTick}
            disabled={ticking}
          >
            {ticking ? "Ticking…" : "Manual Tick"}
          </button>
        </div>

        <div style={styles.grid3}>
          {tile("Contract", shortAddr(CONTRACT_ADDRESS))}
          {tile("Connected", account ? shortAddr(account) : "-")}
          {tile("Chain ID", chainOk ? `14 (OK ✅)` : `${chainId || "-"} (Wrong ❌)`)}
          {tile("Total Minted", totalMinted)}
          {tile("Your Cube Balance", cubeBal)}
          {tile("Eligibility", eligibleText)}

          {/* EON tile */}
          <div style={styles.tile}>
            <div style={styles.tileLabel}>Energon Token (EON)</div>
            <div style={styles.eonRow}>
              <img
                src="https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafybeiccfdp4aez6gqva5yx5cmixc7dugqxl6eee5nhb54sdhpnidpmt7u"
                alt="EON"
                style={styles.eonIcon}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{eonSymbol}</div>
                <div style={{ opacity: 0.9, marginTop: 2 }}>Your Balance: {eonBal}</div>
              </div>
            </div>
          </div>

          {tile("Energon Height", energonHeight)}
          {tile("Next Block (sec)", secondsUntilNext)}

          <div style={styles.tile}>
            <div style={styles.tileLabel}>Last Tick Tx</div>
            <div style={styles.tileValue}>{lastTickTx === "-" ? "-" : shortAddr(lastTickTx)}</div>
          </div>
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
  h1: { fontSize: 48, margin: "0 0 12px", letterSpacing: 0.3 },
  btnRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
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
  tileLabel: { opacity: 0.8, fontSize: 12, marginBottom: 8, letterSpacing: 0.3 },
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
};
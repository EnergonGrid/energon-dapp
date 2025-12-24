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

export default function Mint() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("Not connected");

  const [totalMinted, setTotalMinted] = useState("—");
  const [priceFlr, setPriceFlr] = useState("—");
  const [priceWei, setPriceWei] = useState(null);

  const [qty, setQty] = useState(1);
  const [isMinting, setIsMinting] = useState(false);

  // Read-only provider (works before wallet connect)
  const roProvider = useMemo(() => {
    return new ethers.JsonRpcProvider(RPCS[MAINNET_CHAIN_ID]);
  }, []);

  const chainOk = Number(chainId) === MAINNET_CHAIN_ID;

  const shortAddr = (a) =>
    a ? `${a.slice(0, 6)}…${a.slice(a.length - 4)}` : "—";

  function Tile({ label, value }) {
    return (
      <div style={styles.tile}>
        <div style={styles.tileLabel}>{label}</div>
        <div style={styles.tileValue}>{value}</div>
      </div>
    );
  }

  async function switchToMainnet() {
    if (!window.ethereum) {
      setStatus("MetaMask not found");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MAINNET_HEX }], // 0x0e
      });
      setStatus("Switched to Flare Mainnet ✅");
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
        } catch (e2) {
          setStatus(e2?.message || "Failed to add chain");
        }
      } else {
        setStatus(err?.message || "Failed to switch chain");
      }
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("MetaMask not found");
      return;
    }

    try {
      setStatus("Connecting…");
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

      await refreshRead(browserProvider);
    } catch (e) {
      setStatus(e?.message || "Connect failed");
    }
  }

  async function refreshRead(optionalProvider = null) {
    try {
      const providerToUse = optionalProvider || roProvider;
      const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, providerToUse);

      // totalMinted
      try {
        const tm = await cube.totalMinted();
        setTotalMinted(tm.toString());
      } catch {
        setTotalMinted("—");
      }

      // price (try multiple names just in case ABI differs)
      let p = null;
      try {
        p = await cube.priceInFlrWei();
      } catch {
        try {
          p = await cube.priceWei();
        } catch {
          try {
            p = await cube.price();
          } catch {
            p = null;
          }
        }
      }

      if (p !== null) {
        setPriceWei(p);
        setPriceFlr(`${ethers.formatEther(p)} FLR`);
      } else {
        setPriceWei(null);
        setPriceFlr("—");
      }

      // update chainId if wallet exists
      if (window.ethereum) {
        const bp =
          optionalProvider || new ethers.BrowserProvider(window.ethereum);
        const n = await bp.getNetwork();
        setChainId(Number(n.chainId));
      }
    } catch (e) {
      console.error(e);
      setStatus(e?.message || "Unable to read contract");
    }
  }

  async function mintNow() {
    if (!window.ethereum) {
      setStatus("MetaMask not found");
      return;
    }
    if (!account) {
      setStatus("Connect wallet first");
      return;
    }
    if (!chainOk) {
      setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
      return;
    }
    if (!priceWei) {
      setStatus("Price not loaded yet");
      return;
    }

    const q = Math.max(1, Math.min(25, Number(qty || 1)));

    try {
      setIsMinting(true);
      setStatus("Preparing mint…");

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const totalValue = priceWei * BigInt(q);

      let tx;
      try {
        tx = await cube.mintWithFLR(q, { value: totalValue });
      } catch {
        tx = await cube.mint(q, { value: totalValue });
      }

      setStatus(`Mint submitted: ${tx.hash}`);
      await tx.wait();

      setStatus("Mint confirmed ✅");
      await refreshRead(browserProvider);
    } catch (e) {
      setStatus(e?.shortMessage || e?.message || "Mint failed");
    } finally {
      setIsMinting(false);
    }
  }

  // initial read + wallet sync
  useEffect(() => {
    refreshRead();

    if (!window.ethereum) return;

    const onChain = () => window.location.reload();
    const onAccounts = () => window.location.reload();

    window.ethereum.on("chainChanged", onChain);
    window.ethereum.on("accountsChanged", onAccounts);

    return () => {
      window.ethereum.removeListener("chainChanged", onChain);
      window.ethereum.removeListener("accountsChanged", onAccounts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <Nav />

      <div style={styles.wrap}>
        {/* HERO */}
        <div style={styles.hero}>
          <div style={styles.heroLeft}>
            <div style={styles.kicker}>Energon Protocol • Flare Mainnet</div>
            <h1 style={styles.h1}>Mint an Energon Cube</h1>
            <div style={styles.sub}>
              Public mint is live. Rewards are distributed to wallets holding{" "}
              <b>exactly 1</b> cube.
            </div>
          </div>

          <div style={styles.heroRight}>
            {!account ? (
              <button style={styles.btn} onClick={connectWallet}>
                Connect Wallet
              </button>
            ) : (
              <div style={styles.connectedPill}>
                Connected: {shortAddr(account)}
              </div>
            )}

            {!chainOk ? (
              <button style={styles.btnSecondary} onClick={switchToMainnet}>
                Switch to {NETWORK_NAME}
              </button>
            ) : null}
          </div>
        </div>

        {/* TILES (only 3) */}
        <div style={styles.grid3}>
          <Tile label="Total Minted" value={totalMinted} />
          <Tile label="Price (per NFT)" value={priceFlr} />
          <Tile label="Contract" value={shortAddr(CONTRACT_ADDRESS)} />
        </div>

        {/* MINT CARD */}
        <div style={styles.mintCard}>
          <div style={styles.mintRow}>
            <div>
              <div style={styles.mintTitle}>Mint</div>
              <div style={styles.mintHint}>
                Choose quantity (max 25 per tx). If you want rewards, mint only{" "}
                <b>1</b> per wallet.
              </div>
            </div>

            <div style={styles.controls}>
              <input
                style={styles.input}
                type="number"
                min="1"
                max="25"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />

              <button
                style={{ ...styles.btnPrimary, opacity: isMinting ? 0.7 : 1 }}
                onClick={mintNow}
                disabled={isMinting}
              >
                {isMinting ? "Minting…" : "Mint"}
              </button>

              <button style={styles.btnGhost} onClick={() => refreshRead()}>
                Refresh
              </button>
            </div>
          </div>

          <div style={styles.status}>Status: {status}</div>
        </div>

        <div style={styles.footerNote}>
          If MetaMask prompts the wrong network, approve switching to{" "}
          <b>{NETWORK_NAME}</b> (Chain ID {MAINNET_CHAIN_ID}).
        </div>
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
  wrap: { maxWidth: 980, margin: "0 auto", padding: "26px 18px 60px" },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  heroLeft: { minWidth: 260 },
  heroRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  kicker: { opacity: 0.8, fontSize: 13, letterSpacing: 0.3 },
  h1: { fontSize: 44, margin: "6px 0 6px", letterSpacing: 0.3 },
  sub: { opacity: 0.9, fontSize: 14, lineHeight: 1.45, maxWidth: 560 },

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
  btnGhost: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    opacity: 0.95,
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
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    minHeight: 82,
  },
  tileLabel: { opacity: 0.8, fontSize: 12, marginBottom: 8, letterSpacing: 0.3 },
  tileValue: { fontSize: 18, fontWeight: 800, wordBreak: "break-word" },

  mintCard: {
    marginTop: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 16,
  },
  mintRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  mintTitle: { fontSize: 18, fontWeight: 900 },
  mintHint: { marginTop: 6, fontSize: 13, opacity: 0.85, maxWidth: 520 },

  controls: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  input: {
    width: 90,
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    outline: "none",
  },

  status: { marginTop: 12, fontSize: 14, opacity: 0.92 },
  footerNote: { marginTop: 14, fontSize: 13, opacity: 0.8 },
};
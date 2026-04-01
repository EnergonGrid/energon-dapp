// src/pages/mint.js
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

const CUBE_IMAGE_URI =
  "https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafkreidvd5tpfmhctkuz5bb6xpodytjnlkiffflstxrm4abuhsgqhmftbq";

export default function Mint() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);

  const [status, setStatus] = useState("Not connected");
  const [statusTone, setStatusTone] = useState("danger");

  const [totalMinted, setTotalMinted] = useState("—");
  const [priceFlr, setPriceFlr] = useState("—");
  const [priceWei, setPriceWei] = useState(null);

  const [qty, setQty] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [ownedCubeCount, setOwnedCubeCount] = useState(0);

  const [viewportWidth, setViewportWidth] = useState(1280);

  const RO_RPC =
    Array.isArray(RPCS?.[MAINNET_CHAIN_ID]) && RPCS[MAINNET_CHAIN_ID].length
      ? RPCS[MAINNET_CHAIN_ID][0]
      : RPCS?.[MAINNET_CHAIN_ID];

  const roProvider = useMemo(() => {
    return new ethers.JsonRpcProvider(RO_RPC);
  }, [RO_RPC]);

  const chainOk = Number(chainId) === MAINNET_CHAIN_ID;
  const hasCube = ownedCubeCount > 0;

  const isTablet = viewportWidth <= 980;
  const isMobile = viewportWidth <= 768;
  const isSmallMobile = viewportWidth <= 480;

  const shortAddr = (a) =>
    a ? `${a.slice(0, 6)}…${a.slice(a.length - 4)}` : "Address";

  function updateStatus(message, tone = "info") {
    setStatus(message);
    setStatusTone(tone);
  }

  function Tile({ label, value, icon = null, right = null, valueStyle = null }) {
    return (
      <div
        style={{
          ...styles.tile,
          ...(isMobile ? styles.tileMobile : null),
        }}
      >
        <div style={styles.tileLabel}>{label}</div>
        <div
          style={{
            ...styles.tileValueRow,
            ...(isSmallMobile ? styles.tileValueRowSmall : null),
          }}
        >
          {icon ? <div style={styles.tileIconWrap}>{icon}</div> : null}
          <div style={{ ...styles.tileValue, ...(valueStyle || {}) }}>{value}</div>
          {right ? <div style={styles.tileRight}>{right}</div> : null}
        </div>
      </div>
    );
  }

  async function ensureMainnet() {
    if (!window.ethereum) {
      updateStatus("MetaMask not found", "danger");
      return false;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const net = await browserProvider.getNetwork();
      const currentChainId = Number(net.chainId);
      setChainId(currentChainId);

      if (currentChainId === MAINNET_CHAIN_ID) {
        return true;
      }

      updateStatus(`Switching to ${NETWORK_NAME}…`, "warning");

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: MAINNET_HEX }],
        });
      } catch (err) {
        if (err?.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: MAINNET_HEX,
                chainName: NETWORK_NAME,
                nativeCurrency: { name: "Flare", symbol: "FLR", decimals: 18 },
                rpcUrls: [RO_RPC],
              },
            ],
          });
        } else {
          throw err;
        }
      }

      const refreshedProvider = new ethers.BrowserProvider(window.ethereum);
      const refreshedNet = await refreshedProvider.getNetwork();
      const refreshedChainId = Number(refreshedNet.chainId);
      setChainId(refreshedChainId);

      if (refreshedChainId === MAINNET_CHAIN_ID) {
        updateStatus(`Connected to ${NETWORK_NAME} ✅`, "success");
        return true;
      }

      updateStatus(`Wrong network. Please switch to ${NETWORK_NAME}.`, "warning");
      return false;
    } catch (e) {
      updateStatus(e?.message || "Failed to switch chain", "danger");
      return false;
    }
  }

  async function switchToMainnet() {
    await ensureMainnet();
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await refreshRead(browserProvider, account || "");
    } catch {}
  }

  async function connectWallet() {
    if (!window.ethereum) {
      updateStatus("MetaMask not found", "danger");
      return;
    }

    try {
      updateStatus("Connecting wallet…", "info");

      const ok = await ensureMainnet();
      if (!ok) return;

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const addr = accounts?.[0] || "";

      setAccount(addr);

      await refreshRead(browserProvider, addr);

      if (addr) {
        updateStatus("Connected ✅ Ready to mint", "success");
      } else {
        updateStatus("Not connected", "danger");
      }
    } catch (e) {
      updateStatus(e?.message || "Connect failed", "danger");
    }
  }

  async function refreshRead(optionalProvider = null, optionalAccount = "") {
    try {
      const providerToUse = optionalProvider || roProvider;
      const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, providerToUse);

      try {
        const tm = await cube.totalMinted();
        setTotalMinted(tm.toString());
      } catch {
        setTotalMinted("—");
      }

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

      const acct = optionalAccount || account || "";

      if (acct) {
        try {
          const bal = await cube.balanceOf(acct);
          const count = Number(bal.toString());
          setOwnedCubeCount(count);

          if (count > 0) {
            updateStatus("Wallet already holds an Energon Cube", "success");
          } else if (chainOk) {
            updateStatus("Connected ✅ Ready to mint", "success");
          }
        } catch {
          setOwnedCubeCount(0);
        }
      } else {
        setOwnedCubeCount(0);
      }

      if (window.ethereum) {
        const bp =
          optionalProvider || new ethers.BrowserProvider(window.ethereum);
        const n = await bp.getNetwork();
        setChainId(Number(n.chainId));
      }
    } catch (e) {
      console.error(e);
      updateStatus(e?.message || "Unable to read contract", "danger");
    }
  }

  async function mintNow() {
    if (!window.ethereum) {
      updateStatus("MetaMask not found", "danger");
      return;
    }
    if (!account) {
      updateStatus("Connect wallet first", "danger");
      return;
    }
    if (!chainOk) {
      updateStatus(`Wrong network. Switch to ${NETWORK_NAME}.`, "warning");
      return;
    }
    if (hasCube) {
      updateStatus("This wallet already holds an Energon Cube", "success");
      return;
    }
    if (!priceWei) {
      updateStatus("Price not loaded yet", "warning");
      return;
    }

    const q = 1;

    try {
      setIsMinting(true);
      updateStatus("Preparing mint…", "info");

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

      updateStatus(`Mint submitted: ${tx.hash}`, "info");
      await tx.wait();

      await refreshRead(browserProvider, account);
      updateStatus("Mint confirmed ✅ Energon Cube minted", "success");
    } catch (e) {
      updateStatus(e?.shortMessage || e?.message || "Mint failed", "danger");
    } finally {
      setIsMinting(false);
      setQty(1);
    }
  }

  function adjustQty() {
    setQty(1);
  }

  async function copyContract() {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      updateStatus("Unable to copy contract", "danger");
    }
  }

  useEffect(() => {
    setQty(1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    refreshRead();

    if (!window.ethereum) return;

    const onChain = async () => {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const net = await browserProvider.getNetwork();
        const nextChainId = Number(net.chainId);
        setChainId(nextChainId);

        await refreshRead(browserProvider, account);

        if (nextChainId === MAINNET_CHAIN_ID) {
          if (account) {
            updateStatus("Connected ✅ On Flare Mainnet", "success");
          }
        } else {
          updateStatus(`Wrong network. Switch to ${NETWORK_NAME}.`, "warning");
        }
      } catch (e) {
        updateStatus(e?.message || "Chain update failed", "danger");
      }
    };

    const onAccounts = async (accounts) => {
      try {
        const addr = accounts?.[0] || "";
        setAccount(addr);

        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await refreshRead(browserProvider, addr);

        if (!addr) {
          setOwnedCubeCount(0);
          updateStatus("Not connected", "danger");
        }
      } catch (e) {
        updateStatus(e?.message || "Account update failed", "danger");
      }
    };

    window.ethereum.on("chainChanged", onChain);
    window.ethereum.on("accountsChanged", onAccounts);

    return () => {
      window.ethereum.removeListener("chainChanged", onChain);
      window.ethereum.removeListener("accountsChanged", onAccounts);
    };
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  const actionButtonStyle = !account
    ? styles.mintActionBtnDisconnected
    : !chainOk
    ? styles.mintActionBtnWarn
    : hasCube
    ? styles.mintActionBtnOwned
    : styles.mintActionBtnConnected;

  const actionButtonText = !account
    ? "Connect Wallet"
    : !chainOk
    ? `Switch to ${NETWORK_NAME}`
    : hasCube
    ? "Already Minted"
    : isMinting
    ? "Minting…"
    : "Mint NFT";

  const actionButtonClick = !account
    ? connectWallet
    : !chainOk
    ? switchToMainnet
    : hasCube
    ? () => updateStatus("This wallet already holds an Energon Cube", "success")
    : mintNow;

  const actionButtonDisabled = isMinting || hasCube;

  const statusToneStyle =
    statusTone === "success"
      ? styles.statusInlineSuccess
      : statusTone === "warning"
      ? styles.statusInlineWarning
      : statusTone === "info"
      ? styles.statusInlineInfo
      : styles.statusInlineDanger;

  const statusDotStyle =
    statusTone === "success"
      ? styles.statusDotConnected
      : statusTone === "warning"
      ? styles.statusDotWarning
      : statusTone === "info"
      ? styles.statusDotInfo
      : styles.statusDotDisconnected;

  return (
    <div
      style={{
        ...styles.page,
        ...(isMobile ? styles.pageMobile : null),
      }}
    >
      {!isMobile ? <div style={styles.bgGlowA} /> : null}
      {!isMobile ? <div style={styles.bgGlowB} /> : null}
      <div style={styles.bgStarsA} />
      <div style={styles.bgStarsB} />
      {!isMobile ? <div style={styles.circuitLeft} /> : null}
      {!isMobile ? <div style={styles.circuitRight} /> : null}

      <Nav />

      <div
        style={{
          ...styles.wrap,
          ...(isTablet ? styles.wrapTablet : null),
          ...(isMobile ? styles.wrapMobile : null),
        }}
      >
        <div style={{ ...styles.hero, ...(isMobile ? styles.heroMobile : null) }}>
          <div style={styles.heroBeamLine} />
          <h1
            style={{
              ...styles.h1,
              ...(isTablet ? styles.h1Tablet : null),
              ...(isMobile ? styles.h1Mobile : null),
              ...(isSmallMobile ? styles.h1SmallMobile : null),
            }}
          >
            MINT · ENERGON CUBE
          </h1>

          <div
            style={{
              ...styles.subheadLineWrap,
              ...(isMobile ? styles.subheadLineWrapMobile : null),
            }}
          >
            {!isMobile ? <div style={styles.subheadWing} /> : null}
            <div
              style={{
                ...styles.sub,
                ...(isMobile ? styles.subMobile : null),
              }}
            >
              Fixed Supply · Public Access Active
            </div>
            {!isMobile ? <div style={styles.subheadWing} /> : null}
          </div>
        </div>

        <div
          style={{
            ...styles.statsGrid,
            ...(isTablet ? styles.statsGridTablet : null),
            ...(isMobile ? styles.statsGridMobile : null),
          }}
        >
          <Tile
            label="TOTAL MINTED"
            value={totalMinted}
            valueStyle={styles.bigCenteredValue}
          />

          <Tile
            label="ENTRY (PER CUBE)"
            value={priceFlr}
            icon={<span style={styles.priceCheck}>✓</span>}
            valueStyle={styles.priceValue}
          />

          <Tile
            label="CONTRACT"
            value={shortAddr(CONTRACT_ADDRESS)}
            right={
              <button
                type="button"
                style={{
                  ...styles.copyBtn,
                  ...(isMobile ? styles.copyBtnMobile : null),
                }}
                onClick={copyContract}
                title={copied ? "Copied" : "Copy contract"}
              >
                {copied ? "✓" : "⧉"}
              </button>
            }
            valueStyle={styles.contractValue}
          />
        </div>

        <div
          style={{
            ...styles.mainGrid,
            ...(isTablet ? styles.mainGridTablet : null),
            ...(isMobile ? styles.mainGridMobile : null),
          }}
        >
          <div
            style={{
              ...styles.mintCard,
              ...(isMobile ? styles.mintCardMobile : null),
            }}
          >
            <div
              style={{
                ...styles.mintCardTitle,
                ...(isMobile ? styles.mintCardTitleMobile : null),
              }}
            >
              ACQUIRE 1 ENERGON CUBE
            </div>

            <div
              style={{
                ...styles.mintCardSub,
                ...(isMobile ? styles.mintCardSubMobile : null),
              }}
            >
              1 Cube per wallet · Quantity enforced by protocol
            </div>

            <div
              style={{
                ...styles.mintControlsRow,
                ...(isTablet ? styles.mintControlsRowTablet : null),
                ...(isMobile ? styles.mintControlsRowMobile : null),
              }}
            >
              <div
                style={{
                  ...styles.qtyBlock,
                  ...(isMobile ? styles.qtyBlockMobile : null),
                }}
              >
                <div style={styles.qtyLabel}>QUANTITY</div>

                <div
                  style={{
                    ...styles.stepper,
                    ...styles.stepperDisabled,
                    ...(isMobile ? styles.stepperMobile : null),
                  }}
                >
                  <button
                    type="button"
                    style={{ ...styles.stepperBtn, ...styles.stepperBtnDisabled }}
                    onClick={adjustQty}
                    disabled
                  >
                    –
                  </button>

                  <input
                    style={{
                      ...styles.qtyInput,
                      ...styles.qtyInputDisabled,
                      ...(isMobile ? styles.qtyInputMobile : null),
                    }}
                    type="number"
                    min="1"
                    max="1"
                    value={qty}
                    readOnly
                    disabled
                  />

                  <button
                    type="button"
                    style={{ ...styles.stepperBtn, ...styles.stepperBtnDisabled }}
                    onClick={adjustQty}
                    disabled
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                style={{
                  ...styles.mintActionBlock,
                  ...(isMobile ? styles.mintActionBlockMobile : null),
                }}
              >
                <div style={styles.addressLabel}>ADDRESS</div>

                <div
                  style={{
                    ...styles.addressPill,
                    ...(isMobile ? styles.addressPillMobile : null),
                  }}
                >
                  {account ? shortAddr(account) : "Address"}
                </div>

                <button
                  type="button"
                  style={{
                    ...styles.mintActionBtn,
                    ...actionButtonStyle,
                    ...(isMobile ? styles.mintActionBtnMobile : null),
                    opacity: isMinting ? 0.72 : 1,
                  }}
                  onClick={actionButtonClick}
                  disabled={actionButtonDisabled}
                >
                  {actionButtonText}
                </button>

                <div
                  style={{
                    ...styles.statusRow,
                    ...(isMobile ? styles.statusRowMobile : null),
                  }}
                >
                  <span style={{ ...styles.statusDot, ...statusDotStyle }} />
                  <span style={{ ...styles.statusInlineText, ...statusToneStyle }}>
                    Status: {status}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                ...styles.featureRow,
                ...(isMobile ? styles.featureRowMobile : null),
              }}
            >
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>◉</span>
                <span>Flare Mainnet (Chain ID: 14)</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>✚</span>
                <span>Secure Mint</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                <span>On-Chain Verified</span>
              </div>
            </div>
          </div>

          <div
            style={{
              ...styles.cubeCard,
              ...(isTablet ? styles.cubeCardTablet : null),
              ...(isMobile ? styles.cubeCardMobile : null),
            }}
          >
            <img
              src={CUBE_IMAGE_URI}
              alt="Energon Cube"
              style={{
                ...styles.cubeImage,
                ...(isMobile ? styles.cubeImageMobile : null),
              }}
            />
          </div>
        </div>

        <div
          style={{
            ...styles.bottomStrip,
            ...(isMobile ? styles.bottomStripMobile : null),
          }}
        >
          <span style={styles.bottomStripIcon}>◉</span>
          <span>1 Energon Cube per wallet = Eligibility enforced by smart contract</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 50% 14%, rgba(38,74,160,0.08) 0%, rgba(5,10,24,0.32) 18%, #000000 52%, #000000 100%)",
    color: "#fff",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  },

  pageMobile: {
    background: "#000000",
  },

  bgGlowA: {
    position: "absolute",
    top: 110,
    left: "18%",
    width: 280,
    height: 280,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(70,150,255,0.12), transparent 72%)",
    filter: "blur(90px)",
    pointerEvents: "none",
  },

  bgGlowB: {
    position: "absolute",
    right: "12%",
    top: 190,
    width: 240,
    height: 240,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(60,120,255,0.08), transparent 72%)",
    filter: "blur(90px)",
    pointerEvents: "none",
  },

  bgStarsA: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.22,
    backgroundImage:
      "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.92) 0 1px, transparent 2px), radial-gradient(circle at 28% 9%, rgba(255,255,255,0.68) 0 1px, transparent 2px), radial-gradient(circle at 42% 14%, rgba(255,255,255,0.76) 0 1px, transparent 2px), radial-gradient(circle at 65% 10%, rgba(255,255,255,0.7) 0 1px, transparent 2px), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 88% 12%, rgba(255,255,255,0.74) 0 1px, transparent 2px)",
  },

  bgStarsB: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.1,
    backgroundImage:
      "radial-gradient(circle at 16% 42%, rgba(255,255,255,0.8) 0 1px, transparent 2px), radial-gradient(circle at 31% 50%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 56% 36%, rgba(255,255,255,0.62) 0 1px, transparent 2px), radial-gradient(circle at 70% 48%, rgba(255,255,255,0.54) 0 1px, transparent 2px), radial-gradient(circle at 85% 58%, rgba(255,255,255,0.64) 0 1px, transparent 2px), radial-gradient(circle at 22% 72%, rgba(255,255,255,0.55) 0 1px, transparent 2px)",
  },

  circuitLeft: {
    position: "absolute",
    left: 0,
    top: 220,
    bottom: 0,
    width: 160,
    pointerEvents: "none",
    opacity: 0.1,
    background:
      "linear-gradient(transparent 0%, rgba(80,160,255,0.28) 10%, transparent 11%), linear-gradient(90deg, rgba(80,160,255,0.20), rgba(80,160,255,0.02)), linear-gradient(transparent 0%, transparent 58%, rgba(80,160,255,0.24) 58%, rgba(80,160,255,0.24) 59%, transparent 59%)",
  },

  circuitRight: {
    position: "absolute",
    right: 0,
    top: 220,
    bottom: 0,
    width: 160,
    pointerEvents: "none",
    opacity: 0.1,
    background:
      "linear-gradient(transparent 0%, rgba(80,160,255,0.28) 16%, transparent 17%), linear-gradient(270deg, rgba(80,160,255,0.20), rgba(80,160,255,0.02)), linear-gradient(transparent 0%, transparent 42%, rgba(80,160,255,0.24) 42%, rgba(80,160,255,0.24) 43%, transparent 43%)",
  },

  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "8px 18px 44px",
    position: "relative",
    zIndex: 1,
  },

  wrapTablet: {
    maxWidth: 860,
    padding: "8px 16px 40px",
  },

  wrapMobile: {
    padding: "8px 14px 34px",
  },

  hero: {
    textAlign: "center",
    marginBottom: 18,
  },

  heroMobile: {
    marginBottom: 14,
  },

  heroBeamLine: {
    width: "100%",
    height: 1,
    margin: "0 auto 18px",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(80,170,255,0.04), rgba(90,180,255,0.18), rgba(140,220,255,0.95), rgba(90,180,255,0.18), rgba(80,170,255,0.04))",
    boxShadow: "0 0 16px rgba(100,180,255,0.24)",
  },

  h1: {
    margin: 0,
    fontSize: 42,
    lineHeight: 1.04,
    fontWeight: 500,
    letterSpacing: 0.12,
    color: "#ffffff",
    textTransform: "uppercase",
    textShadow:
      "0 0 8px rgba(255,255,255,0.04), 0 0 18px rgba(120,180,255,0.06)",
  },

  h1Tablet: {
    fontSize: 36,
  },

  h1Mobile: {
    fontSize: 28,
    lineHeight: 1.08,
    letterSpacing: 0.08,
  },

  h1SmallMobile: {
    fontSize: 24,
  },

  subheadLineWrap: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },

  subheadLineWrapMobile: {
    marginTop: 10,
    gap: 8,
  },

  subheadWing: {
    width: 72,
    height: 2,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(90,170,255,0), rgba(90,170,255,0.85), rgba(90,170,255,0))",
    boxShadow: "0 0 10px rgba(80,170,255,0.18)",
  },

  sub: {
    fontSize: 14,
    color: "rgba(208,223,255,0.72)",
    letterSpacing: 0.15,
    whiteSpace: "nowrap",
  },

  subMobile: {
    fontSize: 12,
    whiteSpace: "normal",
    textAlign: "center",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },

  statsGridTablet: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },

  statsGridMobile: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  tile: {
    position: "relative",
    background:
      "linear-gradient(180deg, rgba(18,48,110,0.16), rgba(6,14,34,0.56))",
    border: "1px solid rgba(96,170,255,0.18)",
    borderRadius: 16,
    padding: "16px 18px",
    minHeight: 92,
    boxShadow:
      "0 14px 28px rgba(0,0,0,0.24), inset 0 0 0 1px rgba(255,255,255,0.015), 0 0 16px rgba(60,130,255,0.05)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  },

  tileMobile: {
    padding: "14px 14px",
    minHeight: 88,
  },

  tileLabel: {
    fontSize: 12,
    letterSpacing: 1.6,
    color: "rgba(230,240,255,0.90)",
    marginBottom: 14,
  },

  tileValueRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  tileValueRowSmall: {
    gap: 8,
    alignItems: "flex-start",
  },

  tileIconWrap: {
    flexShrink: 0,
  },

  tileValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#f4f8ff",
    lineHeight: 1.1,
    wordBreak: "break-word",
  },

  tileRight: {
    marginLeft: "auto",
    flexShrink: 0,
  },

  bigCenteredValue: {
    fontSize: 26,
    fontWeight: 700,
  },

  priceValue: {
    fontSize: 22,
    fontWeight: 800,
  },

  contractValue: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.2,
  },

  priceCheck: {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    fontSize: 16,
    fontWeight: 800,
    color: "#84d4ff",
    border: "2px solid rgba(42,140,255,0.95)",
    boxShadow: "0 0 14px rgba(52,140,255,0.18)",
  },

  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background:
      "linear-gradient(180deg, rgba(12,20,42,0.92), rgba(8,14,30,0.96))",
    border: "1px solid rgba(150,190,255,0.18)",
    color: "#eef6ff",
    cursor: "pointer",
    fontSize: 16,
    boxShadow:
      "0 10px 18px rgba(0,0,0,0.24), inset 0 0 0 1px rgba(255,255,255,0.02)",
  },

  copyBtnMobile: {
    width: 36,
    height: 36,
    fontSize: 14,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 0.9fr)",
    gap: 14,
    alignItems: "stretch",
  },

  mainGridTablet: {
    gridTemplateColumns: "1fr",
  },

  mainGridMobile: {
    gridTemplateColumns: "1fr",
    gap: 12,
  },

  mintCard: {
    position: "relative",
    background:
      "linear-gradient(180deg, rgba(16,44,104,0.18), rgba(7,15,34,0.62))",
    border: "1px solid rgba(98,170,255,0.24)",
    borderRadius: 18,
    padding: "22px 22px 18px",
    boxShadow:
      "0 18px 32px rgba(0,0,0,0.26), inset 0 0 0 1px rgba(255,255,255,0.015), 0 0 18px rgba(60,130,255,0.06)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    overflow: "hidden",
  },

  mintCardMobile: {
    padding: "18px 16px 16px",
    borderRadius: 16,
  },

  mintCardTitle: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: "#f8fbff",
    marginBottom: 10,
  },

  mintCardTitleMobile: {
    fontSize: 18,
    letterSpacing: 0.4,
    lineHeight: 1.2,
  },

  mintCardSub: {
    fontSize: 14,
    color: "rgba(214,226,255,0.72)",
    marginBottom: 20,
  },

  mintCardSubMobile: {
    fontSize: 13,
    lineHeight: 1.45,
    marginBottom: 16,
  },

  mintControlsRow: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.9fr) minmax(220px, 1fr)",
    gap: 18,
    alignItems: "center",
    paddingBottom: 18,
    borderBottom: "1px solid rgba(140,190,255,0.12)",
  },

  mintControlsRowTablet: {
    gridTemplateColumns: "1fr",
    gap: 16,
  },

  mintControlsRowMobile: {
    gridTemplateColumns: "1fr",
    gap: 14,
    paddingBottom: 14,
  },

  qtyBlock: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },

  qtyBlockMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },

  qtyLabel: {
    fontSize: 14,
    letterSpacing: 1.5,
    color: "rgba(234,241,255,0.88)",
  },

  stepper: {
    display: "flex",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(120,180,255,0.18)",
    background:
      "linear-gradient(180deg, rgba(10,18,38,0.92), rgba(8,14,30,0.98))",
    boxShadow: "0 10px 20px rgba(0,0,0,0.20)",
  },

  stepperMobile: {
    width: "100%",
    maxWidth: 220,
  },

  stepperDisabled: {
    opacity: 0.5,
  },

  stepperBtn: {
    width: 54,
    height: "100%",
    border: "none",
    background: "transparent",
    color: "#eef6ff",
    fontSize: 28,
    cursor: "pointer",
  },

  stepperBtnDisabled: {
    cursor: "not-allowed",
    opacity: 0.45,
  },

  qtyInput: {
    width: 72,
    height: "100%",
    border: "none",
    outline: "none",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    textAlign: "center",
    fontSize: 20,
    fontWeight: 700,
  },

  qtyInputMobile: {
    flex: 1,
    width: 72,
  },

  qtyInputDisabled: {
    cursor: "not-allowed",
    opacity: 1,
  },

  mintActionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  mintActionBlockMobile: {
    gap: 10,
  },

  addressLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "rgba(212,226,255,0.72)",
  },

  addressPill: {
    minHeight: 40,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 14px",
    background:
      "linear-gradient(180deg, rgba(11,22,46,0.92), rgba(8,16,34,0.96))",
    border: "1px solid rgba(120,180,255,0.18)",
    color: "#eaf4ff",
    fontSize: 14,
    fontWeight: 600,
    boxShadow:
      "0 10px 18px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(255,255,255,0.02)",
  },

  addressPillMobile: {
    minHeight: 44,
    width: "100%",
    justifyContent: "center",
    textAlign: "center",
    fontSize: 13,
    padding: "0 12px",
  },

  mintActionBtn: {
    height: 52,
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow:
      "0 0 18px rgba(62,154,255,0.16), inset 0 0 8px rgba(255,255,255,0.05)",
  },

  mintActionBtnMobile: {
    width: "100%",
    minHeight: 52,
    fontSize: 16,
  },

  mintActionBtnDisconnected: {
    border: "1px solid rgba(255,90,110,0.68)",
    background:
      "linear-gradient(180deg, rgba(220,54,76,0.92), rgba(155,22,42,0.96))",
    boxShadow:
      "0 0 18px rgba(255,70,98,0.20), inset 0 0 8px rgba(255,255,255,0.05)",
  },

  mintActionBtnConnected: {
    border: "1px solid rgba(74,214,120,0.72)",
    background:
      "linear-gradient(180deg, rgba(42,176,86,0.92), rgba(20,122,52,0.96))",
    boxShadow:
      "0 0 18px rgba(70,214,120,0.20), inset 0 0 8px rgba(255,255,255,0.05)",
  },

  mintActionBtnOwned: {
    border: "1px solid rgba(120,180,255,0.30)",
    background:
      "linear-gradient(180deg, rgba(34,58,94,0.94), rgba(18,28,48,0.98))",
    boxShadow:
      "0 0 18px rgba(120,180,255,0.10), inset 0 0 8px rgba(255,255,255,0.04)",
    cursor: "not-allowed",
  },

  mintActionBtnWarn: {
    border: "1px solid rgba(255,184,74,0.68)",
    background:
      "linear-gradient(180deg, rgba(210,140,34,0.92), rgba(142,84,12,0.96))",
    boxShadow:
      "0 0 18px rgba(255,184,74,0.18), inset 0 0 8px rgba(255,255,255,0.05)",
  },

  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingLeft: 4,
  },

  statusRowMobile: {
    paddingLeft: 0,
    alignItems: "flex-start",
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },

  statusDotDisconnected: {
    background: "#ff3647",
    boxShadow: "0 0 14px rgba(255,54,71,0.55)",
  },

  statusDotConnected: {
    background: "#38d879",
    boxShadow: "0 0 14px rgba(56,216,121,0.55)",
  },

  statusDotWarning: {
    background: "#ffb84a",
    boxShadow: "0 0 14px rgba(255,184,74,0.55)",
  },

  statusDotInfo: {
    background: "#58b4ff",
    boxShadow: "0 0 14px rgba(88,180,255,0.55)",
  },

  statusInlineText: {
    fontSize: 14,
    lineHeight: 1.4,
  },

  statusInlineDanger: {
    color: "rgba(255,214,220,0.94)",
  },

  statusInlineSuccess: {
    color: "rgba(204,255,220,0.94)",
  },

  statusInlineWarning: {
    color: "rgba(255,234,196,0.96)",
  },

  statusInlineInfo: {
    color: "rgba(214,234,255,0.94)",
  },

  featureRow: {
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },

  featureRowMobile: {
    gap: 12,
    marginTop: 14,
    flexDirection: "column",
    alignItems: "flex-start",
  },

  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "rgba(214,229,255,0.82)",
    fontSize: 13,
  },

  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 800,
    color: "#7fcfff",
    border: "1px solid rgba(76,160,255,0.38)",
    boxShadow: "0 0 12px rgba(60,130,255,0.12)",
  },

  cubeCard: {
    background:
      "linear-gradient(180deg, rgba(16,44,104,0.14), rgba(7,15,34,0.60))",
    border: "1px solid rgba(98,170,255,0.18)",
    borderRadius: 18,
    padding: 12,
    boxShadow:
      "0 18px 32px rgba(0,0,0,0.24), inset 0 0 0 1px rgba(255,255,255,0.015), 0 0 18px rgba(60,130,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
    overflow: "hidden",
  },

  cubeCardTablet: {
    minHeight: 280,
  },

  cubeCardMobile: {
    minHeight: 220,
    padding: 10,
    order: 2,
  },

  cubeImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 14,
    display: "block",
  },

  cubeImageMobile: {
    objectFit: "cover",
  },

  bottomStrip: {
    margin: "16px auto 0",
    maxWidth: 760,
    minHeight: 54,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 20px",
    background:
      "linear-gradient(180deg, rgba(8,18,42,0.82), rgba(6,12,28,0.94))",
    border: "1px solid rgba(110,180,255,0.18)",
    color: "rgba(214,229,255,0.88)",
    fontSize: 14,
    boxShadow:
      "0 16px 30px rgba(0,0,0,0.26), inset 0 0 0 1px rgba(255,255,255,0.015)",
    textAlign: "center",
    flexWrap: "wrap",
  },

  bottomStripMobile: {
    marginTop: 14,
    minHeight: 0,
    borderRadius: 18,
    padding: "12px 14px",
    fontSize: 13,
    justifyContent: "center",
    lineHeight: 1.45,
  },

  bottomStripIcon: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    color: "#7fcfff",
    border: "1px solid rgba(76,160,255,0.38)",
    boxShadow: "0 0 12px rgba(60,130,255,0.12)",
  },
};
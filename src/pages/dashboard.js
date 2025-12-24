import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import Nav from "../components/Nav";

import {
  ABI,
  CONTRACT_ADDRESS,
  MAINNET_CHAIN_ID,
  MAINNET_HEX,
  RPCS,
  NETWORK_NAME,
} from "../lib/contract";

// ✅ EON token contract (from your hardhat console)
const EON_TOKEN_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";

// ✅ EON logo (Pinata gateway URL you provided)
const EON_LOGO_URL =
  "https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafybeiccfdp4aez6gqva5yx5cmixc7dugqxl6eee5nhb54sdhpnidpmt7u";

// Minimal ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export default function Dashboard() {
  const [status, setStatus] = useState("Ready.");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);

  const [totalMinted, setTotalMinted] = useState("-");
  const [cubeBalance, setCubeBalance] = useState("-");
  const [eligible, setEligible] = useState("-");
  const [energonHeight, setEnergonHeight] = useState("-");
  const [rewardPerBlockEon, setRewardPerBlockEon] = useState("-");
  const [tokenUri, setTokenUri] = useState("-");
  const [eonBalance, setEonBalance] = useState("-");

  const listenersBoundRef = useRef(false);

  const readProvider = useMemo(() => {
    const rpc = RPCS?.[MAINNET_CHAIN_ID];
    return rpc ? new ethers.JsonRpcProvider(rpc) : null;
  }, []);

  const getEth = () => (typeof window === "undefined" ? null : window.ethereum || null);

  const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "-");

  const getCubeContract = useCallback(
    (providerOrSigner) => new ethers.Contract(CONTRACT_ADDRESS, ABI, providerOrSigner),
    []
  );

  const safeCall = async (fn, fallback = "-") => {
    try {
      const v = await fn();
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

  const refresh = useCallback(
    async (opts = {}) => {
      const eth = getEth();
      const acct = opts.forceAccount ?? account ?? "";

      // MetaMask chainId (hex) is readable even before connect
      const cidHex =
        opts.forceChainId ??
        (eth ? await safeCall(() => eth.request({ method: "eth_chainId" }), null) : null);

      const cidDec = cidHex ? parseInt(cidHex, 16) : null;
      setChainId(cidDec);

      if (!readProvider) {
        setStatus("RPC provider missing. Check RPCS in contract.js");
        return;
      }

      setStatus("Refreshing…");

      const cube = getCubeContract(readProvider);

      // totalMinted
      setTotalMinted(
        await safeCall(async () => (await cube.totalMinted()).toString(), "-")
      );

      // tokenURI(1)
      setTokenUri(await safeCall(async () => await cube.tokenURI(1), "-"));

      // energonHeight (optional)
      const eh = await safeCall(async () => {
        if (cube.energonHeight) return (await cube.energonHeight()).toString();
        if (cube.currentEnergonHeight) return (await cube.currentEnergonHeight()).toString();
        return "-";
      }, "-");
      setEnergonHeight(eh);

      // rewardPerBlock (optional)
      const rpb = await safeCall(async () => {
        if (cube.rewardPerBlockEon) return ethers.formatEther(await cube.rewardPerBlockEon());
        if (cube.rewardPerBlock) return ethers.formatEther(await cube.rewardPerBlock());
        return "-";
      }, "-");
      setRewardPerBlockEon(rpb === "-" ? "-" : `${Number(rpb).toFixed(1)} EON`);

      if (!acct) {
        setCubeBalance("-");
        setEligible("-");
        setEonBalance("-");
        setStatus("Ready. (Connect wallet for eligibility + balances)");
        return;
      }

      // cube balance
      const bal = await safeCall(async () => (await cube.balanceOf(acct)).toString(), "-");
      setCubeBalance(bal);

      // eligibility: exactly 1 cube
      if (bal !== "-") {
        setEligible(Number(bal) === 1 ? "Eligible ✅ (Exactly 1 Cube)" : "Not eligible ❌");
      } else {
        setEligible("-");
      }

      // EON balance
      const eon = new ethers.Contract(EON_TOKEN_ADDRESS, ERC20_ABI, readProvider);
      const decimals = await safeCall(async () => await eon.decimals(), 18);
      const raw = await safeCall(async () => await eon.balanceOf(acct), null);

      if (raw == null) {
        setEonBalance("-");
      } else {
        const fmt = ethers.formatUnits(raw, decimals);
        const asNum = Number(fmt);
        setEonBalance(Number.isFinite(asNum) ? asNum.toFixed(1) : fmt);
      }

      setStatus("Ready.");
    },
    [account, getCubeContract, readProvider]
  );

  const connectWallet = useCallback(async () => {
    const eth = getEth();
    if (!eth) return setStatus("MetaMask not detected.");

    try {
      setStatus("Connecting wallet…");
      const accs = await eth.request({ method: "eth_requestAccounts" });
      const acct = accs?.[0] || "";
      setAccount(acct);

      const cidHex = await eth.request({ method: "eth_chainId" });
      await refresh({ forceAccount: acct, forceChainId: cidHex });

      setStatus("Connected ✅");
    } catch (e) {
      setStatus(e?.message || "Connect failed.");
    }
  }, [refresh]);

  const switchToMainnet = useCallback(async () => {
    const eth = getEth();
    if (!eth) return setStatus("MetaMask not detected.");

    try {
      setStatus(`Switching to ${NETWORK_NAME}…`);
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MAINNET_HEX }],
      });

      const cidHex = await eth.request({ method: "eth_chainId" });
      await refresh({ forceChainId: cidHex });

      setStatus("Ready.");
    } catch (e) {
      setStatus(e?.message || "Network switch failed.");
    }
  }, [refresh]);

  // ✅ MetaMask listeners: auto-refresh on account/network changes
  useEffect(() => {
    const eth = getEth();
    if (!eth || listenersBoundRef.current) return;

    const onAccountsChanged = (accs) => {
      const next = accs?.[0] || "";
      setAccount(next);
      setTimeout(() => refresh({ forceAccount: next }), 50);
    };

    const onChainChanged = (cidHex) => {
      setTimeout(() => refresh({ forceChainId: cidHex }), 50);
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);
    listenersBoundRef.current = true;

    return () => {
      try {
        eth.removeListener("accountsChanged", onAccountsChanged);
        eth.removeListener("chainChanged", onChainChanged);
      } catch {}
      listenersBoundRef.current = false;
    };
  }, [refresh]);

  // ✅ Initial read-only refresh
  useEffect(() => {
    refresh();
  }, [refresh]);

  const chainOk = chainId === MAINNET_CHAIN_ID;

  // ---------- Inline styles (guaranteed tiles) ----------
  const S = {
    wrap: {
      padding: "28px 22px 60px",
      maxWidth: 1100,
      margin: "0 auto",
      color: "#fff",
    },
    h1: {
      fontSize: 56,
      margin: "10px 0 18px",
      letterSpacing: 0.5,
    },
    actions: {
      display: "flex",
      gap: 12,
      margin: "10px 0 18px",
      flexWrap: "wrap",
    },
    btn: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.18)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: 10,
      cursor: "pointer",
    },
    btnOk: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(70,255,140,0.45)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: 10,
      cursor: "default",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 14,
      marginTop: 10,
    },
    tile: {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 14,
      padding: "14px 14px 12px",
      minHeight: 82,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    label: { opacity: 0.85, fontSize: 13, marginBottom: 6 },
    value: { fontSize: 18, fontWeight: 600, wordBreak: "break-word" },
    mono: {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 14,
      opacity: 0.95,
    },
    uri: {
      marginTop: 14,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 14,
      padding: "12px 14px",
    },
    status: { marginTop: 12, opacity: 0.95 },
    eonRow: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
      width: 30,
      height: 30,
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(0,0,0,0.25)",
    },
    big: { fontSize: 20, fontWeight: 800, letterSpacing: 0.3 },
    sub: { fontSize: 14, opacity: 0.9, marginTop: 2 },
    // mobile-ish fallback
    gridMobile: {
      display: "grid",
      gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
      gap: 14,
      marginTop: 10,
    },
  };

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 900 : false;

  return (
    <>
      <Nav />
      <div style={S.wrap}>
        <h1 style={S.h1}>Dashboard</h1>

        <div style={S.actions}>
          {!account ? (
            <button style={S.btn} onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <button style={S.btnOk} disabled>Connected ✅</button>
          )}

          {!chainOk ? (
            <button style={S.btn} onClick={switchToMainnet}>
              Switch to {NETWORK_NAME}
            </button>
          ) : null}

          <button style={S.btn} onClick={() => refresh()}>Refresh</button>
        </div>

        <div style={isMobile ? S.gridMobile : S.grid}>
          <Tile label="Contract" value={CONTRACT_ADDRESS} mono S={S} />
          <Tile label="Connected" value={account ? shortAddr(account) : "-"} mono S={S} />
          <Tile
            label="Chain ID"
            value={
              chainId == null ? "-" : `${chainId} ${chainOk ? "(OK ✅)" : "(Wrong ❌)"}`
            }
            S={S}
          />

          <Tile label="Total Minted" value={totalMinted} S={S} />
          <Tile label="Your Cube Balance" value={cubeBalance} S={S} />
          <Tile label="Eligibility" value={eligible} S={S} />

          <div style={S.tile}>
            <div style={S.label}>Energon Token (EON)</div>
            <div style={S.eonRow}>
              <img src={EON_LOGO_URL} alt="EON" style={S.logo} />
              <div>
                <div style={S.big}>EON</div>
                <div style={S.sub}>Your Balance: {eonBalance}</div>
              </div>
            </div>
          </div>

          <Tile label="Energon Height" value={energonHeight} S={S} />
          <Tile label="Reward / Block (EON)" value={rewardPerBlockEon} S={S} />
        </div>

        <div style={S.uri}>
          <div style={S.label}>Token #1 URI</div>
          <div style={S.mono}>{tokenUri}</div>
        </div>

        <div style={S.status}>
          <b>Status:</b> {status}
        </div>
      </div>
    </>
  );
}

function Tile({ label, value, mono, S }) {
  return (
    <div style={S.tile}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.value, ...(mono ? S.mono : {}) }}>{value}</div>
    </div>
  );
}
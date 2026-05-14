import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { readQoriLiveState } from "./qori/qoriState";

export default function Nav() {
  const router = useRouter();
  const [guardianState, setGuardianState] = useState("silent");
  const [protocolPromptGlow, setProtocolPromptGlow] = useState(false);
  const previousWalletConnectedRef = useRef(false);

  const tabs = [
    { href: "/mint", label: "Mint" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/observer", label: "Observer" },
  ];

  useEffect(() => {
    async function refreshNavState() {
      try {
        const ctx = await readQoriLiveState();
        const nextState = ctx.guardianState || "silent";
        const isConnected = !!ctx.walletConnected;

        setGuardianState(nextState);

        if (!previousWalletConnectedRef.current && isConnected) {
          setProtocolPromptGlow(true);
        }

        if (!isConnected) {
          setProtocolPromptGlow(false);
        }

        previousWalletConnectedRef.current = isConnected;
      } catch {
        setGuardianState("silent");
        setProtocolPromptGlow(false);
        previousWalletConnectedRef.current = false;
      }
    }

    refreshNavState();
    const interval = setInterval(refreshNavState, 5000);

    if (typeof window !== "undefined") {
      window.addEventListener("focus", refreshNavState);
      window.addEventListener("pageshow", refreshNavState);
      window.addEventListener("energon:wallet-connected", refreshNavState);

      if (window.ethereum) {
        window.ethereum.on?.("accountsChanged", refreshNavState);
        window.ethereum.on?.("chainChanged", refreshNavState);
        window.ethereum.on?.("connect", refreshNavState);
      }
    }

    return () => {
      clearInterval(interval);

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", refreshNavState);
        window.removeEventListener("pageshow", refreshNavState);
        window.removeEventListener("energon:wallet-connected", refreshNavState);

        if (window.ethereum) {
          window.ethereum.removeListener?.("accountsChanged", refreshNavState);
          window.ethereum.removeListener?.("chainChanged", refreshNavState);
          window.ethereum.removeListener?.("connect", refreshNavState);
        }
      }
    };
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes protocolBorderPulse {
        0%, 100% {
          opacity: .45;
          transform: scale(1);
          box-shadow: var(--protocol-glow-low);
        }
        50% {
          opacity: 1;
          transform: scale(1.035);
          box-shadow: var(--protocol-glow-high);
        }
      }

      @keyframes navShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      .energon-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const stateKey = String(guardianState || "silent").toLowerCase();
  const isCoherent = stateKey === "coherent";
  const isFractured = stateKey === "fractured";

  const protocolColor = isCoherent
    ? "rgba(80,255,210,.96)"
    : isFractured
    ? "rgba(255,70,105,.96)"
    : "rgba(145,155,175,.72)";

  const glowLow = isCoherent
    ? "0 0 8px rgba(70,255,210,.16), inset 0 0 10px rgba(70,255,210,.06)"
    : isFractured
    ? "0 0 8px rgba(255,70,105,.16), inset 0 0 10px rgba(255,70,105,.06)"
    : "0 0 4px rgba(120,130,150,.08), inset 0 0 6px rgba(120,130,150,.03)";

  const glowHigh = isCoherent
    ? "0 0 22px rgba(70,255,210,.50), 0 0 42px rgba(70,255,210,.22), inset 0 0 20px rgba(70,255,210,.12)"
    : isFractured
    ? "0 0 22px rgba(255,70,105,.50), 0 0 42px rgba(255,70,105,.22), inset 0 0 20px rgba(255,70,105,.12)"
    : glowLow;

  const shouldPulse = protocolPromptGlow && (isCoherent || isFractured);

  function openQori() {
    if (typeof window === "undefined") return;
    setProtocolPromptGlow(false);
    window.dispatchEvent(new Event("energon:open-qori"));
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(14px)",
        background:
          "linear-gradient(180deg, rgba(7,10,18,.94), rgba(7,10,18,.76))",
        borderBottom: "1px solid rgba(120,170,255,.12)",
      }}
    >
      <div
        className="energon-scrollbar"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "14px 14px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={openQori}
          title={`Open Q.O.R.I · ${guardianState}`}
          aria-label="Open Q.O.R.I"
          style={{
            "--protocol-glow-low": glowLow,
            "--protocol-glow-high": glowHigh,
            position: "relative",
            flexShrink: 0,
            minWidth: 250,
            padding: "12px 18px",
            borderRadius: 18,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              border: `1px solid ${protocolColor}`,
              background:
                "linear-gradient(180deg, rgba(20,30,60,.42), rgba(8,14,28,.68))",
              boxShadow: glowLow,
              animation: shouldPulse
                ? "protocolBorderPulse 4.8s ease-in-out infinite"
                : "none",
            }}
          />

          <span
            style={{
              position: "relative",
              zIndex: 2,
              fontSize: 12,
              letterSpacing: ".34em",
              textTransform: "uppercase",
              color:
                isCoherent || isFractured
                  ? "rgba(230,244,255,.95)"
                  : "rgba(205,215,230,.74)",
              fontWeight: 800,
              whiteSpace: "nowrap",
              textShadow:
                isCoherent
                  ? "0 0 10px rgba(80,255,210,.32)"
                  : isFractured
                  ? "0 0 10px rgba(255,70,105,.32)"
                  : "0 0 6px rgba(180,190,210,.12)",
            }}
          >
            ENERGON PROTOCOL
          </span>
        </button>

        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 6,
            borderRadius: 18,
            border: "1px solid rgba(120,170,255,.18)",
            background:
              "linear-gradient(180deg, rgba(20,30,60,.58), rgba(8,14,28,.76))",
          }}
        >
          {tabs.map(({ href, label }) => {
            const active = router.pathname === href;

            return (
              <Link
                key={href}
                href={href}
                style={{
                  flexShrink: 0,
                  padding: "12px 22px",
                  borderRadius: 14,
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  color: active ? "#fff4cc" : "rgba(220,232,255,.86)",
                  border: active
                    ? "1px solid rgba(255,220,120,.42)"
                    : "1px solid transparent",
                  background: active
                    ? "linear-gradient(110deg, rgba(255,210,90,0.22) 0%, rgba(255,240,170,0.40) 40%, rgba(255,210,90,0.22) 60%)"
                    : "transparent",
                  backgroundSize: active ? "200% 100%" : undefined,
                  animation: active ? "navShimmer 7s linear infinite" : "none",
                  boxShadow: active
                    ? "0 0 18px rgba(255,200,90,.22), inset 0 0 14px rgba(255,220,140,.10)"
                    : "none",
                  textShadow: active
                    ? "0 0 12px rgba(255,225,150,.32)"
                    : "0 0 8px rgba(140,170,255,.10)",
                  transition: "all .22s ease",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

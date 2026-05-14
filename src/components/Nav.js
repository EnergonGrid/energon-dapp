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
        const wasConnected = previousWalletConnectedRef.current;

        setGuardianState(nextState);

        if (!wasConnected && isConnected) {
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
    const interval = setInterval(refreshNavState, 15000);

    if (typeof window !== "undefined") {
      window.addEventListener("focus", refreshNavState);

      if (window.ethereum) {
        window.ethereum.on?.("accountsChanged", refreshNavState);
        window.ethereum.on?.("chainChanged", refreshNavState);
      }
    }

    return () => {
      clearInterval(interval);

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", refreshNavState);

        if (window.ethereum) {
          window.ethereum.removeListener?.("accountsChanged", refreshNavState);
          window.ethereum.removeListener?.("chainChanged", refreshNavState);
        }
      }
    };
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes energonShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      @keyframes protocolSoftPulse {
        0%, 100% {
          box-shadow: var(--protocol-glow-low);
          opacity: .72;
          transform: scale(1);
        }
        50% {
          box-shadow: var(--protocol-glow-high);
          opacity: 1;
          transform: scale(1.025);
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const stateKey = String(guardianState || "silent").toLowerCase();

  const isCoherent = stateKey === "coherent";
  const isFractured = stateKey === "fractured";

  const protocolColor = isCoherent
    ? "rgba(80,255,210,.95)"
    : isFractured
    ? "rgba(255,70,105,.95)"
    : "rgba(120,130,145,.42)";

  const glowLow = isCoherent
    ? "0 0 8px rgba(70,255,210,.16), inset 0 0 10px rgba(70,255,210,.07)"
    : isFractured
    ? "0 0 8px rgba(255,70,105,.16), inset 0 0 10px rgba(255,70,105,.07)"
    : "0 0 4px rgba(120,130,145,.08), inset 0 0 8px rgba(120,130,145,.04)";

  const glowHigh = isCoherent
    ? "0 0 18px rgba(70,255,210,.42), 0 0 34px rgba(70,255,210,.20), inset 0 0 18px rgba(70,255,210,.12)"
    : isFractured
    ? "0 0 18px rgba(255,70,105,.42), 0 0 34px rgba(255,70,105,.20), inset 0 0 18px rgba(255,70,105,.12)"
    : glowLow;

  const shouldPulse = protocolPromptGlow && (isCoherent || isFractured);

  const shimmerStyle = {
    background:
      "linear-gradient(110deg, rgba(255,210,90,0.25) 0%, rgba(255,240,170,0.45) 40%, rgba(255,210,90,0.25) 60%)",
    backgroundSize: "200% 100%",
    animation: "energonShimmer 6s linear infinite",
  };

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
          "linear-gradient(180deg, rgba(7,10,18,.92), rgba(7,10,18,.72))",
        borderBottom: "1px solid rgba(120,170,255,.14)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <button
          onClick={openQori}
          title={`Open Q.O.R.I · ${guardianState}`}
          aria-label="Open Q.O.R.I"
          style={{
            "--protocol-glow-low": glowLow,
            "--protocol-glow-high": glowHigh,
            display: "inline-flex",
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: 16,
            border: `1px solid ${protocolColor}`,
            background:
              "linear-gradient(180deg, rgba(20,30,60,.42), rgba(8,14,28,.66))",
            boxShadow: shouldPulse ? undefined : glowLow,
            animation: shouldPulse
              ? "protocolSoftPulse 4.8s ease-in-out infinite"
              : "none",
            cursor: "pointer",
            transition:
              "box-shadow 1.2s ease, border-color 1.2s ease, opacity 1.2s ease, transform 1.2s ease",
          }}
        >
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color:
                isCoherent || isFractured
                  ? "rgba(230,244,255,.95)"
                  : "rgba(150,158,172,.62)",
              fontWeight: 800,
              textShadow: shouldPulse ? `0 0 10px ${protocolColor}` : "none",
              whiteSpace: "nowrap",
            }}
          >
            Energon Protocol
          </span>
        </button>

        <div
          style={{
            display: "flex",
            gap: 10,
            padding: 6,
            borderRadius: 18,
            border: "1px solid rgba(120,170,255,.18)",
            background:
              "linear-gradient(180deg, rgba(20,30,60,.58), rgba(8,14,28,.72))",
          }}
        >
          {tabs.map(({ href, label }) => {
            const active = router.pathname === href;

            return (
              <Link
                key={href}
                href={href}
                style={{
                  position: "relative",
                  padding: "10px 18px",
                  borderRadius: 14,
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 700,
                  color: active ? "#fff4cc" : "rgba(220,232,255,.86)",
                  border: active
                    ? "1px solid rgba(255,220,120,.42)"
                    : "1px solid transparent",
                  boxShadow: active
                    ? "0 0 18px rgba(255,200,90,.26), inset 0 0 14px rgba(255,220,140,.12)"
                    : "none",
                  transition: "all .22s ease",
                  ...(active ? shimmerStyle : {}),
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

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Nav({ guardianState = "silent" }) {
  const router = useRouter();

  const [hasAcknowledgedPulse, setHasAcknowledgedPulse] = useState(false);

  const tabs = [
    { href: "/mint", label: "Mint" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/observer", label: "Observer" },
  ];

  useEffect(() => {
    const style = document.createElement("style");

    style.innerHTML = `
      @keyframes protocolGlowPulse {
        0% {
          transform: scale(1);
          opacity: .82;
          box-shadow: var(--protocol-glow-low);
        }

        50% {
          transform: scale(1.018);
          opacity: 1;
          box-shadow: var(--protocol-glow-high);
        }

        100% {
          transform: scale(1);
          opacity: .82;
          box-shadow: var(--protocol-glow-low);
        }
      }

      @keyframes navShimmer {
        0% {
          background-position: -200% center;
        }

        100% {
          background-position: 200% center;
        }
      }

      .energon-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleWalletConnected = () => {
      setHasAcknowledgedPulse(false);
    };

    const handleWalletDisconnected = () => {
      setHasAcknowledgedPulse(false);
    };

    window.addEventListener(
      "energon:wallet-connected",
      handleWalletConnected
    );

    window.addEventListener(
      "energon:wallet-disconnected",
      handleWalletDisconnected
    );

    return () => {
      window.removeEventListener(
        "energon:wallet-connected",
        handleWalletConnected
      );

      window.removeEventListener(
        "energon:wallet-disconnected",
        handleWalletDisconnected
      );
    };
  }, []);

  const stateKey = String(guardianState || "silent").toLowerCase();

  const protocolColor =
    stateKey === "coherent"
      ? "rgba(80,255,210,.96)"
      : stateKey === "fractured"
      ? "rgba(255,70,105,.96)"
      : "rgba(145,155,175,.72)";

  const glowLow =
    stateKey === "coherent"
      ? "0 0 8px rgba(70,255,210,.14), inset 0 0 10px rgba(70,255,210,.05)"
      : stateKey === "fractured"
      ? "0 0 8px rgba(255,70,105,.14), inset 0 0 10px rgba(255,70,105,.05)"
      : "0 0 4px rgba(120,130,150,.08), inset 0 0 6px rgba(120,130,150,.03)";

  const glowHigh =
    stateKey === "coherent"
      ? "0 0 18px rgba(70,255,210,.38), inset 0 0 18px rgba(70,255,210,.10)"
      : stateKey === "fractured"
      ? "0 0 18px rgba(255,70,105,.38), inset 0 0 18px rgba(255,70,105,.10)"
      : "0 0 8px rgba(120,130,150,.12), inset 0 0 8px rgba(120,130,150,.05)";

  const shouldPulse =
    !hasAcknowledgedPulse &&
    (stateKey === "coherent" || stateKey === "fractured");

  function openQori() {
    if (typeof window === "undefined") return;

    setHasAcknowledgedPulse(true);

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
        className="energon-scrollbar"
      >
        <button
          onClick={openQori}
          title="Open Q.O.R.I"
          aria-label="Open Q.O.R.I"
          style={{
            "--protocol-glow-low": glowLow,
            "--protocol-glow-high": glowHigh,

            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",

            padding: "12px 18px",
            minWidth: 250,

            borderRadius: 18,
            border: `1px solid ${protocolColor}`,

            background:
              "linear-gradient(180deg, rgba(20,30,60,.42), rgba(8,14,28,.68))",

            boxShadow: shouldPulse ? undefined : glowLow,

            animation: shouldPulse
              ? "protocolGlowPulse 4.6s ease-in-out infinite"
              : "none",

            cursor: "pointer",

            transition:
              "transform .35s ease, box-shadow .35s ease, border-color .35s ease",
          }}
        >
          <span
            style={{
              fontSize: 12,
              letterSpacing: ".34em",
              textTransform: "uppercase",
              color:
                stateKey === "coherent"
                  ? "rgba(220,255,248,.96)"
                  : stateKey === "fractured"
                  ? "rgba(255,225,235,.96)"
                  : "rgba(205,215,230,.74)",

              fontWeight: 800,

              whiteSpace: "nowrap",

              textShadow:
                stateKey === "coherent"
                  ? "0 0 10px rgba(80,255,210,.32)"
                  : stateKey === "fractured"
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
                  position: "relative",

                  flexShrink: 0,

                  padding: "12px 22px",

                  borderRadius: 14,

                  textDecoration: "none",

                  fontSize: 15,
                  fontWeight: 700,

                  whiteSpace: "nowrap",

                  color: active
                    ? "#fff4cc"
                    : "rgba(220,232,255,.86)",

                  border: active
                    ? "1px solid rgba(255,220,120,.42)"
                    : "1px solid transparent",

                  background: active
                    ? "linear-gradient(110deg, rgba(255,210,90,0.22) 0%, rgba(255,240,170,0.40) 40%, rgba(255,210,90,0.22) 60%)"
                    : "transparent",

                  backgroundSize: active ? "200% 100%" : undefined,

                  animation: active
                    ? "navShimmer 7s linear infinite"
                    : "none",

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

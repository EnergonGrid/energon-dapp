import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Nav() {
  const router = useRouter();

  const tabs = [
    { href: "/mint", label: "Mint" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/observer", label: "Observer" },
  ];

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes energonShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const shimmerStyle = {
    background:
      "linear-gradient(110deg, rgba(255,210,90,0.25) 0%, rgba(255,240,170,0.45) 40%, rgba(255,210,90,0.25) 60%)",
    backgroundSize: "200% 100%",
    animation: "energonShimmer 6s linear infinite",
  };

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
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(190,220,255,.78)",
            fontWeight: 700,
          }}
        >
          Energon Protocol
        </div>

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
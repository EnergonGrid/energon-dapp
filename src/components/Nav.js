import Link from "next/link";
import { useRouter } from "next/router";

export default function Nav() {
  const router = useRouter();
  const path = router.pathname;

  const linkStyle = (href) => ({
    color: "white",
    textDecoration: "none",
    opacity: path === href ? 1 : 0.7,
    borderBottom: path === href ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
    paddingBottom: 4,
  });

  return (
    <div
      style={{
        padding: 16,
        borderBottom: "1px solid #1f2937",
        background: "#020617",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "flex",
          gap: 18,
        }}
      >
        <Link href="/mint" style={linkStyle("/mint")}>
          Mint
        </Link>

        <Link href="/dashboard" style={linkStyle("/dashboard")}>
          Dashboard
        </Link>

        <Link href="/observer" style={linkStyle("/observer")}>
          Observer
        </Link>
      </div>
    </div>
  );
}
import Link from "next/link";

export default function Nav() {
  return (
    <div style={{ padding: 16, borderBottom: "1px solid #1f2937", background: "#020617" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", gap: 16 }}>
        <Link style={{ color: "white", textDecoration: "none" }} href="/mint">Mint</Link>
        <Link style={{ color: "white", textDecoration: "none" }} href="/dashboard">Dashboard</Link>
      </div>
    </div>
  );
}
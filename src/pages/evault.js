import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import Nav from "../components/Nav";
import {
  EON_ADDRESS,
  USDT0_ADDRESS,
  WFLR_ADDRESS,
  FXRP_ADDRESS,
  EVAULT_ADDRESS,
  MAINNET_CHAIN_ID,
  NETWORK_NAME,
  RPCS,
  EXPLORER_ADDRESS,
  EON_LOGO_URI,
} from "../lib/contract";

const POLL_INTERVAL_MS = 30000;

const EVAULT_ABI = [
  "function NAME() view returns (string)",
  "function VERSION() view returns (string)",
  "function controller() view returns (address)",
  "function guardianUnlockStatus() view returns (uint256 counted, uint256 threshold, uint256 remaining, bool unlocked)",
  "function requiredReserves() view returns (uint256 eonRequired, uint256 usdt0Required, uint256 wflrRequired, uint256 fxrpRequired)",
  "function reservedEon() view returns (uint256)",
  "function reservedUsdt0() view returns (uint256)",
  "function freeReserves() view returns (uint256 eonFree, uint256 usdt0Free)",
  "function totalFeesCollectedEon() view returns (uint256)",
  "function totalFeesCollectedUsdt0() view returns (uint256)",
  "function FEE_BPS() view returns (uint256)",
  "function maturitySeconds(uint8 tier) pure returns (uint256)",
  "function maturityFeeBps(uint8 tier) pure returns (uint256)",
  "function CLAIM_EXPIRY_SECONDS() view returns (uint256)",
  "function MAX_OPEN_CLAIMS_PER_WALLET() view returns (uint256)",
  "function COMMIT_COOLDOWN_SECONDS() view returns (uint256)",
  "function PRICE_WINDOW_SECONDS() view returns (uint256)",
  "function MAX_EON_PRICE_DROP_PER_HOUR_BPS() view returns (uint256)",
  "function MAX_EON_PRICE_RISE_PER_HOUR_BPS() view returns (uint256)",
  "function GUARDIAN_ACTIVATION_DELAY_SECONDS() view returns (uint256)",
  "function LIABILITY_FLOOR_BPS() view returns (uint256)",
  "function effectiveUsdt0PerEon_1e18() view returns (uint256)",
  "function currentPriceCheckpoint() view returns (uint256 checkpointPriceUsdt0PerEon_1e18, uint256 checkpointAt)",
];

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
];

const TOKEN_META = Object.freeze({
  EON: { address: EON_ADDRESS, decimals: 18, color: "#36d8ff" },
  USDT0: { address: USDT0_ADDRESS, decimals: 6, color: "#55ef91" },
  WFLR: { address: WFLR_ADDRESS, decimals: 18, color: "#ff5c84" },
  FXRP: { address: FXRP_ADDRESS, decimals: 6, color: "#a66bff" },
});

function formatToken(value, decimals, maxFrac = 4) {
  try {
    const raw = ethers.formatUnits(value ?? 0n, decimals);
    const n = Number(raw);

    if (!Number.isFinite(n)) return raw;

    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac,
    });
  } catch {
    return "—";
  }
}

function formatPrice(value) {
  try {
    if (!value || value <= 0n) return "—";
    return Number(ethers.formatUnits(value, 18)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  } catch {
    return "—";
  }
}

function formatBps(value) {
  try {
    return (Number(value ?? 0n) / 100).toFixed(2) + "%";
  } catch {
    return "—";
  }
}

function formatDuration(value) {
  try {
    const total = Math.max(0, Number(value ?? 0n));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (days > 0) return days + "d " + hours + "h";
    if (hours > 0) return hours + "h " + minutes + "m";
    return minutes + "m";
  } catch {
    return "—";
  }
}

function shortAddress(address) {
  if (!address || !ethers.isAddress(address)) return "—";
  return address.slice(0, 8) + "…" + address.slice(-6);
}

function coveragePercent(balance, required) {
  try {
    const bal = BigInt(balance ?? 0n);
    const req = BigInt(required ?? 0n);
    if (req <= 0n) return 0;
    return Number((bal * 10000n) / req) / 100;
  } catch {
    return 0;
  }
}

function statusTone(ok) {
  return ok
    ? {
        color: "#79ffc2",
        border: "rgba(68,255,179,.34)",
        bg: "rgba(38,180,122,.10)",
        glow: "0 0 18px rgba(68,255,179,.10)",
      }
    : {
        color: "#ff8b9e",
        border: "rgba(255,92,124,.30)",
        bg: "rgba(180,44,70,.10)",
        glow: "0 0 18px rgba(255,92,124,.08)",
      };
}

function StatusBadge({ ok, children }) {
  const tone = statusTone(ok);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid " + tone.border,
        background: tone.bg,
        boxShadow: tone.glow,
        color: tone.color,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: tone.color,
          boxShadow: "0 0 10px " + tone.color,
        }}
      />
      {children}
    </span>
  );
}

function StatRow({ label, value, valueColor }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
        padding: "9px 0",
        borderBottom: "1px solid rgba(255,255,255,.055)",
        fontSize: 13,
      }}
    >
      <span style={{ color: "rgba(216,226,245,.68)" }}>{label}</span>
      <strong
        style={{
          color: valueColor || "rgba(246,250,255,.96)",
          textAlign: "right",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section
      style={{
        borderRadius: 18,
        border: "1px solid rgba(125,175,255,.12)",
        background:
          "linear-gradient(180deg, rgba(17,25,43,.78), rgba(6,10,18,.88))",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,.025), 0 18px 46px rgba(0,0,0,.22)",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: "15px 16px 13px",
          borderBottom: "1px solid rgba(125,175,255,.08)",
        }}
      >
        <div
          style={{
            color: "rgba(246,250,255,.97)",
            fontSize: 16,
            fontWeight: 950,
            letterSpacing: ".02em",
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 5,
              color: "rgba(196,210,235,.56)",
              fontSize: 11,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}

function ReserveMeter({
  label,
  balance,
  reserved = 0n,
  free,
  required,
  decimals,
  color,
  useFreeForCoverage = false,
}) {
  const coverageBase = useFreeForCoverage ? free : balance;
  const pct = coveragePercent(coverageBase, required);
  const bar = Math.max(0, Math.min(100, pct));
  const met = BigInt(coverageBase ?? 0n) >= BigInt(required ?? 0n);

  return (
    <div
      style={{
        padding: "12px 0 14px",
        borderBottom: "1px solid rgba(255,255,255,.055)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 9,
        }}
      >
        <strong style={{ color: "rgba(247,250,255,.96)" }}>{label}</strong>
        <span
          style={{
            color: met ? "#79ffc2" : "#ff8b9e",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: ".07em",
          }}
        >
          {pct.toFixed(2)}% OF REQUIRED
        </span>
      </div>

      <div
        style={{
          height: 9,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.10)",
          background: "rgba(255,255,255,.055)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: bar + "%",
            height: "100%",
            borderRadius: 999,
            background: color,
            boxShadow: "0 0 16px " + color + "55",
            transition: "width .3s ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          color: "rgba(196,210,235,.68)",
          fontSize: 11,
        }}
      >
        <span>
          Balance{" "}
          <strong style={{ color: "rgba(245,249,255,.94)" }}>
            {formatToken(balance, decimals)}
          </strong>
        </span>
        <span style={{ textAlign: "right" }}>
          Required{" "}
          <strong style={{ color: "rgba(245,249,255,.94)" }}>
            {formatToken(required, decimals)}
          </strong>
        </span>

        {useFreeForCoverage ? (
          <>
            <span>
              Reserved{" "}
              <strong style={{ color: "rgba(245,249,255,.94)" }}>
                {formatToken(reserved, decimals)}
              </strong>
            </span>
            <span style={{ textAlign: "right" }}>
              Free{" "}
              <strong style={{ color: "rgba(245,249,255,.94)" }}>
                {formatToken(free, decimals)}
              </strong>
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

async function readVault(provider) {
  const vault = new ethers.Contract(EVAULT_ADDRESS, EVAULT_ABI, provider);
  const eon = new ethers.Contract(EON_ADDRESS, ERC20_ABI, provider);
  const usdt0 = new ethers.Contract(USDT0_ADDRESS, ERC20_ABI, provider);
  const wflr = new ethers.Contract(WFLR_ADDRESS, ERC20_ABI, provider);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);

  const [
    name,
    version,
    controller,
    guardianUnlock,
    requiredReserves,
    reservedEon,
    reservedUsdt0,
    freeReserves,
    feesEon,
    feesUsdt0,
    baseFeeBps,
    maturityFree,
    maturityFast,
    maturityRapid,
    maturityFreeFee,
    maturityFastFee,
    maturityRapidFee,
    claimExpiry,
    maxOpenClaims,
    commitCooldown,
    priceWindow,
    maxPriceDrop,
    maxPriceRise,
    guardianActivationDelay,
    liabilityFloorBps,
    eonBalance,
    usdt0Balance,
    wflrBalance,
    fxrpBalance,
  ] = await Promise.all([
    vault.NAME(),
    vault.VERSION(),
    vault.controller(),
    vault.guardianUnlockStatus(),
    vault.requiredReserves(),
    vault.reservedEon(),
    vault.reservedUsdt0(),
    vault.freeReserves(),
    vault.totalFeesCollectedEon(),
    vault.totalFeesCollectedUsdt0(),
    vault.FEE_BPS(),
    vault.maturitySeconds(0),
    vault.maturitySeconds(1),
    vault.maturitySeconds(2),
    vault.maturityFeeBps(0),
    vault.maturityFeeBps(1),
    vault.maturityFeeBps(2),
    vault.CLAIM_EXPIRY_SECONDS(),
    vault.MAX_OPEN_CLAIMS_PER_WALLET(),
    vault.COMMIT_COOLDOWN_SECONDS(),
    vault.PRICE_WINDOW_SECONDS(),
    vault.MAX_EON_PRICE_DROP_PER_HOUR_BPS(),
    vault.MAX_EON_PRICE_RISE_PER_HOUR_BPS(),
    vault.GUARDIAN_ACTIVATION_DELAY_SECONDS(),
    vault.LIABILITY_FLOOR_BPS(),
    eon.balanceOf(EVAULT_ADDRESS),
    usdt0.balanceOf(EVAULT_ADDRESS),
    wflr.balanceOf(EVAULT_ADDRESS),
    fxrp.balanceOf(EVAULT_ADDRESS),
  ]);

  let effectivePrice = 0n;
  let checkpointPrice = 0n;
  let checkpointAt = 0n;

  try {
    effectivePrice = await vault.effectiveUsdt0PerEon_1e18();
  } catch {}

  try {
    const checkpoint = await vault.currentPriceCheckpoint();
    checkpointPrice = checkpoint[0] ?? 0n;
    checkpointAt = checkpoint[1] ?? 0n;
  } catch {}

  return {
    name,
    version,
    controller,
    guardian: {
      counted: guardianUnlock[0] ?? 0n,
      threshold: guardianUnlock[1] ?? 0n,
      remaining: guardianUnlock[2] ?? 0n,
      unlocked: Boolean(guardianUnlock[3]),
    },
    required: {
      eon: requiredReserves[0] ?? 0n,
      usdt0: requiredReserves[1] ?? 0n,
      wflr: requiredReserves[2] ?? 0n,
      fxrp: requiredReserves[3] ?? 0n,
    },
    reserved: {
      eon: reservedEon ?? 0n,
      usdt0: reservedUsdt0 ?? 0n,
    },
    free: {
      eon: freeReserves[0] ?? 0n,
      usdt0: freeReserves[1] ?? 0n,
    },
    balances: {
      eon: eonBalance ?? 0n,
      usdt0: usdt0Balance ?? 0n,
      wflr: wflrBalance ?? 0n,
      fxrp: fxrpBalance ?? 0n,
    },
    fees: {
      eon: feesEon ?? 0n,
      usdt0: feesUsdt0 ?? 0n,
    },
    rules: {
      baseFeeBps,
      maturityFree,
      maturityFast,
      maturityRapid,
      maturityFreeFee,
      maturityFastFee,
      maturityRapidFee,
      claimExpiry,
      maxOpenClaims,
      commitCooldown,
      priceWindow,
      maxPriceDrop,
      maxPriceRise,
      guardianActivationDelay,
      liabilityFloorBps,
    },
    price: {
      effective: effectivePrice,
      checkpoint: checkpointPrice,
      checkpointAt,
    },
  };
}

export default function EVaultPage() {
  const rpcList = useMemo(() => {
    const configured = RPCS?.[MAINNET_CHAIN_ID];
    if (Array.isArray(configured)) return configured.filter(Boolean);
    return configured ? [configured] : [];
  }, []);

  const [data, setData] = useState(null);
  const [readState, setReadState] = useState("Connecting to Flare Mainnet…");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rpcIndex, setRpcIndex] = useState(0);
  const rpcIndexRef = useRef(0);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (refreshInFlightRef.current || !rpcList.length) return;

      refreshInFlightRef.current = true;
      let lastError = null;

      try {
        for (let attempt = 0; attempt < rpcList.length; attempt += 1) {
          const index = (rpcIndexRef.current + attempt) % rpcList.length;

          try {
            if (active) setReadState("Reading EVault from Flare Mainnet…");

            const provider = new ethers.JsonRpcProvider(
              rpcList[index],
              MAINNET_CHAIN_ID
            );

            const network = await provider.getNetwork();

            if (Number(network.chainId) !== MAINNET_CHAIN_ID) {
              throw new Error("Unexpected RPC chain ID");
            }

            const next = await readVault(provider);

            if (!active) return;

            rpcIndexRef.current = index;
            setRpcIndex(index);
            setData(next);
            setLastUpdated(new Date());
            setReadState("Live Mainnet read");
            return;
          } catch (error) {
            lastError = error;
          }
        }

        if (active) {
          setReadState(
            data
              ? "RPC refresh failed — preserving last known state"
              : "Unable to read EVault from configured RPCs"
          );
        }
      } finally {
        refreshInFlightRef.current = false;

        if (lastError && typeof console !== "undefined") {
          console.warn("EVault read refresh failed:", lastError);
        }
      }
    }

    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);

    if (typeof window !== "undefined") {
      window.addEventListener("focus", refresh);
      window.addEventListener("pageshow", refresh);
    }

    return () => {
      active = false;
      clearInterval(timer);

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", refresh);
        window.removeEventListener("pageshow", refresh);
      }
    };
  }, [rpcList]);

  const reserveGateMet = Boolean(
    data &&
      data.free.eon >= data.required.eon &&
      data.free.usdt0 >= data.required.usdt0 &&
      data.balances.wflr >= data.required.wflr &&
      data.balances.fxrp >= data.required.fxrp
  );

  const exchangeGateMet = Boolean(data?.guardian?.unlocked && reserveGateMet);

  const css =
    ".evaultShell{min-height:100vh;background:#000;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Courier New',monospace}.evaultPage{max-width:1280px;margin:0 auto;padding:18px 18px 64px}.evaultHero{display:flex;align-items:center;justify-content:center;gap:14px;min-height:145px;border-radius:20px;border:1px solid rgba(110,170,255,.10);background:radial-gradient(circle at 50% 0%,rgba(32,84,135,.14),transparent 50%),#020305;overflow:hidden}.evaultHero img{width:112px;height:112px;border-radius:50%;object-fit:cover}.evaultHeroTitle{font-size:clamp(34px,5vw,58px);font-weight:950;letter-spacing:.11em;line-height:1}.evaultHeroSub{margin-top:7px;text-align:center;color:rgba(255,255,255,.72);font-size:clamp(9px,1.2vw,13px);font-weight:900;letter-spacing:.32em}.evaultTop{margin-top:14px;padding:14px;border:1px solid rgba(110,170,255,.12);border-radius:16px;background:linear-gradient(180deg,rgba(14,22,39,.76),rgba(6,10,18,.86));display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}.evaultGrid3{margin-top:14px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.evaultGrid2{margin-top:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.evaultNote{margin-top:14px;padding:14px 16px;border-radius:15px;border:1px solid rgba(255,204,90,.18);background:rgba(255,204,90,.055);color:rgba(244,234,202,.78);font-size:12px;line-height:1.7}.evaultLink{color:#83c8ff;text-decoration:none;font-weight:900}.evaultLink:hover{text-decoration:underline}@media(max-width:1020px){.evaultGrid3{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.evaultPage{padding:12px 10px 42px}.evaultHero{min-height:126px;gap:8px}.evaultHero img{width:82px;height:82px}.evaultHeroTitle{font-size:30px;letter-spacing:.08em}.evaultHeroSub{font-size:8px;letter-spacing:.22em}.evaultGrid3,.evaultGrid2{grid-template-columns:1fr}.evaultTop{align-items:flex-start;flex-direction:column}}";

  return (
    <div className="evaultShell">
      <style>{css}</style>
      <Nav />

      <main className="evaultPage">
        <section className="evaultHero">
          <img src={EON_LOGO_URI} alt="Energon" draggable={false} />

          <div>
            <div className="evaultHeroTitle">ENERGON</div>
            <div className="evaultHeroSub">MANAGEMENT PROTOCOL</div>
          </div>
        </section>

        <div className="evaultTop">
          <div>
            <div
              style={{
                color: "rgba(246,250,255,.96)",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              EVault · Mainnet Observation
            </div>
            <div
              style={{
                marginTop: 5,
                color: "rgba(196,210,235,.62)",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              Production EVault state on {NETWORK_NAME}. This interface is
              intentionally read-only during staged rollout.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <StatusBadge ok={Boolean(data)}>Chain {MAINNET_CHAIN_ID}</StatusBadge>
            <StatusBadge ok={exchangeGateMet}>
              {exchangeGateMet ? "Protocol Gates Met" : "Protocol Locked"}
            </StatusBadge>
            <StatusBadge ok={false}>Read Only</StatusBadge>
          </div>
        </div>

        <div className="evaultGrid3">
          <Panel title="Vault State" subtitle="Reserve coverage">
            <ReserveMeter
              label="EON"
              balance={data?.balances?.eon ?? 0n}
              reserved={data?.reserved?.eon ?? 0n}
              free={data?.free?.eon ?? 0n}
              required={data?.required?.eon ?? 0n}
              decimals={TOKEN_META.EON.decimals}
              color={TOKEN_META.EON.color}
              useFreeForCoverage
            />

            <ReserveMeter
              label="USDT0"
              balance={data?.balances?.usdt0 ?? 0n}
              reserved={data?.reserved?.usdt0 ?? 0n}
              free={data?.free?.usdt0 ?? 0n}
              required={data?.required?.usdt0 ?? 0n}
              decimals={TOKEN_META.USDT0.decimals}
              color={TOKEN_META.USDT0.color}
              useFreeForCoverage
            />

            <ReserveMeter
              label="WFLR"
              balance={data?.balances?.wflr ?? 0n}
              required={data?.required?.wflr ?? 0n}
              decimals={TOKEN_META.WFLR.decimals}
              color={TOKEN_META.WFLR.color}
            />

            <ReserveMeter
              label="FXRP"
              balance={data?.balances?.fxrp ?? 0n}
              required={data?.required?.fxrp ?? 0n}
              decimals={TOKEN_META.FXRP.decimals}
              color={TOKEN_META.FXRP.color}
            />
          </Panel>

          <Panel title="Vault Balances" subtitle="Live production reserves">
            <StatRow
              label="EON"
              value={formatToken(data?.balances?.eon, 18) + " EON"}
              valueColor={TOKEN_META.EON.color}
            />
            <StatRow
              label="USDT0"
              value={formatToken(data?.balances?.usdt0, 6) + " USDT0"}
              valueColor={TOKEN_META.USDT0.color}
            />
            <StatRow
              label="WFLR"
              value={formatToken(data?.balances?.wflr, 18) + " WFLR"}
              valueColor={TOKEN_META.WFLR.color}
            />
            <StatRow
              label="FXRP"
              value={formatToken(data?.balances?.fxrp, 6) + " FXRP"}
              valueColor={TOKEN_META.FXRP.color}
            />

            <div style={{ height: 10 }} />

            <StatRow
              label="EON free"
              value={formatToken(data?.free?.eon, 18)}
            />
            <StatRow
              label="EON reserved"
              value={formatToken(data?.reserved?.eon, 18)}
            />
            <StatRow
              label="USDT0 free"
              value={formatToken(data?.free?.usdt0, 6)}
            />
            <StatRow
              label="USDT0 reserved"
              value={formatToken(data?.reserved?.usdt0, 6)}
            />

            <div style={{ height: 10 }} />

            <StatRow
              label="Effective EON price"
              value={
                formatPrice(data?.price?.effective) === "—"
                  ? "—"
                  : formatPrice(data?.price?.effective) + " USDT0"
              }
            />
            <StatRow
              label="EON fees collected"
              value={formatToken(data?.fees?.eon, 18)}
            />
            <StatRow
              label="USDT0 fees collected"
              value={formatToken(data?.fees?.usdt0, 6)}
            />
          </Panel>

          <Panel title="Access State" subtitle="Guardian threshold and protocol gate">
            <StatRow
              label="Coherent Guardians"
              value={
                data
                  ? data.guardian.counted.toLocaleString() +
                    " / " +
                    data.guardian.threshold.toLocaleString()
                  : "—"
              }
            />
            <StatRow
              label="Remaining to unlock"
              value={
                data ? data.guardian.remaining.toLocaleString() : "—"
              }
            />
            <StatRow
              label="Guardian threshold"
              value={
                <StatusBadge ok={Boolean(data?.guardian?.unlocked)}>
                  {data?.guardian?.unlocked ? "Met" : "Locked"}
                </StatusBadge>
              }
            />
            <StatRow
              label="Reserve minimums"
              value={
                <StatusBadge ok={reserveGateMet}>
                  {reserveGateMet ? "Met" : "Not Met"}
                </StatusBadge>
              }
            />
            <StatRow
              label="Exchange activity"
              value={
                <StatusBadge ok={exchangeGateMet}>
                  {exchangeGateMet ? "Ready" : "Locked"}
                </StatusBadge>
              }
            />
            <StatRow
              label="Public EVault UI"
              value={<StatusBadge ok={false}>Observation Only</StatusBadge>}
            />

            <div
              style={{
                marginTop: 14,
                color: "rgba(196,210,235,.60)",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              No approve, commit, claim, contribution, synchronization,
              withdrawal, or controller transaction controls are exposed here.
            </div>
          </Panel>
        </div>

        <div className="evaultGrid2">
          <Panel title="Deterministic Rules" subtitle="Read directly from EVault">
            <StatRow
              label="Base fee parameter"
              value={formatBps(data?.rules?.baseFeeBps)}
            />
            <StatRow
              label="Free maturity"
              value={
                data
                  ? formatDuration(data.rules.maturityFree) +
                    " / " +
                    formatBps(data.rules.maturityFreeFee)
                  : "—"
              }
            />
            <StatRow
              label="Fast maturity"
              value={
                data
                  ? formatDuration(data.rules.maturityFast) +
                    " / " +
                    formatBps(data.rules.maturityFastFee)
                  : "—"
              }
            />
            <StatRow
              label="Rapid maturity"
              value={
                data
                  ? formatDuration(data.rules.maturityRapid) +
                    " / " +
                    formatBps(data.rules.maturityRapidFee)
                  : "—"
              }
            />
            <StatRow
              label="Claim expiry"
              value={data ? formatDuration(data.rules.claimExpiry) : "—"}
            />
            <StatRow
              label="Max open claims"
              value={data ? data.rules.maxOpenClaims.toString() : "—"}
            />
            <StatRow
              label="Commit cooldown"
              value={data ? formatDuration(data.rules.commitCooldown) : "—"}
            />
            <StatRow
              label="Guardian activation delay"
              value={
                data
                  ? formatDuration(data.rules.guardianActivationDelay)
                  : "—"
              }
            />
            <StatRow
              label="Price window"
              value={data ? formatDuration(data.rules.priceWindow) : "—"}
            />
            <StatRow
              label="Max EON drop / hour"
              value={formatBps(data?.rules?.maxPriceDrop)}
            />
            <StatRow
              label="Max EON rise / hour"
              value={formatBps(data?.rules?.maxPriceRise)}
            />
            <StatRow
              label="Liability floor"
              value={formatBps(data?.rules?.liabilityFloorBps)}
            />
          </Panel>

          <Panel title="Protocol Identity" subtitle="Verified Flare Mainnet deployment">
            <StatRow label="Name" value={data?.name || "Energon EVault"} />
            <StatRow label="Version" value={data?.version || "—"} />
            <StatRow label="Network" value={NETWORK_NAME} />
            <StatRow label="Chain ID" value={String(MAINNET_CHAIN_ID)} />
            <StatRow
              label="EVault"
              value={shortAddress(EVAULT_ADDRESS)}
            />
            <StatRow
              label="Controller"
              value={shortAddress(data?.controller)}
            />
            <StatRow
              label="RPC"
              value={rpcList[rpcIndex] ? "Provider " + (rpcIndex + 1) : "—"}
            />
            <StatRow
              label="Last refresh"
              value={lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
            />
            <StatRow label="Read status" value={readState} />

            <a
              className="evaultLink"
              href={EXPLORER_ADDRESS(EVAULT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                marginTop: 16,
                padding: "9px 12px",
                borderRadius: 11,
                border: "1px solid rgba(100,180,255,.22)",
                background: "rgba(80,160,255,.06)",
              }}
            >
              View EVault on Flarescan ↗
            </a>
          </Panel>
        </div>

        <div className="evaultNote">
          EVault is live on Flare Mainnet, but the public Energon interface is
          currently observation-only. Transaction functions will be introduced
          separately and tested one Mainnet action at a time before public use.
        </div>
      </main>
    </div>
  );
}

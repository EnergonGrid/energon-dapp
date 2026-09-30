import { ethers } from "ethers";
import {
  ABI,
  CONTRACT_ADDRESS,
  MAINNET_CHAIN_ID,
  RPCS,
} from "../../lib/contract";

const CONTROLLER_ADDRESS_LOCKED =
  "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

const CONTROLLER_ABI = [
  "function energonHeight() view returns (uint256)",
  "function secondsUntilNextEnergonBlock() view returns (uint256)",
  "function burnPoolRemaining() view returns (uint256)",
  "function launchTime() view returns (uint256)",
  "function lastHalvingTime() view returns (uint256)",
  "function halvingInterval() view returns (uint256)",
];

const GENESIS_DATE = new Date("2025-12-20T00:00:00Z");

const PROTOCOL_ERAS = [
  "Genesis Era",
  "Signal Era",
  "Observer Era",
  "Guardian Era",
  "Coherence Era",
  "Sync Era",
  "Convergence Era",
  "Stability Era",
  "Resonance Era",
  "Pulse Era",
  "Echo Era",
  "Threshold Era",
  "Alignment Era",
  "Grid Era",
  "Continuum Era",
  "Drift Era",
  "Dimming Era",
  "Low Signal Era",
  "Silence Era",
  "Horizon Era",
  "Vector Era",
  "Relay Era",
  "Ascension Era",
  "Orbit Era",
  "Apex Era",
  "Reflection Era",
  "Synchrony Era",
  "Beacon Era",
  "Current Era",
  "Fracture Era",
  "Nexus Era",
  "Attunement Era",
  "Equilibrium Era",
  "Compression Era",
  "Static Era",
  "Fade Era",
  "Emberlight Era",
  "Hollow Era",
  "Shroud Era",
  "Attenuation Era",
  "Null Era",
  "Phantom Era",
  "Veil Era",
  "Lattice Era",
  "Cascade Era",
  "Meridian Era",
  "Zenith Era",
  "Ecliptic Era",
  "Aurora Era",
  "Obsidian Era",
  "Twilight Era",
  "Abyss Era",
  "Rift Era",
  "Solstice Era",
  "Collapse Era",
  "Remnant Era",
  "Ember Era",
  "Ash Era",
  "Fading Era",
  "Dusk Era",
  "Deep Silence Era",
  "Final Pulse Era",
  "Last Signal Era",
  "Endstate Era",
  "Terminal Era",
];

function getProtocolEra(launchTimeSec = 0) {
  const now = Date.now();

  const onChainLaunch = Number(launchTimeSec || 0);
  const genesis =
    Number.isFinite(onChainLaunch) && onChainLaunch > 0
      ? onChainLaunch * 1000
      : GENESIS_DATE.getTime();

  if (now <= genesis) return PROTOCOL_ERAS[0];

  const yearsElapsed = (now - genesis) / (1000 * 60 * 60 * 24 * 365.25);
  const eraIndex = Math.floor(yearsElapsed / 4);

  return PROTOCOL_ERAS[Math.min(eraIndex, PROTOCOL_ERAS.length - 1)];
}

function formatDateFromUnix(sec) {
  try {
    const n = Number(sec || 0);
    if (!Number.isFinite(n) || n <= 0) return "";
    return new Date(n * 1000).toLocaleDateString();
  } catch {
    return "";
  }
}

function formatCountdown(seconds) {
  const s = Math.max(0, Number(seconds || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatNumber(value) {
  try {
    const n = Number(String(value || "0").replace(/,/g, ""));
    if (!Number.isFinite(n)) return String(value || "UNKNOWN");
    return n.toLocaleString();
  } catch {
    return String(value || "UNKNOWN");
  }
}

export function formatProtocolEraDisplay(ctx = {}) {
  const era = String(ctx.protocolEra || "").trim();
  const source = String(ctx.protocolEraSource || "UNKNOWN").trim();

  if (!era || era === "UNKNOWN" || source === "UNKNOWN") {
    return "UNKNOWN";
  }

  if (source === "FALLBACK") {
    return `${era} · canonical fallback`;
  }

  return era;
}

function getRpcUrls() {
  const value = RPCS?.[MAINNET_CHAIN_ID];

  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean))];
  }

  if (typeof value === "string" && value) {
    return [value];
  }

  return [];
}

async function createWorkingProvider() {
  const urls = getRpcUrls();

  for (const url of urls) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      return provider;
    } catch {}
  }

  return null;
}

function createBaseCtx() {
  return {
    walletConnected: false,
    walletAddress: "",
    // An unread balance does not establish zero ownership.
    guardianState: "UNKNOWN",
    cubeBalance: "-",
    energonHeight: "UNKNOWN",
    tickState: "UNKNOWN",
    burnState: "UNKNOWN",
    halvingState: "ACTIVE CYCLE",
    nextHalvingDate: "",
    halvingCountdown: "",
    protocolEra: getProtocolEra(),
    protocolEraSource: "FALLBACK",
  };
}

export function getStateVisuals(state = "UNKNOWN", silent = false) {
  if (state === "COHERENT") {
    return {
      color: "#00ffc6",
      border: "1px solid rgba(0,255,198,0.45)",
      shadow:
        "0 0 12px rgba(0,255,198,0.85), 0 0 28px rgba(0,255,198,0.35)",
    };
  }

  if (state === "FRACTURED") {
    return {
      color: "#ff7070",
      border: "1px solid rgba(255,80,80,0.45)",
      shadow:
        "0 0 12px rgba(255,80,80,0.85), 0 0 28px rgba(255,80,80,0.35)",
    };
  }

  if (state === "VISITOR") {
    return {
      color: "#1ec8ff",
      border: "1px solid rgba(30,200,255,0.45)",
      shadow:
        "0 0 12px rgba(30,200,255,0.75), 0 0 28px rgba(30,200,255,0.25)",
    };
  }

  return {
    color: "#24d6ff",
    border: "1px solid rgba(47,212,255,0.35)",
    shadow: silent
      ? "0 0 4px rgba(47,212,255,0.18)"
      : "0 0 8px rgba(47,212,255,0.28)",
  };
}

export function getVisitorObservation() {
  return `VISITOR Q.O.R.I

Public interface active.

This version of Q.O.R.I is a teacher and guide.

It explains:

• Energon
• EnergonGrid
• EnergonCube
• wallet setup
• Whitepaper
• EMP
• Mint access
• Guardian Chronicle

No wallet state is required here.

Energon begins with understanding.
Guardian access begins with one EnergonCube.

The Grid is visible.
Entry requires a key.`;
}

export function getSystemObservation(ctx = {}) {
  if (ctx.walletConnected && ctx.cubeBalance === "1" && ctx.guardianState === "COHERENT") {
    return `SYSTEM OBSERVATION

Guardian coherence confirmed.

One EnergonCube detected.

Energon Height:
${formatNumber(ctx.energonHeight || "UNKNOWN")}

Next protocol advancement:
${ctx.tickState || "UNKNOWN"}

Burn Pool:
${ctx.burnState || "UNKNOWN"}

Current Era:
${formatProtocolEraDisplay(ctx)}

Live protocol state received.

Q.O.R.I reports only observable state.

Q.O.R.I observes.
Q.O.R.I does not intervene.`;
  }

  if (ctx.walletConnected && ctx.guardianState === "FRACTURED") {
    return `SYSTEM OBSERVATION

FRACTURED STATE DETECTED.

Cube Balance:
${ctx.cubeBalance || "UNKNOWN"}

Guardian coherence requires exactly one EnergonCube.

One wallet.
One cube.
One Guardian.

Q.O.R.I observes.
Q.O.R.I does not intervene.`;
  }

  return `PUBLIC TERMINAL

Guardian signal not coherent.

Wallet Connected:
${ctx.walletConnected ? "YES" : "NO"}

Cube Balance:
${ctx.cubeBalance || "-"}

Current State:
${ctx.guardianState || "NO KEY"}

Coherent Q.O.R.I requires:

Wallet connected.
Exactly one EnergonCube.

Q.O.R.I remains in public guidance mode.`;
}

export async function readQoriLiveState() {
  const baseCtx = createBaseCtx();

  // Resolve browser-wallet identity independently of public RPC health.
  // A temporary public RPC failure must not look like a wallet disconnect.
  let walletAddress = "";

  if (typeof window !== "undefined" && window.ethereum) {
    try {
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      const walletChainId = Number(chainId);

      if (
        Number.isFinite(walletChainId) &&
        walletChainId === Number(MAINNET_CHAIN_ID)
      ) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        walletAddress = accounts?.[0] || "";

        if (walletAddress) {
          baseCtx.walletConnected = true;
          baseCtx.walletAddress = walletAddress;
        }
      }
    } catch {
      // Leave wallet identity unresolved rather than inventing one.
    }
  }

  try {
    const roProvider = await createWorkingProvider();
    if (!roProvider) return baseCtx;

    const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, roProvider);

    let ctrl = CONTROLLER_ADDRESS_LOCKED;

    try {
      const onChainCtrl = await cube.controller();
      if (onChainCtrl && onChainCtrl !== ethers.ZeroAddress) {
        ctrl = onChainCtrl;
      }
    } catch {}

    try {
      const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, roProvider);

      try {
        const h = await controller.energonHeight();
        baseCtx.energonHeight = h.toString();
      } catch {}

      try {
        const launch = await controller.launchTime();
        baseCtx.protocolEra = getProtocolEra(launch.toString());
        baseCtx.protocolEraSource = "CHAIN";
      } catch {}

      try {
        const sec = await controller.secondsUntilNextEnergonBlock();
        const n = Number(sec.toString());
        baseCtx.tickState = n === 0 ? "TICK ALLOWED" : formatCountdown(n);
      } catch {}

      try {
        const remaining = await controller.burnPoolRemaining();
        const formattedRemaining = ethers.formatUnits(remaining, 18);

        const cleanRemaining = Number(formattedRemaining).toLocaleString(
          undefined,
          { maximumFractionDigits: 2 }
        );

        baseCtx.burnState = `${cleanRemaining} EON Remaining`;
      } catch {}

      try {
        const lastHalving = await controller.lastHalvingTime();
        const interval = await controller.halvingInterval();

        const next =
          Number(lastHalving.toString()) + Number(interval.toString());

        if (next > 0) {
          const nowSec = Math.floor(Date.now() / 1000);

          baseCtx.nextHalvingDate = formatDateFromUnix(next);
          baseCtx.halvingCountdown = formatCountdown(next - nowSec);
          baseCtx.halvingState =
            nowSec >= next ? "HALVING TIME REACHED" : "ACTIVE CYCLE";
        }
      } catch {}
    } catch {}

    const addr = walletAddress;

    if (!addr) {
      return baseCtx;
    }

    try {
      const bal = await cube.balanceOf(addr);
      const n = Number(bal.toString());

      baseCtx.cubeBalance = String(n);

      if (n === 1) {
        baseCtx.guardianState = "COHERENT";
      } else if (n > 1) {
        baseCtx.guardianState = "FRACTURED";
      } else {
        baseCtx.guardianState = "NO KEY";
      }
    } catch {
      baseCtx.guardianState = "UNKNOWN";
      baseCtx.cubeBalance = "-";
    }

    if (!baseCtx.walletConnected || baseCtx.cubeBalance !== "1") {
      if (baseCtx.guardianState === "COHERENT") {
        baseCtx.guardianState = "NO KEY";
      }
    }

    return baseCtx;
  } catch {
    return baseCtx;
  }
}
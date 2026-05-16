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

function getProtocolEra() {
  const now = Date.now();
  const genesis = GENESIS_DATE.getTime();

  if (now <= genesis) return PROTOCOL_ERAS[0];

  const yearsElapsed =
    (now - genesis) / (1000 * 60 * 60 * 24 * 365.25);

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

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getRpcUrl() {
  const v = RPCS?.[MAINNET_CHAIN_ID];

  if (Array.isArray(v)) return v.filter(Boolean)[0] || "";
  if (typeof v === "string") return v;

  return "";
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
      color: "#ffcf6b",
      border: "1px solid rgba(255,207,107,0.34)",
      shadow:
        "0 0 12px rgba(255,207,107,0.55), 0 0 28px rgba(255,207,107,0.18)",
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
  return `Q.O.R.I observes from the public gate.

No wallet state is required here.

Energon begins with understanding.
Guardian access begins with one EnergonCube.

No cube means NO KEY.
One cube means COHERENT.
More than one cube means FRACTURED.

The Grid is visible.
Entry requires a key.`;
}

export function getSystemObservation(ctx = {}) {
  return `SYSTEM OBSERVATION:

State: ${ctx.guardianState || "UNKNOWN"}
Cube Balance: ${ctx.cubeBalance || "-"}
Energon Height: ${ctx.energonHeight || "UNKNOWN"}
Tick State: ${ctx.tickState || "UNKNOWN"}
Burn State: ${ctx.burnState || "UNKNOWN"}
Halving State: ${ctx.halvingState || "UNKNOWN"}
Era: ${ctx.protocolEra || getProtocolEra()}

Q.O.R.I observes.
Q.O.R.I does not control.`;
}

export async function readQoriLiveState() {
  const baseCtx = {
    walletConnected: false,
    guardianState: "NO KEY",
    cubeBalance: "-",
    energonHeight: "UNKNOWN",
    tickState: "UNKNOWN",
    burnState: "UNKNOWN",
    halvingState: "ACTIVE CYCLE",
    nextHalvingDate: "",
    halvingCountdown: "",
    protocolEra: getProtocolEra(),
  };

  try {
    const rpcUrl = getRpcUrl();
    if (!rpcUrl) return baseCtx;

    const roProvider = new ethers.JsonRpcProvider(rpcUrl);
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
        const sec = await controller.secondsUntilNextEnergonBlock();
        const n = Number(sec.toString());
        baseCtx.tickState = n === 0 ? "TICK ALLOWED" : `${n}s`;
      } catch {}

      try {
        const remaining = await controller.burnPoolRemaining();
        const formattedRemaining = ethers.formatUnits(remaining, 18);

        const cleanRemaining = Number(formattedRemaining).toLocaleString(
          undefined,
          { maximumFractionDigits: 2 }
        );

        baseCtx.burnState = `${cleanRemaining} EON remaining`;
      } catch {}

      try {
        const lastHalving = await controller.lastHalvingTime();
        const interval = await controller.halvingInterval();

        const next =
          Number(lastHalving.toString()) + Number(interval.toString());

        if (next > 0) {
          baseCtx.nextHalvingDate = formatDateFromUnix(next);
          baseCtx.halvingCountdown = formatCountdown(
            next - Math.floor(Date.now() / 1000)
          );
        }
      } catch {}
    } catch {}

    if (typeof window === "undefined" || !window.ethereum) {
      return baseCtx;
    }

    let accounts = [];

    try {
      accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
    } catch {}

    const addr = accounts?.[0] || "";

    if (!addr) {
      return baseCtx;
    }

    baseCtx.walletConnected = true;

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
    }

    baseCtx.protocolEra = getProtocolEra();

    return baseCtx;
  } catch {
    return {
      ...baseCtx,
      protocolEra: getProtocolEra(),
    };
  }
}

import { ethers } from "ethers";
import { createQoriReader } from "./qoriReadClient";
import {
  ABI,
  CONTRACT_ADDRESS,
  MAINNET_CHAIN_ID,
  RPCS,
} from "../../lib/contract";

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

function getRpcUrls() {
  const v = RPCS?.[MAINNET_CHAIN_ID];

  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") return [v];

  return [];
}

function createBaseCtx() {
  return {
    walletConnected: false,
    walletAddress: "",
    guardianState: "NO KEY",
    cubeBalance: "-",
    energonHeight: "UNKNOWN",
    tickState: "UNKNOWN",
    burnState: "UNKNOWN",
    halvingState: "UNKNOWN",
    nextHalvingDate: "",
    halvingCountdown: "",
    protocolEra: getProtocolEra(),
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
  if (ctx.guardianState === "UNKNOWN") {
    return `STATE UNVERIFIED\n\nWallet or cube balance could not be verified.\nNo change in cube ownership has been established.\n\n${ctx.readStatus || "UNAVAILABLE"}`;
  }
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
${ctx.protocolEra || getProtocolEra()}

These are limited protocol readings.
They do not establish overall protocol health.

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

const reader = createQoriReader({
  rpcUrls: getRpcUrls(),
  chainId: MAINNET_CHAIN_ID,
  createBaseCtx,
  createProvider(url) {
    const request = new ethers.FetchRequest(url);
    request.timeout = 8000;
    return new ethers.JsonRpcProvider(request);
  },
  createCube: (provider) => new ethers.Contract(CONTRACT_ADDRESS, ABI, provider),
  createController: (address, provider) => new ethers.Contract(address, CONTROLLER_ABI, provider),
  formatBurn: (value) => `${Number(ethers.formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} EON Remaining`,
  formatCountdown,
  formatDate: formatDateFromUnix,
});

export function readQoriLiveState(options = {}) {
  if (options.landingMode) return reader({ landingMode: true });
  return reader({
    wallet: typeof window === "undefined" ? null : window.ethereum,
    ...options,
  });
}

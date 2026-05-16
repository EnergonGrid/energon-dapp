import { ethers } from "ethers";

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

  return PROTOCOL_ERAS[
    Math.min(eraIndex, PROTOCOL_ERAS.length - 1)
  ];
}

const EON_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";
const CUBE_ADDRESS = "0x30e1076bDf2B123B54486C2721125388af2d2061";

const EON_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

const CUBE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

export function getStateVisuals(state = "UNKNOWN", silent = false) {
  if (state === "COHERENT") {
    return {
      color: "#00ffc6",
      shadow: silent
        ? "0 0 8px rgba(0,255,198,0.22)"
        : "0 0 18px rgba(0,255,198,0.7)",
      border: "1px solid rgba(0,255,198,0.45)",
    };
  }

  if (state === "FRACTURED") {
    return {
      color: "#ff7070",
      shadow: silent
        ? "0 0 8px rgba(255,80,80,0.22)"
        : "0 0 18px rgba(255,80,80,0.7)",
      border: "1px solid rgba(255,80,80,0.45)",
    };
  }

  if (state === "NO KEY") {
    return {
      color: "#7fd6ff",
      shadow: silent
        ? "0 0 8px rgba(80,180,255,0.18)"
        : "0 0 18px rgba(80,180,255,0.55)",
      border: "1px solid rgba(80,180,255,0.34)",
    };
  }

  if (state === "VISITOR") {
    return {
      color: "#ffcf6b",
      shadow: silent
        ? "0 0 8px rgba(255,207,107,0.16)"
        : "0 0 18px rgba(255,207,107,0.45)",
      border: "1px solid rgba(255,207,107,0.34)",
    };
  }

  return {
    color: "#24d6ff",
    shadow: silent
      ? "0 0 8px rgba(36,214,255,0.16)"
      : "0 0 18px rgba(36,214,255,0.45)",
    border: "1px solid rgba(36,214,255,0.34)",
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
  return `Q.O.R.I observes live protocol conditions.

Guardian State: ${ctx.guardianState || "UNKNOWN"}
Protocol Era: ${ctx.protocolEra || "UNKNOWN"}

The system advances only when conditions are met.

One wallet.
One cube.
One Guardian.`;
}

export async function readQoriLiveState() {
  const baseCtx = {
    walletConnected: false,
    guardianState: "NO KEY",
    cubeBalance: "0",
    energonHeight: "LIVE",
    tickState: "ACTIVE",
    burnState: "ACTIVE",
    halvingState: "GENESIS",
    nextHalvingDate: "2029-12-20",
    halvingCountdown: "4 YEARS",
    protocolEra: getProtocolEra(),
  };

  try {
    if (!window.ethereum) return baseCtx;

    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_accounts", []);

    if (!accounts || !accounts.length) {
      return baseCtx;
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const cube = new ethers.Contract(
      CUBE_ADDRESS,
      CUBE_ABI,
      provider
    );

    const eon = new ethers.Contract(
      EON_ADDRESS,
      EON_ABI,
      provider
    );

    const cubeBalanceRaw = await cube.balanceOf(address);
    const eonBalanceRaw = await eon.balanceOf(address);

    const cubeBalance = Number(cubeBalanceRaw);
    const eonBalance = ethers.formatUnits(eonBalanceRaw, 18);

    let guardianState = "NO KEY";

    if (cubeBalance === 1) {
      guardianState = "COHERENT";
    } else if (cubeBalance > 1) {
      guardianState = "FRACTURED";
    }

    return {
      walletConnected: true,
      guardianState,
      cubeBalance: String(cubeBalance),
      eonBalance,
      energonHeight: "LIVE",
      tickState: "ACTIVE",
      burnState: "ACTIVE",
      halvingState: "GENESIS",
      nextHalvingDate: "2029-12-20",
      halvingCountdown: "4 YEARS",
      protocolEra: getProtocolEra(),
    };
  } catch {
    return {
      ...baseCtx,
      protocolEra: getProtocolEra(),
    };
  }
}

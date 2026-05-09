import { ethers } from "ethers";

export const FLARE_RPC = "https://flare-api.flare.network/ext/C/rpc";
export const CUBE_ADDRESS = "0x30e1076bDf2B123B54486C2721125388af2d2061";
export const CONTROLLER_ADDRESS = "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

export const NEXT_HALVING_DATE = new Date("2029-12-19T00:00:00Z");

export const ERC721_ABI = ["function balanceOf(address owner) view returns (uint256)"];

export const CONTROLLER_ABI = [
  "function energonHeight() view returns (uint256)",
  "function secondsUntilNextEnergonBlock() view returns (uint256)",
  "function burnPoolRemaining() view returns (uint256)",
];

export function getHalvingState() {
  const now = new Date();
  const diff = NEXT_HALVING_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      protocolEra: "FIRST REDUCTION ERA",
      halvingState: "HALVING WINDOW REACHED",
      nextHalvingDate: "12/19/2029",
      halvingCountdown: "Halving date reached or passed.",
    };
  }

  const days = Math.floor(diff / 86400000);
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;

  return {
    protocolEra: "GENESIS CYCLE",
    halvingState: "ACTIVE CYCLE",
    nextHalvingDate: "12/19/2029",
    halvingCountdown: `${years}y ${remainingDays}d remaining`,
  };
}

export function classifyGuardianState(cubeBalance) {
  const n = Number(cubeBalance || 0);

  if (n === 0) {
    return {
      guardianState: "NO KEY",
      guardianMeaning:
        "No EnergonCube detected. Wallet may observe, but does not stand as Guardian.",
    };
  }

  if (n === 1) {
    return {
      guardianState: "COHERENT",
      guardianMeaning:
        "Exactly one EnergonCube detected. Guardian state is valid.",
    };
  }

  return {
    guardianState: "FRACTURED",
    guardianMeaning:
      "Multiple EnergonCubes detected. Coherence is broken.",
  };
}

export function getStateVisuals(guardianState, silent = false) {
  const opacity = silent ? 0.42 : 1;

  if (guardianState === "COHERENT") {
    return {
      color: "#00ffc6",
      border: "1px solid rgba(0,255,198,0.85)",
      shadow: `0 0 ${silent ? 8 : 12}px rgba(0,255,198,${opacity}), 0 0 ${silent ? 16 : 28}px rgba(0,255,198,0.45)`,
    };
  }

  if (guardianState === "FRACTURED") {
    return {
      color: "#ff5050",
      border: "1px solid rgba(255,80,80,0.85)",
      shadow: `0 0 ${silent ? 8 : 12}px rgba(255,80,80,${opacity}), 0 0 ${silent ? 16 : 28}px rgba(255,80,80,0.45)`,
    };
  }

  return {
    color: "#2fd4ff",
    border: "1px solid rgba(0,200,255,0.7)",
    shadow: `0 0 ${silent ? 8 : 12}px rgba(47,212,255,${opacity}), 0 0 ${silent ? 16 : 28}px rgba(47,212,255,0.45)`,
  };
}

export async function readQoriLiveState() {
  const provider = new ethers.JsonRpcProvider(FLARE_RPC);
  const controller = new ethers.Contract(CONTROLLER_ADDRESS, CONTROLLER_ABI, provider);

  let walletConnected = false;
  let address = "";
  let cubeBalance = "-";
  let guardianState = "UNKNOWN";
  let guardianMeaning = "Wallet state unavailable.";

  if (typeof window !== "undefined" && window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });

    if (accounts && accounts.length > 0) {
      walletConnected = true;
      address = accounts[0];

      const cube = new ethers.Contract(CUBE_ADDRESS, ERC721_ABI, provider);
      const bal = await cube.balanceOf(address);
      cubeBalance = bal.toString();

      const classified = classifyGuardianState(cubeBalance);
      guardianState = classified.guardianState;
      guardianMeaning = classified.guardianMeaning;
    }
  }

  let energonHeight = "";
  let secondsUntilNextTick;
  let tickState = "UNKNOWN";
  let burnRemaining = "";
  let burnState = "UNKNOWN";

  try {
    const height = await controller.energonHeight();
    energonHeight = height.toString();
  } catch {}

  try {
    const seconds = await controller.secondsUntilNextEnergonBlock();
    secondsUntilNextTick = Number(seconds);
    tickState = secondsUntilNextTick <= 0 ? "TICK ALLOWED" : "WAITING";
  } catch {}

  try {
    const remaining = await controller.burnPoolRemaining();
    burnRemaining = Number(ethers.formatUnits(remaining, 18)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
    burnState = "ACTIVE";
  } catch {}

  const halving = getHalvingState();

  return {
    walletConnected,
    address,
    cubeBalance,
    guardianState,
    guardianMeaning,
    energonHeight,
    secondsUntilNextTick,
    tickState,
    burnRemaining,
    burnState,
    ...halving,
  };
}

export function getSystemObservation(ctx = {}) {
  return `SYSTEM OBSERVATION:
Era: ${ctx.protocolEra || "UNKNOWN"}.
Guardian state: ${ctx.guardianState || "UNKNOWN"}.
Energon height: ${ctx.energonHeight || "UNKNOWN"}.
Tick state: ${ctx.tickState || "UNKNOWN"}.
Burn state: ${ctx.burnState || "UNKNOWN"}.`;
}

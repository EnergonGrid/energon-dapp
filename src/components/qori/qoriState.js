export function getStateVisuals(state = "UNKNOWN", silent = false) {
  if (state === "COHERENT") {
    return {
      color: "#00ffc6",
      border: "1px solid rgba(0,255,198,0.45)",
      shadow: "0 0 12px rgba(0,255,198,0.85), 0 0 28px rgba(0,255,198,0.35)",
    };
  }

  if (state === "FRACTURED") {
    return {
      color: "#ff7070",
      border: "1px solid rgba(255,80,80,0.45)",
      shadow: "0 0 12px rgba(255,80,80,0.85), 0 0 28px rgba(255,80,80,0.35)",
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

export async function readQoriLiveState() {
  return {
    walletConnected: false,
    guardianState: "NO KEY",
    cubeBalance: "-",
    energonHeight: "UNKNOWN",
    tickState: "UNKNOWN",
    burnState: "UNKNOWN",
    halvingState: "ACTIVE CYCLE",
    nextHalvingDate: "12/19/2029",
    halvingCountdown: "",
    protocolEra: "GENESIS CYCLE",
  };
}

export function getSystemObservation(ctx = {}) {
  return `SYSTEM OBSERVATION:

State: ${ctx.guardianState || "UNKNOWN"}
Era: ${ctx.protocolEra || "GENESIS CYCLE"}

Q.O.R.I observes.
Q.O.R.I does not control.`;
}

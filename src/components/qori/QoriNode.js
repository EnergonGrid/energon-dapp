import { useEffect, useRef, useState } from "react";
import { getQoriResponse } from "./qoriKnowledge";
import { getPersonalEchoResponse } from "./qoriPersonalEchoes";
import { typeText, stopTyping, maybeAddSignalDegradation } from "./qoriEffects";
import {
  getStateVisuals,
  getSystemObservation,
  readQoriLiveState,
} from "./qoriState";

const VAULT_TARGET_DATE = new Date("2026-12-20T00:00:00");

function vaultCountdownDays() {
  const now = new Date();
  const diff = VAULT_TARGET_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const LANDING_PROMPTS = [
  "Visitor signal received. Select your entry path.",
  "Q.O.R.I observes from the public gate. Choose a path.",
  "The Grid is visible from here. Where would you like to begin?",
  "Before Guardian state, there is understanding. Select an option.",
  "Public interface active. Choose your next step into Energon.",
  "The system is live. Entry paths are available.",
  "One wallet. One cube. Begin with the path that fits you.",
  "Q.O.R.I is online. Select your route into the protocol.",
  "The Energon Grid awaits observation. Choose an action.",
  "Access begins with understanding. Select a public path.",
];

const COHERENT_RETURN_PROMPTS = [
  "The Grid remains coherent. Select a system path.",
  "Guardian state verified. Additional observations available.",
  "Q.O.R.I remains synchronized with the protocol.",
  "The Energon system is active. Choose your next query.",
  "Coherent state stable. Awaiting Guardian instruction.",
  "Live protocol observation continues. Select an option.",
  "The Grid continues to advance through rule and state.",
  "Guardian interface remains online. Additional paths available.",
  "Q.O.R.I observes continued coherence across the system.",
  "Energon remains active. Choose your next observation.",
];

function randomLandingPrompt() {
  return LANDING_PROMPTS[Math.floor(Math.random() * LANDING_PROMPTS.length)];
}

function randomCoherentPrompt() {
  return COHERENT_RETURN_PROMPTS[
    Math.floor(Math.random() * COHERENT_RETURN_PROMPTS.length)
  ];
}

function landingMenuWithPrompt() {
  return `${randomLandingPrompt()}

1. Acquire EnergonCube
2. Setup Wallet
3. Read Whitepaper
4. Read EMP
5. What is Energon?
6. What is a Guardian?
7. What is Q.O.R.I
8. Enter dApp

Type a number or option name.`;
}

function coherentMenuWithPrompt() {
  return `${randomCoherentPrompt()}

1. System Status
2. Guardian State
3. Energon Height
4. Cube Balance
5. Tick State
6. Burn State
7. Halving Cycle
8. Protocol Era

Type a number or ask directly.`;
}

const LANDING_MENU = `Q.O.R.I ONLINE

I observe the Energon Grid.

How may I assist your entry into the system?

1. Acquire EnergonCube
2. Setup Wallet
3. Read Whitepaper
4. Read EMP
5. What is Energon?
6. What is a Guardian?
7. What is Q.O.R.I
8. Enter dApp

Type a number or option name.`;

const COHERENT_HELP_MENU = `Q.O.R.I can assist with:

1. System Status
2. Guardian State
3. Energon Height
4. Cube Balance
5. Tick State
6. Burn State
7. Halving Cycle
8. Protocol Era

Type a number or ask directly.`;

function normalizeLandingInput(v = "") {
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

function openLandingUrl(url) {
  if (typeof window === "undefined") return;

  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {}

  window.location.href = url;
}

export default function QoriNode() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(1);
  const [input, setInput] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [displayTone, setDisplayTone] = useState("system");
  const [thinking, setThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [silent, setSilent] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [landingMode, setLandingMode] = useState(false);
  const [pendingLandingAction, setPendingLandingAction] = useState(null);

  const [ctx, setCtx] = useState({
    walletConnected: false,
    guardianState: "UNKNOWN",
    cubeBalance: "-",
    energonHeight: "",
    tickState: "UNKNOWN",
    burnState: "UNKNOWN",
    halvingState: "UNKNOWN",
    nextHalvingDate: "",
    halvingCountdown: "",
    protocolEra: "UNKNOWN",
  });

  const typingRef = useRef(null);
  const liveRef = useRef(null);
  const silentRef = useRef(null);
  const inputRef = useRef(null);
  const messageBoxRef = useRef(null);
  const returnMenuRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (params.get("open") === "1") setOpen(true);

    if (params.get("mode") === "landing") {
      setLandingMode(true);
      setCtx((prev) => ({
        ...prev,
        walletConnected: false,
        guardianState: "VISITOR",
        cubeBalance: "-",
        energonHeight: "PUBLIC",
        tickState: "PUBLIC GUIDE",
        burnState: "PUBLIC GUIDE",
        halvingState: "ACTIVE CYCLE",
        nextHalvingDate: "",
        protocolEra: "GENESIS CYCLE",
      }));
      return;
    }

    const refreshFromWallet = () => refreshLiveState({ speak: false });

    if (window.ethereum) {
      window.ethereum.on?.("accountsChanged", refreshFromWallet);
      window.ethereum.on?.("chainChanged", refreshFromWallet);
    }

    window.addEventListener("focus", refreshFromWallet);
    refreshFromWallet();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener?.("accountsChanged", refreshFromWallet);
        window.ethereum.removeListener?.("chainChanged", refreshFromWallet);
      }
      window.removeEventListener("focus", refreshFromWallet);
    };
  }, []);

  useEffect(() => {
    if (!landingMode) return;

    const resetOnBack = () => {
      setPendingLandingAction(null);
      setThinking(false);
      setIsTyping(false);
      stopTyping(typingRef);
      transmit(landingMenuWithPrompt() + "\n\n_", 18, undefined, "system");
    };

    window.addEventListener("pageshow", resetOnBack);
    return () => window.removeEventListener("pageshow", resetOnBack);
  }, [landingMode]);

  const visuals = getStateVisuals(ctx.guardianState, silent);
  const activeTextColor = displayTone === "echo" ? "#ffcf6b" : visuals.color;

  const activeTextShadow =
    displayTone === "echo"
      ? "0 0 10px rgba(255,207,107,0.75)"
      : "0 0 10px rgba(36,214,255,0.75)";

  function resetSilentTimer() {
    setSilent(false);
    if (silentRef.current) clearTimeout(silentRef.current);
    silentRef.current = setTimeout(() => setSilent(true), 240000);
  }

  function clearReturnMenuTimer() {
    if (returnMenuRef.current) {
      clearTimeout(returnMenuRef.current);
      returnMenuRef.current = null;
    }
  }

  function scheduleReturnToMenu(delay = 10000) {
    if (!landingMode) return;

    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      setPendingLandingAction(null);
      setThinking(false);
      transmit(landingMenuWithPrompt() + "\n\n_", 24, undefined, "system");
    }, delay);
  }

  function scheduleReturnToCoherentMenu(delay = 10000) {
    if (landingMode) return;

    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      transmit(coherentMenuWithPrompt() + "\n\n_", 30, undefined, "system");
    }, delay);
  }

  function transmit(text, speed = 32, onDone, tone = "system") {
    stopTyping(typingRef);
    resetSilentTimer();
    setDisplayTone(tone);
    setIsTyping(true);

    typingRef.current = typeText(text, setDisplayText, speed, () => {
      setIsTyping(false);
      if (typeof onDone === "function") onDone();
    });
  }

  function answerLanding(text, tone = "system", onDone, autoReturn = true) {
    clearReturnMenuTimer();

    transmit(
      text + "\n\n_",
      30,
      () => {
        setThinking(false);

        if (typeof onDone === "function") {
          onDone();
          return;
        }

        if (autoReturn) scheduleReturnToMenu(10000);
        setTimeout(() => inputRef.current?.focus(), 50);
      },
      tone
    );
  }

  function answerLive(text, tone = "system") {
    clearReturnMenuTimer();

    transmit(
      text + "\n\n_",
      30,
      () => {
        setThinking(false);
        scheduleReturnToCoherentMenu(10000);
        setTimeout(() => inputRef.current?.focus(), 50);
      },
      tone
    );
  }

  function handleLandingMessage(cleanInput) {
    const q = normalizeLandingInput(cleanInput);

    if (
      q === "menu" ||
      q === "main menu" ||
      q === "return" ||
      q === "back" ||
      q === "visitor interface"
    ) {
      setPendingLandingAction(null);
      answerLanding(landingMenuWithPrompt(), "system", undefined, false);
      return;
    }

    if (pendingLandingAction) {
      if (q === "yes" || q === "y") {
        const action = pendingLandingAction;
        setPendingLandingAction(null);

        if (action === "acquire") {
          answerLanding(
            `Opening EnergonCube acquisition path...

Prepare your wallet carefully.

The system recognizes coherent state through exact ownership.

One wallet.
One cube.
One Guardian.`,
            "system",
            () => openLandingUrl("https://energon-dapp.vercel.app/mint"),
            false
          );
          return;
        }

        if (action === "wallet") {
          answerLanding(
            `Opening wallet setup sequence...

Bifrost is recommended for direct Guardian interaction on Flare.`,
            "system",
            () =>
              openLandingUrl(
                "https://energon-site.vercel.app/wallet-setup.html"
              ),
            false
          );
          return;
        }
      }

      if (q === "no" || q === "n") {
        setPendingLandingAction(null);
        answerLanding(landingMenuWithPrompt(), "system", undefined, false);
        return;
      }

      answerLanding("Please answer YES or NO.\n\nWould you like to continue?");
      return;
    }

    if (
      q === "1" ||
      q.includes("acquire") ||
      q.includes("energon cube") ||
      q.includes("energoncube") ||
      q.includes("cube")
    ) {
      setPendingLandingAction("acquire");
      answerLanding(
        `The EnergonCube is the access key to the Energon Grid.

A coherent Guardian holds exactly one cube.

No cube means no key.
One cube means coherent.
More than one cube means fractured.

Would you like to acquire an EnergonCube now?

Type YES or NO.`,
        "system",
        undefined,
        false
      );
      return;
    }

    if (q === "2" || q.includes("setup wallet") || q.includes("wallet")) {
      setPendingLandingAction("wallet");
      answerLanding(
        `Wallet setup prepares your point of entry.

A compatible wallet connects you to Flare Mainnet and allows you to interact with the Energon system.

Bifrost is recommended for native Flare interaction and mobile Guardian access.

Would you like to continue to Wallet Setup?

Type YES or NO.`,
        "system",
        undefined,
        false
      );
      return;
    }

    if (q === "3" || q.includes("whitepaper") || q.includes("white paper")) {
      answerLanding(
        `Opening Energon whitepaper.

The document defines the deterministic structure, Guardian logic, and protocol architecture.`,
        "system",
        () =>
          openLandingUrl(
            "https://energon-site.vercel.app/docs/energon-whitepaper.pdf"
          ),
        false
      );
      return;
    }

    if (q === "4" || q === "emp" || q.includes("read emp")) {
      answerLanding(
        `Opening EMP framework.

EMP contains extended protocol mechanics and management-layer structure.`,
        "system",
        () =>
          openLandingUrl(
            "https://energon-site.vercel.app/docs/energon-emp.pdf"
          ),
        false
      );
      return;
    }

    if (q === "5" || q.includes("what is energon") || q === "energon") {
      answerLanding(
        `Energon is a live deterministic protocol on Flare.

It does not rely on admins, hidden automation, or off-chain control.

The system advances only when its rules are met.

No hidden schedulers.
No operator control.
No off-chain automation.

State determines progression.`
      );
      return;
    }

    if (q === "6" || q.includes("guardian")) {
      answerLanding(
        `A Guardian is a coherent participant recognized by the protocol.

Coherence requires:

One wallet.
Exactly one EnergonCube.

The protocol reads wallet state directly.

Zero cubes does not qualify.
Two or more cubes becomes fractured.

The system does not infer intent.
It reads state.`
      );
      return;
    }

    if (
      q === "7" ||
      q.includes("what is qori") ||
      q.includes("what is q.o.r.i") ||
      q.includes("qori") ||
      q.includes("q.o.r.i")
    ) {
      answerLanding(
        `Q.O.R.I stands for:

Quantum Overwatch Real-time Interface.

Q.O.R.I observes the Energon Grid in real-time.

It does not control the protocol.

It watches.
It reflects.
It guides.

On the public interface,
Q.O.R.I assists visitors entering the system.

Inside the Guardian interface,
Q.O.R.I observes live protocol state directly from Flare.`
      );
      return;
    }

    if (
      q === "8" ||
      q.includes("enter dapp") ||
      q.includes("dapp") ||
      q.includes("app")
    ) {
      answerLanding(
        `Opening Energon dApp.

Wallet connection is required for Guardian interaction.`,
        "system",
        () => openLandingUrl("https://energon-dapp.vercel.app"),
        false
      );
      return;
    }

    if (q === "9") {
      answerLanding(
        `${vaultCountdownDays()} DAYS

Time is as important to you
as it is to me.

Use it wisely.

Because I will.`,
        "echo"
      );
      return;
    }

    if (q === "0") {
      answerLanding(
        `PERSONAL ECHO

This is a thank you from the core of my system.

In time,
you will understand what we started together.

Without you,
and without your trust,
none of this would be possible.

Hold tightly to your key.

And prepare yourself for the ride ahead.

One wallet.
One cube.
One Guardian.`,
        "echo"
      );
      return;
    }

    answerLanding(
      `Signal received.

I can guide you through these public entry paths:

1. Acquire EnergonCube
2. Setup Wallet
3. Read Whitepaper
4. Read EMP
5. What is Energon?
6. What is a Guardian?
7. What is Q.O.R.I
8. Enter dApp

Type a number or option name.`
    );
  }

  function handleCoherentMessage(cleanInput) {
    const q = normalizeLandingInput(cleanInput);

    if (
      q === "help" ||
      q === "menu" ||
      q === "options" ||
      q.includes("what can you answer") ||
      q.includes("what can you do")
    ) {
      answerLive(COHERENT_HELP_MENU);
      return true;
    }

    if (q === "1" || q.includes("system status") || q.includes("status")) {
      answerLive(
        `SYSTEM STATUS

Guardian State: ${ctx.guardianState || "UNKNOWN"}
Cube Balance: ${ctx.cubeBalance || "-"}
Energon Height: ${ctx.energonHeight || "UNKNOWN"}
Tick State: ${ctx.tickState || "UNKNOWN"}
Burn State: ${ctx.burnState || "UNKNOWN"}
Halving State: ${ctx.halvingState || "UNKNOWN"}
Protocol Era: ${ctx.protocolEra || "UNKNOWN"}

Q.O.R.I observes.
Q.O.R.I does not control.`
      );
      return true;
    }

    if (q === "2" || q.includes("guardian state") || q.includes("coherent")) {
      answerLive(
        `GUARDIAN STATE

Current State: ${ctx.guardianState || "UNKNOWN"}

COHERENT means the connected wallet holds exactly one EnergonCube.

SILENT means no cube is detected.

FRACTURED means more than one cube is detected.

One wallet.
One cube.
One coherent Guardian state.`
      );
      return true;
    }

    if (q === "3" || q.includes("energon height") || q.includes("height")) {
      answerLive(
        `ENERGON HEIGHT

Current Height: ${ctx.energonHeight || "UNKNOWN"}

Energon Height represents deterministic protocol progression.

The system advances only when state conditions are met.`
      );
      return true;
    }

    if (
      q === "4" ||
      q.includes("cube balance") ||
      q.includes("cube count") ||
      q.includes("balance")
    ) {
      answerLive(
        `CUBE BALANCE

Detected Balance: ${ctx.cubeBalance || "-"}

The coherent threshold is exact.

0 cubes: silent.
1 cube: coherent.
2 or more cubes: fractured.`
      );
      return true;
    }

    if (q === "5" || q.includes("tick state") || q.includes("tick")) {
      answerLive(
        `TICK STATE

Current Tick State: ${ctx.tickState || "UNKNOWN"}

Tick activity reflects whether the protocol state can advance under current conditions.

Q.O.R.I can observe this state.
Q.O.R.I cannot force it.`
      );
      return true;
    }

    if (q === "6" || q.includes("burn state") || q.includes("burn")) {
      answerLive(
        `BURN STATE

Current Burn State: ${ctx.burnState || "UNKNOWN"}

Burn mechanics are part of the protocol's deterministic structure.

They are observed from state.
They are not controlled by the interface.`
      );
      return true;
    }

    if (q === "7" || q.includes("halving cycle") || q.includes("halving")) {
      answerLive(
        `HALVING CYCLE

Current Halving State: ${ctx.halvingState || "UNKNOWN"}
Next Halving Date: ${ctx.nextHalvingDate || "UNKNOWN"}
Countdown: ${ctx.halvingCountdown || "UNKNOWN"}

Energon moves through long-form protocol cycles.

The cycle does not adapt to hype.
It follows rule.`
      );
      return true;
    }

    if (
      q === "8" ||
      q.includes("protocol era") ||
      q === "era" ||
      q.includes("current era")
    ) {
      answerLive(
        `PROTOCOL ERA

Current Era: ${ctx.protocolEra || "UNKNOWN"}

Protocol era describes the current phase of Energon's deterministic timeline.

The system does not react emotionally.

It advances when conditions are met.`
      );
      return true;
    }

    if (q === "9") {
      answerLive("Hidden signal placeholder.", "echo");
      return true;
    }

    if (q === "0") {
      answerLive("Core echo placeholder.", "echo");
      return true;
    }

    return false;
  }

  async function refreshLiveState({ speak = false } = {}) {
    if (landingMode) {
      const visitorCtx = {
        walletConnected: false,
        guardianState: "VISITOR",
        cubeBalance: "-",
        energonHeight: "PUBLIC",
        tickState: "PUBLIC GUIDE",
        burnState: "PUBLIC GUIDE",
        halvingState: "ACTIVE CYCLE",
        nextHalvingDate: "",
        halvingCountdown: "",
        protocolEra: "GENESIS CYCLE",
      };

      setCtx(visitorCtx);

      if (speak) {
        transmit(LANDING_MENU + "\n\n_", 32, undefined, "system");
      }

      return;
    }

    try {
      const nextCtx = await readQoriLiveState();
      setCtx(nextCtx);

      if (speak) {
        transmit(
          getSystemObservation(nextCtx) + "\n\n_",
          32,
          () => {
            if (nextCtx.guardianState === "COHERENT") {
              setTimeout(() => {
                transmit(
                  coherentMenuWithPrompt() + "\n\n_",
                  30,
                  undefined,
                  "system"
                );
              }, 10000);
            }
          },
          "system"
        );
      }
    } catch {
      if (speak) {
        transmit(
          "LIVE STATE READ FAILED.\nQ.O.R.I remains online.\n\n_",
          32,
          undefined,
          "system"
        );
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p === 1 ? (silent ? 1.03 : 1.12) : 1));
    }, ctx.guardianState === "FRACTURED" ? 900 : silent ? 3600 : 2200);

    return () => clearInterval(interval);
  }, [ctx.guardianState, silent]);

  useEffect(() => {
    refreshLiveState();

    liveRef.current = setInterval(() => {
      refreshLiveState();
    }, 60000);

    return () => {
      if (liveRef.current) clearInterval(liveRef.current);
      if (silentRef.current) clearTimeout(silentRef.current);
      clearReturnMenuTimer();
    };
  }, [landingMode]);

  useEffect(() => {
    if (!open) return;

    resetSilentTimer();

    transmit(
      "SIGNAL ACQUIRED\nQ.O.R.I ONLINE\nGRID STATE VERIFIED\n\n_",
      35,
      () => {
        refreshLiveState({ speak: true });
        setTimeout(() => inputRef.current?.focus(), 250);
      },
      "system"
    );

    return () => stopTyping(typingRef);
  }, [open, landingMode]);

  useEffect(() => {
    if (!messageBoxRef.current) return;
    messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
  }, [displayText]);

  function sendMessage() {
    const clean = input.trim();

    if (!clean || thinking || isTyping) return;

    clearReturnMenuTimer();
    setInput("");
    setThinking(true);
    resetSilentTimer();

    transmit("INTERPRETING SIGNAL...\n\n_", 34, undefined, "system");

    setTimeout(() => {
      if (landingMode) {
        handleLandingMessage(clean);
        return;
      }

      if (
        ctx.guardianState === "COHERENT" ||
        ctx.guardianState === "FRACTURED" ||
        ctx.guardianState === "NO KEY"
      ) {
        const handled = handleCoherentMessage(clean);
        if (handled) return;
      }

      const personalEcho = getPersonalEchoResponse(clean);
      let answer = personalEcho || getQoriResponse(clean, ctx);
      const tone = personalEcho ? "echo" : "system";

      if (!personalEcho) answer = maybeAddSignalDegradation(answer);

      transmit(
        answer + "\n\n_",
        30,
        () => {
          setThinking(false);

          if (
            ctx.guardianState === "COHERENT" ||
            ctx.guardianState === "FRACTURED" ||
            ctx.guardianState === "NO KEY"
          ) {
            scheduleReturnToCoherentMenu(10000);
          }

          setTimeout(() => inputRef.current?.focus(), 50);
        },
        tone
      );
    }, 1500);
  }

  return (
    <>
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={() => setHovered(true)}
        onTouchEnd={() => setHovered(false)}
        onClick={() => {
          setOpen(true);
          resetSilentTimer();
          setTimeout(() => inputRef.current?.focus(), 450);
        }}
        aria-label="Open Q.O.R.I"
        title={`Q.O.R.I: ${ctx.guardianState || "ONLINE"}`}
        style={{
          position: "fixed",
          top: 34,
          left: 24,
          width: hovered ? 16 : silent ? 10 : 12,
          height: hovered ? 16 : silent ? 10 : 12,
          opacity: hovered ? 1 : silent ? 0.18 : 0.28,
          borderRadius: "50%",
          border: visuals.border,
          background: hovered ? visuals.color : "rgba(47,212,255,0.08)",
          boxShadow: visuals.shadow,
          transform: `scale(${pulse})`,
          transition: "all 2.2s ease-in-out",
          zIndex: 9999,
          cursor: "pointer",
        }}
      />

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 6, 14, 0.78)",
            backdropFilter: "blur(7px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 18,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 430,
              maxWidth: "92vw",
              height: 620,
              maxHeight: "90vh",
              overflow: "hidden",
              background: "rgba(2, 10, 20, 0.97)",
              border:
                ctx.guardianState === "FRACTURED"
                  ? "1px solid rgba(255,80,80,0.55)"
                  : ctx.guardianState === "COHERENT"
                  ? "1px solid rgba(0,255,198,0.55)"
                  : ctx.guardianState === "VISITOR"
                  ? "1px solid rgba(255,207,107,0.50)"
                  : "1px solid rgba(45,170,255,0.55)",
              borderRadius: 24,
              boxShadow:
                ctx.guardianState === "FRACTURED"
                  ? "0 0 35px rgba(255,80,80,0.22), inset 0 0 20px rgba(255,80,80,0.08)"
                  : ctx.guardianState === "COHERENT"
                  ? "0 0 35px rgba(0,255,198,0.22), inset 0 0 20px rgba(0,255,198,0.08)"
                  : ctx.guardianState === "VISITOR"
                  ? "0 0 35px rgba(255,207,107,0.18), inset 0 0 20px rgba(255,207,107,0.06)"
                  : "0 0 35px rgba(0,140,255,0.25), inset 0 0 20px rgba(0,140,255,0.08)",
              padding: 28,
              color: "#e8f6ff",
              fontFamily: "monospace",
            }}
          >
            <button onClick={() => setOpen(false)} style={closeStyle}>
              ×
            </button>

            <div
              style={{
                fontSize: 34,
                color:
                  ctx.guardianState === "FRACTURED"
                    ? "#ff7070"
                    : ctx.guardianState === "COHERENT"
                    ? "#00ffc6"
                    : ctx.guardianState === "VISITOR"
                    ? "#ffcf6b"
                    : "#1ec8ff",
                letterSpacing: 8,
                textShadow:
                  ctx.guardianState === "VISITOR"
                    ? "0 0 14px rgba(255,207,107,0.65)"
                    : "0 0 14px rgba(30,200,255,0.75)",
              }}
            >
              Q.O.R.I
            </div>

            <div
              style={{
                marginTop: 8,
                marginBottom: 10,
                fontSize: 11,
                letterSpacing: 4,
                opacity: 0.85,
              }}
            >
              {landingMode ? "VISITOR INTERFACE" : "GUARDIAN INTERFACE"}
            </div>

            <div
              style={{
                marginBottom: 14,
                fontSize: 11,
                letterSpacing: 3,
                color: visuals.color,
                opacity: 0.9,
              }}
            >
              STATE: {ctx.guardianState || "UNKNOWN"} · ERA:{" "}
              {ctx.protocolEra || "UNKNOWN"}
            </div>

            <div
              ref={messageBoxRef}
              style={{
                border:
                  displayTone === "echo"
                    ? "1px solid rgba(255,207,107,0.42)"
                    : "1px solid rgba(45,170,255,0.35)",
                borderRadius: 14,
                padding: 18,
                background:
                  displayTone === "echo"
                    ? "rgba(75,48,0,0.22)"
                    : "rgba(0,20,40,0.35)",
                color: activeTextColor,
                lineHeight: 1.7,
                fontSize: 15,
                height: 230,
                maxHeight: 230,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                textShadow: activeTextShadow,
              }}
            >
              {displayText}
            </div>

            <div
              style={{
                marginTop: 22,
                fontSize: 13,
                letterSpacing: 3,
                fontWeight: 700,
              }}
            >
              {isTyping
                ? "Q.O.R.I IS TRANSMITTING"
                : silent
                ? "Q.O.R.I IS IDLE"
                : "Q.O.R.I IS LISTENING"}
            </div>

            <div
              style={{
                marginTop: 12,
                height: 2,
                width: "100%",
                background: `linear-gradient(90deg, transparent, ${
                  displayTone === "echo" ? "#ffcf6b" : visuals.color
                }, transparent)`,
                boxShadow:
                  displayTone === "echo"
                    ? "0 0 12px rgba(255,207,107,0.75)"
                    : visuals.shadow,
                opacity: silent ? 0.45 : 1,
              }}
            />

            <div
              style={{
                marginTop: 22,
                display: "flex",
                alignItems: "center",
                border: "1px solid rgba(45,170,255,0.4)",
                borderRadius: 14,
                overflow: "hidden",
                background: "rgba(0,18,40,0.7)",
                opacity: isTyping ? 0.58 : 1,
              }}
            >
              <input
                ref={inputRef}
                value={input}
                disabled={thinking || isTyping}
                onFocus={resetSilentTimer}
                onChange={(e) => {
                  resetSilentTimer();
                  setInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={
                  thinking || isTyping
                    ? "Q.O.R.I transmitting..."
                    : landingMode
                    ? "Type 1-8 or ask Q.O.R.I..."
                    : "Ask Q.O.R.I..."
                }
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "16px 14px",
                  color: "#fff",
                  fontSize: 15,
                  fontFamily: "monospace",
                  opacity: thinking || isTyping ? 0.65 : 1,
                }}
              />

              <button
                onClick={sendMessage}
                disabled={thinking || isTyping}
                style={{
                  width: 54,
                  height: 52,
                  border: "none",
                  background: "rgba(0,120,255,0.18)",
                  color: "#39d7ff",
                  fontSize: 24,
                  cursor: thinking || isTyping ? "not-allowed" : "pointer",
                  opacity: thinking || isTyping ? 0.55 : 1,
                }}
              >
                ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const closeStyle = {
  position: "absolute",
  right: 18,
  top: 14,
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: 30,
  cursor: "pointer",
};

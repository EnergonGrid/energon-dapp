import { useEffect, useRef, useState } from "react";
import { getQoriResponse } from "./qoriKnowledge";
import { getPersonalEchoResponse } from "./qoriPersonalEchoes";
import { typeText, stopTyping, maybeAddSignalDegradation } from "./qoriEffects";
import {
  getStateVisuals,
  getSystemObservation,
  getVisitorObservation,
  readQoriLiveState,
} from "./qoriState";

const VAULT_TARGET_DATE = new Date("2026-12-20T00:00:00");

function vaultCountdownDays() {
  const now = new Date();
  const diff = VAULT_TARGET_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const GRID_ENTRY_PROMPT = `Would you like to enter the Energon Grid?

1. Yes
2. No

Type 1 or 2.`;

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

function randomCoherentPrompt() {
  return COHERENT_RETURN_PROMPTS[
    Math.floor(Math.random() * COHERENT_RETURN_PROMPTS.length)
  ];
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

function knowledgeQueryFromInput(q) {
  const map = {
    "1": "energon basics",
    "2": "guardian rules",
    "3": "energoncube logic",
    "4": "wallet setup",
    "5": "flare network",
    "6": "dapp navigation",
    "7": "observer",
    "8": "dashboard",
    "9": "evault",
    "10": "burn and halving",
    "11": "qori identity",
    "12": "newcomer guidance",
    "13": "read whitepaper",
    "14": "read emp",
  };

  return map[q] || q;
}

export default function QoriNode({ hideOrb = true } = {}) {
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
  const [pendingGridEntry, setPendingGridEntry] = useState(false);
  const [walletPromptGlow, setWalletPromptGlow] = useState(false);
  const [visitorKnowledgeMode, setVisitorKnowledgeMode] = useState(false);

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
  const previousWalletConnectedRef = useRef(false);

  function isVisitorFlow() {
    return (
      landingMode ||
      ctx.guardianState === "NO KEY" ||
      ctx.guardianState === "VISITOR"
    );
  }

  const visuals = getStateVisuals(ctx.guardianState, silent);

  const activeTextColor =
    displayTone === "echo" ? "#ffcf6b" : isVisitorFlow() ? "#1ec8ff" : visuals.color;

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

  function shouldHoldReturnMenu() {
    return !!inputRef.current?.value?.trim();
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

  function showKnowledgeMenu() {
    clearReturnMenuTimer();
    setPendingGridEntry(false);
    setVisitorKnowledgeMode(true);
    setThinking(false);

    transmit(
      getQoriResponse("help", ctx) + "\n\n_",
      30,
      () => {
        setTimeout(() => inputRef.current?.focus(), 50);
      },
      "system"
    );
  }

  function scheduleReturnToMenu(delay = 10000) {
    if (!isVisitorFlow()) return;

    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      if (shouldHoldReturnMenu()) {
        scheduleReturnToMenu(10000);
        return;
      }

      showKnowledgeMenu();
    }, delay);
  }

  function scheduleReturnToCoherentMenu(delay = 10000) {
    if (landingMode) return;

    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      if (shouldHoldReturnMenu()) {
        scheduleReturnToCoherentMenu(10000);
        return;
      }

      if (isVisitorFlow()) {
        showKnowledgeMenu();
        return;
      }

      transmit(coherentMenuWithPrompt() + "\n\n_", 30, undefined, "system");
    }, delay);
  }

  function resetReturnMenuAfterTyping(nextValue = "") {
    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      if (String(nextValue).trim()) {
        resetReturnMenuAfterTyping("");
        return;
      }

      if (inputRef.current?.value?.trim()) {
        resetReturnMenuAfterTyping("");
        return;
      }

      if (isVisitorFlow()) {
        showKnowledgeMenu();
      } else {
        transmit(coherentMenuWithPrompt() + "\n\n_", 30, undefined, "system");
      }
    }, 10000);
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

  function showVisitorGridPrompt() {
    clearReturnMenuTimer();
    setPendingGridEntry(true);
    setVisitorKnowledgeMode(false);
    setThinking(false);

    transmit(
      GRID_ENTRY_PROMPT + "\n\n_",
      30,
      () => {
        setTimeout(() => inputRef.current?.focus(), 50);
        scheduleReturnToMenu(10000);
      },
      "system"
    );
  }

  function handleVisitorGridChoice(q) {
    if (q === "1" || q === "yes" || q === "y") {
      setPendingGridEntry(false);
      setVisitorKnowledgeMode(false);
      setInput("");
      setThinking(true);
      clearReturnMenuTimer();

      transmit(
        `Entry into the Energon Grid
requires acquisition of an EnergonCube.

The EnergonCube is the access key
recognized by the protocol.

No cube means NO KEY.
One cube means COHERENT.
More than one cube means FRACTURED.

One wallet.
One cube.
One Guardian.

Opening acquisition interface...

_`,
        30,
        () => openLandingUrl("https://energon-dapp.vercel.app/mint"),
        "system"
      );

      return true;
    }

    if (q === "2" || q === "no" || q === "n") {
      setPendingGridEntry(false);
      setVisitorKnowledgeMode(true);
      setInput("");
      showKnowledgeMenu();
      return true;
    }

    return false;
  }

  function handleVisitorKnowledge(cleanInput) {
    const q = normalizeLandingInput(cleanInput);

    if (
      q === "grid" ||
      q === "enter grid" ||
      q === "enter the grid" ||
      q === "back" ||
      q === "return"
    ) {
      showVisitorGridPrompt();
      return;
    }

    if (
      q === "4" ||
      q.includes("wallet setup") ||
      q === "wallet" ||
      q.includes("setup wallet")
    ) {
      transmit(
        "Opening Wallet Setup...\n\n_",
        30,
        () =>
          openLandingUrl(
            "https://energon-site.vercel.app/wallet-setup.html"
          ),
        "system"
      );
      return;
    }

    if (
      q === "13" ||
      q.includes("read whitepaper") ||
      q.includes("whitepaper") ||
      q.includes("white paper")
    ) {
      transmit(
        "Opening Energon Whitepaper...\n\n_",
        30,
        () =>
          openLandingUrl(
            "https://energon-site.vercel.app/docs/energon-whitepaper.pdf"
          ),
        "system"
      );
      return;
    }

    if (
      q === "14" ||
      q === "emp" ||
      q.includes("read emp") ||
      q.includes("energon emp")
    ) {
      transmit(
        "Opening Energon EMP...\n\n_",
        30,
        () =>
          openLandingUrl(
            "https://energon-site.vercel.app/docs/energon-emp.pdf"
          ),
        "system"
      );
      return;
    }

    const query = knowledgeQueryFromInput(q);
    const personalEcho = getPersonalEchoResponse(cleanInput);
    let answer = personalEcho || getQoriResponse(query, ctx);
    const tone = personalEcho ? "echo" : "system";

    if (!personalEcho) answer = maybeAddSignalDegradation(answer);

    transmit(
      answer + "\n\n_",
      30,
      () => {
        setThinking(false);
        scheduleReturnToMenu(10000);
        setTimeout(() => inputRef.current?.focus(), 50);
      },
      tone
    );
  }

  function handleLandingMessage(cleanInput) {
    const q = normalizeLandingInput(cleanInput);

    if (pendingGridEntry && !visitorKnowledgeMode) {
      if (handleVisitorGridChoice(q)) return;

      transmit(
        GRID_ENTRY_PROMPT + "\n\n_",
        30,
        () => {
          setThinking(false);
          scheduleReturnToMenu(10000);
          setTimeout(() => inputRef.current?.focus(), 50);
        },
        "system"
      );
      return;
    }

    handleVisitorKnowledge(cleanInput);
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

    answerLive(COHERENT_HELP_MENU);
    return true;
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
        transmit(
          getVisitorObservation() + "\n\n_",
          32,
          () => {
            setTimeout(() => {
              showVisitorGridPrompt();
            }, 10000);
          },
          "system"
        );
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
            setTimeout(() => {
              if (shouldHoldReturnMenu()) return;

              if (nextCtx.guardianState === "COHERENT") {
                transmit(
                  coherentMenuWithPrompt() + "\n\n_",
                  30,
                  undefined,
                  "system"
                );
                return;
              }

              if (nextCtx.guardianState === "NO KEY") {
                showVisitorGridPrompt();
                return;
              }

              if (nextCtx.guardianState === "FRACTURED") {
                transmit(
                  `FRACTURED STATE DETECTED.

This wallet holds more than one EnergonCube.

Guardian coherence requires:

One wallet.
One cube.
One Guardian.

Reduce cube balance to exactly one
to restore coherent access.

_`,
                  30,
                  undefined,
                  "system"
                );
              }
            }, 10000);
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
    if (landingMode) return;

    const wasConnected = previousWalletConnectedRef.current;
    const isConnected = !!ctx.walletConnected;

    if (!wasConnected && isConnected) {
      setWalletPromptGlow(true);
    }

    if (!isConnected) {
      setWalletPromptGlow(false);
    }

    previousWalletConnectedRef.current = isConnected;
  }, [ctx.walletConnected, landingMode]);

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
        halvingCountdown: "",
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
      setPendingGridEntry(false);
      setVisitorKnowledgeMode(false);
      setThinking(false);
      setIsTyping(false);
      stopTyping(typingRef);
      clearReturnMenuTimer();
      showVisitorGridPrompt();
    };

    window.addEventListener("pageshow", resetOnBack);
    return () => window.removeEventListener("pageshow", resetOnBack);
  }, [landingMode]);

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
      if (isVisitorFlow()) {
        handleLandingMessage(clean);
        return;
      }

      const handled = handleCoherentMessage(clean);
      if (handled) return;

      const personalEcho = getPersonalEchoResponse(clean);
      let answer = personalEcho || getQoriResponse(clean, ctx);
      const tone = personalEcho ? "echo" : "system";

      if (!personalEcho) answer = maybeAddSignalDegradation(answer);

      transmit(
        answer + "\n\n_",
        30,
        () => {
          setThinking(false);
          scheduleReturnToCoherentMenu(10000);
          setTimeout(() => inputRef.current?.focus(), 50);
        },
        tone
      );
    }, 1500);
  }

  function openQoriNode() {
    setWalletPromptGlow(false);
    setOpen(true);
    resetSilentTimer();
    setTimeout(() => inputRef.current?.focus(), 450);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const openFromProtocol = () => openQoriNode();
    window.addEventListener("energon:open-qori", openFromProtocol);

    return () => {
      window.removeEventListener("energon:open-qori", openFromProtocol);
    };
  }, []);

  return (
    <>
      {!hideOrb && (
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onTouchStart={() => setHovered(true)}
          onTouchEnd={() => setHovered(false)}
          onClick={openQoriNode}
          aria-label="Open Q.O.R.I"
          title={`Q.O.R.I: ${ctx.guardianState || "ONLINE"}`}
          style={{
            position: "fixed",
            top: 34,
            left: 24,
            width: walletPromptGlow ? 18 : hovered ? 16 : silent ? 10 : 12,
            height: walletPromptGlow ? 18 : hovered ? 16 : silent ? 10 : 12,
            opacity: walletPromptGlow ? 1 : hovered ? 1 : silent ? 0.18 : 0.28,
            borderRadius: "50%",
            border: visuals.border,
            background:
              walletPromptGlow || hovered
                ? visuals.color
                : "rgba(47,212,255,0.08)",
            boxShadow: walletPromptGlow
              ? `${visuals.shadow}, 0 0 28px ${visuals.color}, 0 0 58px ${visuals.color}`
              : isVisitorFlow()
              ? "0 0 12px rgba(30,200,255,0.75)"
              : visuals.shadow,
            transform: `scale(${pulse})`,
            transition: "all 2.2s ease-in-out",
            zIndex: 9999,
            cursor: "pointer",
          }}
        />
      )}

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
                  : "1px solid rgba(45,170,255,0.55)",
              borderRadius: 24,
              boxShadow:
                ctx.guardianState === "FRACTURED"
                  ? "0 0 35px rgba(255,80,80,0.22), inset 0 0 20px rgba(255,80,80,0.08)"
                  : ctx.guardianState === "COHERENT"
                  ? "0 0 35px rgba(0,255,198,0.22), inset 0 0 20px rgba(0,255,198,0.08)"
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
                    : "#1ec8ff",
                letterSpacing: 8,
                textShadow: "0 0 14px rgba(30,200,255,0.75)",
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
                color:
                  displayTone === "echo"
                    ? "#ffcf6b"
                    : isVisitorFlow()
                    ? "#1ec8ff"
                    : visuals.color,
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
                  displayTone === "echo"
                    ? "#ffcf6b"
                    : isVisitorFlow()
                    ? "#1ec8ff"
                    : visuals.color
                }, transparent)`,
                boxShadow:
                  displayTone === "echo"
                    ? "0 0 12px rgba(255,207,107,0.75)"
                    : isVisitorFlow()
                    ? "0 0 12px rgba(30,200,255,0.75)"
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
                onFocus={() => {
                  resetSilentTimer();
                }}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  resetSilentTimer();
                  setInput(nextValue);
                  resetReturnMenuAfterTyping(nextValue);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={
                  thinking || isTyping
                    ? "Q.O.R.I transmitting..."
                    : isVisitorFlow() && !visitorKnowledgeMode
                    ? "Type 1 or 2..."
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

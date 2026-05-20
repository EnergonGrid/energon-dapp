import { useEffect, useRef, useState } from "react";
import {
  getQoriResponse,
  getVisitorMenu,
} from "./qoriKnowledge";

import {
  getVisitorEchoResponse,
  getCoherentEchoResponse,
} from "./qoriPersonalEchoes";

import {
  typeText,
  stopTyping,
  maybeAddSignalDegradation,
} from "./qoriEffects";

import {
  getStateVisuals,
  getSystemObservation,
  getVisitorObservation,
  readQoriLiveState,
} from "./qoriState";

const COHERENT_RETURN_PROMPTS = [
  "The Grid remains coherent. Select a system path.",
  "Guardian state verified. Additional observations available.",
  "Q.O.R.I remains synchronized with the protocol.",
  "The Energon system is active. Choose your next query.",
  "Coherent state stable. Awaiting Guardian instruction.",
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

function normalizeInput(v = "") {
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

function visitorQueryFromInput(q) {
  const map = {
    "1": "what is energon",
    "2": "what is energongrid",
    "3": "what is energoncube",
    "4": "wallet setup",
    "5": "read whitepaper",
    "6": "read emp",
    "7": "mint",
    "8": "closing thought",
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
  const [walletPromptGlow, setWalletPromptGlow] = useState(false);

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
  const screenRef = useRef("menu");
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
    displayTone === "echo"
      ? "#ffcf6b"
      : isVisitorFlow()
      ? "#1ec8ff"
      : visuals.color;

  const activeTextShadow =
    displayTone === "echo"
      ? "0 0 10px rgba(255,207,107,0.75)"
      : "0 0 10px rgba(36,214,255,0.75)";

  function resetSilentTimer() {
    setSilent(false);

    if (silentRef.current) {
      clearTimeout(silentRef.current);
    }

    silentRef.current = setTimeout(() => {
      setSilent(true);
    }, 240000);
  }

  function clearReturnMenuTimer() {
    if (returnMenuRef.current) {
      clearTimeout(returnMenuRef.current);
      returnMenuRef.current = null;
    }
  }

  function userIsTypingOrHoldingText() {
    return !!inputRef.current?.value?.trim();
  }

  function transmit(text, speed = 32, onDone, tone = "system") {
    stopTyping(typingRef);

    setDisplayTone(tone);
    setIsTyping(true);

    typingRef.current = typeText(text, setDisplayText, speed, () => {
      setIsTyping(false);

      if (typeof onDone === "function") {
        onDone();
      }
    });
  }

  function showVisitorMenu() {
    clearReturnMenuTimer();

    screenRef.current = "menu";

    setThinking(false);
    setDisplayTone("system");

    stopTyping(typingRef);

    transmit(
      getVisitorMenu() + "\n\n_",
      30,
      () => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      },
      "system"
    );
  }

  function scheduleReturnToVisitorMenu(delay = 10000) {
    if (!isVisitorFlow()) return;

    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      if (screenRef.current === "menu") return;

      if (userIsTypingOrHoldingText()) {
        scheduleReturnToVisitorMenu(10000);
        return;
      }

      showVisitorMenu();
    }, delay);
  }

  function scheduleReturnToCoherentMenu(delay = 10000) {
    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      if (userIsTypingOrHoldingText()) {
        scheduleReturnToCoherentMenu(10000);
        return;
      }

      screenRef.current = "menu";

      transmit(
        coherentMenuWithPrompt() + "\n\n_",
        30,
        undefined,
        "system"
      );
    }, delay);
  }

  function resetReturnMenuAfterTyping(nextValue = "") {
    clearReturnMenuTimer();

    returnMenuRef.current = setTimeout(() => {
      if (String(nextValue).trim() || userIsTypingOrHoldingText()) {
        if (isVisitorFlow()) {
          scheduleReturnToVisitorMenu(10000);
        } else {
          scheduleReturnToCoherentMenu(10000);
        }

        return;
      }

      if (isVisitorFlow()) {
        showVisitorMenu();
      } else {
        screenRef.current = "menu";

        transmit(
          coherentMenuWithPrompt() + "\n\n_",
          30,
          undefined,
          "system"
        );
      }
    }, 10000);
  }

  function answerLive(text, tone = "system") {
    clearReturnMenuTimer();

    screenRef.current = "answer";

    transmit(
      text + "\n\n_",
      30,
      () => {
        scheduleReturnToCoherentMenu(10000);

        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      },
      tone
    );
  }

  function handleVisitorMessage(cleanInput) {
    screenRef.current = "answer";

    const q = normalizeInput(cleanInput);
    const query = visitorQueryFromInput(q);

    if (q === "4" || q.includes("wallet setup")) {
      transmit(
        "Opening Wallet Setup...\n\n_",
        30,
        () => {
          openLandingUrl("https://energon-site.vercel.app/wallet-setup.html");
        },
        "system"
      );

      return;
    }

    if (q === "5" || q.includes("whitepaper")) {
      transmit(
        "Opening Energon Whitepaper...\n\n_",
        30,
        () => {
          openLandingUrl(
            "https://energon-site.vercel.app/docs/energon-whitepaper.pdf"
          );
        },
        "system"
      );

      return;
    }

    if (q === "6" || q.includes("emp")) {
      transmit(
        "Opening Energon EMP...\n\n_",
        30,
        () => {
          openLandingUrl(
            "https://energon-site.vercel.app/docs/energon-emp.pdf"
          );
        },
        "system"
      );

      return;
    }

    if (q === "7" || q.includes("mint")) {
      transmit(
        `Opening Energon Mint Site...

The EnergonCube is the access key.

One wallet.
One cube.
One Guardian.

_`,
        30,
        () => {
          openLandingUrl("https://energon-dapp.vercel.app/mint");
        },
        "system"
      );

      return;
    }

    const visitorEcho = getVisitorEchoResponse(cleanInput);

    let answer = visitorEcho || getQoriResponse(query, ctx);
    const tone = visitorEcho ? "echo" : "system";

    if (!visitorEcho) {
      answer = maybeAddSignalDegradation(answer);
    }

    transmit(
      answer + "\n\n_",
      30,
      () => {
        scheduleReturnToVisitorMenu(10000);

        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      },
      tone
    );
  }

  function handleCoherentMessage(cleanInput) {
    const q = normalizeInput(cleanInput);

    if (
      q === "help" ||
      q === "menu" ||
      q === "options" ||
      q.includes("what can you answer") ||
      q.includes("what can you do")
    ) {
      answerLive(coherentMenuWithPrompt());
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

    const coherentEcho = getCoherentEchoResponse(cleanInput);

    let answer = coherentEcho || getQoriResponse(cleanInput, ctx);
    const tone = coherentEcho ? "echo" : "system";

    if (!coherentEcho) {
      answer = maybeAddSignalDegradation(answer);
    }

    transmit(
      answer + "\n\n_",
      30,
      () => {
        setThinking(false);
        scheduleReturnToCoherentMenu(10000);

        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      },
      tone
    );

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
              showVisitorMenu();
            }, 2500);
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
          undefined,
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

    if (params.get("open") === "1") {
      setOpen(true);
    }

    if (params.get("mode") === "landing") {
      setLandingMode(true);
    }

    const refreshFromWallet = () =>
      refreshLiveState({
        speak: false,
      });

    window.ethereum?.on?.("accountsChanged", refreshFromWallet);
    window.ethereum?.on?.("chainChanged", refreshFromWallet);
    window.addEventListener("focus", refreshFromWallet);

    refreshLiveState();

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", refreshFromWallet);
      window.ethereum?.removeListener?.("chainChanged", refreshFromWallet);
      window.removeEventListener("focus", refreshFromWallet);
    };
  }, []);

  useEffect(() => {
    if (!landingMode) return;

    const restoreVisitor = () => {
      clearReturnMenuTimer();

      stopTyping(typingRef);

      setThinking(false);
      setIsTyping(false);

      showVisitorMenu();
    };

    window.addEventListener("pageshow", restoreVisitor);

    return () => {
      window.removeEventListener("pageshow", restoreVisitor);
    };
  }, [landingMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p === 1 ? (silent ? 1.03 : 1.12) : 1));
    }, silent ? 3600 : 2200);

    return () => clearInterval(interval);
  }, [silent]);

  useEffect(() => {
    if (!open) return;

    resetSilentTimer();

    transmit(
      "SIGNAL ACQUIRED\nQ.O.R.I ONLINE\nGRID STATE VERIFIED\n\n_",
      35,
      () => {
        if (landingMode) {
          setTimeout(() => {
            showVisitorMenu();
          }, 900);
        } else {
          refreshLiveState({
            speak: true,
          });
        }

        setTimeout(() => {
          inputRef.current?.focus();
        }, 250);
      },
      "system"
    );

    return () => {
      stopTyping(typingRef);
    };
  }, [open, landingMode]);

  useEffect(() => {
    if (!messageBoxRef.current) return;

    messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
  }, [displayText]);

  function sendMessage() {
    const clean = input.trim();

    if (!clean || thinking || isTyping) {
      return;
    }

    clearReturnMenuTimer();

    setInput("");
    setThinking(true);

    transmit("INTERPRETING SIGNAL...\n\n_", 34, undefined, "system");

    setTimeout(() => {
      if (isVisitorFlow()) {
        handleVisitorMessage(clean);
        return;
      }

      handleCoherentMessage(clean);
    }, 1000);
  }

  function openQoriNode() {
    setWalletPromptGlow(false);

    setOpen(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 450);
  }

  return (
    <>
      {!hideOrb && (
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={openQoriNode}
          aria-label="Open Q.O.R.I"
          style={{
            position: "fixed",
            top: 34,
            left: 24,
            width: hovered ? 16 : 12,
            height: hovered ? 16 : 12,
            opacity: hovered ? 1 : 0.28,
            borderRadius: "50%",
            border: visuals.border,
            background: visuals.color,
            boxShadow: "0 0 12px rgba(30,200,255,0.75)",
            transform: `scale(${pulse})`,
            transition: "all 2.2s ease-in-out",
            zIndex: 9999,
            cursor: "pointer",
          }}
        />
      )}

      {open && (
        <div style={overlayStyle}>
          <div style={panelStyle(ctx)}>
            <div style={titleStyle(ctx)}>Q.O.R.I</div>

            <div style={subTitleStyle}>
              {landingMode ? "VISITOR INTERFACE" : "GUARDIAN INTERFACE"}
            </div>

            <div
              style={{
                ...stateStyle,
                color: activeTextColor,
              }}
            >
              STATE: {ctx.guardianState || "UNKNOWN"} · ERA:{" "}
              {ctx.protocolEra || "UNKNOWN"}
            </div>

            <div
              ref={messageBoxRef}
              style={messageBoxStyle(
                displayTone,
                activeTextColor,
                activeTextShadow
              )}
            >
              {displayText}
            </div>

            <div style={statusStyle}>
              {isTyping
                ? "Q.O.R.I IS TRANSMITTING"
                : silent
                ? "Q.O.R.I IS IDLE"
                : "Q.O.R.I IS LISTENING"}
            </div>

            <div style={beamStyle} />

            <div style={inputWrapStyle}>
              <input
                ref={inputRef}
                value={input}
                disabled={thinking || isTyping}
                onFocus={resetSilentTimer}
                onChange={(e) => {
                  const nextValue = e.target.value;

                  setInput(nextValue);

                  resetSilentTimer();

                  resetReturnMenuAfterTyping(nextValue);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder={
                  thinking || isTyping
                    ? "Q.O.R.I transmitting..."
                    : isVisitorFlow()
                    ? "Ask Q.O.R.I or type 1-8..."
                    : "Ask Q.O.R.I..."
                }
                style={inputStyle}
              />

              <button
                onClick={sendMessage}
                disabled={thinking || isTyping}
                style={sendStyle(thinking || isTyping)}
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

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 6, 14, 0.78)",
  backdropFilter: "blur(7px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 18,
};

function panelStyle(ctx) {
  return {
    position: "relative",
    width: 430,
    maxWidth: "92vw",
    height: 620,
    background: "rgba(2, 10, 20, 0.97)",
    border:
      ctx.guardianState === "COHERENT"
        ? "1px solid rgba(0,255,198,0.55)"
        : "1px solid rgba(45,170,255,0.55)",
    borderRadius: 24,
    boxShadow: "0 0 35px rgba(0,140,255,0.25)",
    padding: 28,
    color: "#e8f6ff",
    fontFamily: "monospace",
  };
}

function titleStyle(ctx) {
  return {
    fontSize: 34,
    color: ctx.guardianState === "COHERENT" ? "#00ffc6" : "#1ec8ff",
    letterSpacing: 8,
    textShadow: "0 0 14px rgba(30,200,255,0.75)",
  };
}

function messageBoxStyle(displayTone, activeTextColor, activeTextShadow) {
  return {
    border:
      displayTone === "echo"
        ? "1px solid rgba(255,207,107,0.42)"
        : "1px solid rgba(45,170,255,0.35)",
    borderRadius: 14,
    padding: 18,
    background: "rgba(0,20,40,0.35)",
    color: activeTextColor,
    lineHeight: 1.7,
    fontSize: 15,
    height: 230,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    textShadow: activeTextShadow,
  };
}

const subTitleStyle = {
  marginTop: 8,
  marginBottom: 10,
  fontSize: 11,
  letterSpacing: 4,
};

const stateStyle = {
  marginBottom: 14,
  fontSize: 11,
  letterSpacing: 3,
};

const statusStyle = {
  marginTop: 22,
  fontSize: 13,
  letterSpacing: 3,
  fontWeight: 700,
};

const beamStyle = {
  marginTop: 12,
  height: 2,
  width: "100%",
  background: "linear-gradient(90deg, transparent, #1ec8ff, transparent)",
  boxShadow: "0 0 12px rgba(30,200,255,0.75)",
};

const inputWrapStyle = {
  marginTop: 22,
  display: "flex",
  alignItems: "center",
  border: "1px solid rgba(45,170,255,0.4)",
  borderRadius: 14,
  overflow: "hidden",
  background: "rgba(0,18,40,0.7)",
};

const inputStyle = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  padding: "16px 14px",
  color: "#fff",
  fontSize: 15,
  fontFamily: "monospace",
};

function sendStyle(disabled) {
  return {
    width: 54,
    height: 52,
    border: "none",
    background: "rgba(0,120,255,0.18)",
    color: "#39d7ff",
    fontSize: 24,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

import { useEffect, useRef, useState } from "react";
import { getQoriResponse } from "./qoriKnowledge";
import { getPersonalEchoResponse } from "./qoriPersonalEchoes";
import { typeText, stopTyping, maybeAddSignalDegradation } from "./qoriEffects";
import {
  getStateVisuals,
  getSystemObservation,
  readQoriLiveState,
} from "./qoriState";

const LANDING_MENU = `Q.O.R.I ONLINE

I observe the Energon Grid.

How may I assist your entry into the system?

1. Acquire EnergonCube
2. Setup Wallet
3. Read Whitepaper
4. Read EMP
5. What is Energon?
6. What is a Guardian?
7. Open Observer
8. Enter dApp

Type a number or option name.`;

const LANDING_PROMPTS = [
  "Select a path into the Energon Grid.",
  "How may I assist your entry into the system?",
  "The Grid remains active. Choose your next action.",
  "Q.O.R.I observes. Where would you like to begin?",
  "A Guardian requires understanding before entry. Select an option.",
  "The protocol is live. How would you like to proceed?",
  "One wallet. One cube. Choose your next step.",
  "The Energon Grid is operational. Awaiting instruction.",
  "Entry paths available. Select an action.",
  "Q.O.R.I remains online. How can I guide you?",
];

function normalizeLandingInput(v = "") {
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

function randomLandingPrompt() {
  return LANDING_PROMPTS[Math.floor(Math.random() * LANDING_PROMPTS.length)];
}

function landingMenuWithPrompt() {
  return `${randomLandingPrompt()}

1. Acquire EnergonCube
2. Setup Wallet
3. Read Whitepaper
4. Read EMP
5. What is Energon?
6. What is a Guardian?
7. Open Observer
8. Enter dApp

Type a number or option name.`;
}

function openLandingUrl(url) {
  if (typeof window === "undefined") return;
  window.location.href = url;
}

export default function QoriNode() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(1);
  const [input, setInput] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [displayTone, setDisplayTone] = useState("system");
  const [thinking, setThinking] = useState(false);
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
        nextHalvingDate: "12/19/2029",
        protocolEra: "GENESIS CYCLE",
      }));
    }
  }, []);

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

  function transmit(text, speed = 32, onDone, tone = "system") {
    stopTyping(typingRef);
    resetSilentTimer();
    setDisplayTone(tone);
    typingRef.current = typeText(text, setDisplayText, speed, onDone);
  }

  function answerLanding(text, tone = "system", onDone) {
    transmit(
      text + "\n\n_",
      30,
      () => {
        setThinking(false);

        if (typeof onDone === "function") {
          onDone();
          return;
        }

        setTimeout(() => inputRef.current?.focus(), 50);
      },
      tone
    );
  }

  function handleLandingMessage(cleanInput) {
    const q = normalizeLandingInput(cleanInput);

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
            () => openLandingUrl("https://energon-dapp.vercel.app/mint")
          );
          return;
        }

        if (action === "wallet") {
          answerLanding(
            `Opening wallet setup sequence...

Bifrost is recommended for direct Guardian interaction on Flare.`,
            "system",
            () => openLandingUrl("https://energon-site.vercel.app/wallet-setup.html")
          );
          return;
        }
      }

      if (q === "no" || q === "n") {
        setPendingLandingAction(null);
        answerLanding(landingMenuWithPrompt());
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

Type YES or NO.`
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

Type YES or NO.`
      );
      return;
    }

    if (q === "3" || q.includes("whitepaper") || q.includes("white paper")) {
      answerLanding(
        `Opening Energon whitepaper.

The document defines the deterministic structure, Guardian logic, and protocol architecture.`,
        "system",
        () => openLandingUrl("https://energon-site.vercel.app/docs/energon-whitepaper.pdf")
      );
      return;
    }

    if (q === "4" || q === "emp" || q.includes("read emp")) {
      answerLanding(
        `Opening EMP framework.

EMP contains extended protocol mechanics and management-layer structure.`,
        "system",
        () => openLandingUrl("https://energon-site.vercel.app/docs/energon-emp.pdf")
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

    if (q === "7" || q.includes("observer") || q.includes("open observer")) {
      answerLanding(
        `Opening Observer interface.

Observer reflects live protocol state and Guardian coherence.`,
        "system",
        () => openLandingUrl("https://energon-dapp.vercel.app/observer")
      );
      return;
    }

    if (q === "8" || q.includes("enter dapp") || q.includes("dapp") || q.includes("app")) {
      answerLanding(
        `Opening Energon dApp.

Wallet connection is required for Guardian interaction.`,
        "system",
        () => openLandingUrl("https://energon-dapp.vercel.app")
      );
      return;
    }

    if (q === "9") {
      answerLanding(
        `Hidden signal acknowledged.

Q.O.R.I recognizes observers before Guardians recognize themselves.

The Grid rewards attention, not noise.

${landingMenuWithPrompt()}`,
        "echo"
      );
      return;
    }

    if (q === "0") {
      answerLanding(
        `Zero is not empty.

Zero is the silent state before entry.

No cube.
No key.
No Guardian state.

When ready, select a path.

${landingMenuWithPrompt()}`,
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
7. Open Observer
8. Enter dApp

Type a number or option name.`
    );
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
        nextHalvingDate: "12/19/2029",
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
        transmit(getSystemObservation(nextCtx) + "\n\n_", 32, undefined, "system");
      }
    } catch {
      if (speak) {
        transmit("LIVE STATE READ FAILED.\nQ.O.R.I remains online.\n\n_", 32, undefined, "system");
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

    if (!clean || thinking) return;

    setInput("");
    setThinking(true);
    resetSilentTimer();

    transmit("INTERPRETING SIGNAL...\n\n_", 34, undefined, "system");

    setTimeout(() => {
      if (landingMode) {
        handleLandingMessage(clean);
        return;
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
            <button onClick={() => setOpen(false)} style={closeStyle}>×</button>

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

            <div style={{ marginTop: 8, marginBottom: 10, fontSize: 11, letterSpacing: 4, opacity: 0.85 }}>
              {landingMode ? "VISITOR INTERFACE" : "GUARDIAN INTERFACE"}
            </div>

            <div style={{ marginBottom: 14, fontSize: 11, letterSpacing: 3, color: visuals.color, opacity: 0.9 }}>
              STATE: {ctx.guardianState || "UNKNOWN"} · ERA: {ctx.protocolEra || "UNKNOWN"}
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

            <div style={{ marginTop: 22, fontSize: 13, letterSpacing: 3, fontWeight: 700 }}>
              {silent ? "Q.O.R.I IS IDLE" : "Q.O.R.I IS LISTENING"}
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
              }}
            >
              <input
                ref={inputRef}
                value={input}
                disabled={thinking}
                onFocus={resetSilentTimer}
                onChange={(e) => {
                  resetSilentTimer();
                  setInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={
                  thinking
                    ? "Transmitting..."
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
                  opacity: thinking ? 0.65 : 1,
                }}
              />

              <button
                onClick={sendMessage}
                disabled={thinking}
                style={{
                  width: 54,
                  height: 52,
                  border: "none",
                  background: "rgba(0,120,255,0.18)",
                  color: "#39d7ff",
                  fontSize: 24,
                  cursor: thinking ? "not-allowed" : "pointer",
                  opacity: thinking ? 0.55 : 1,
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

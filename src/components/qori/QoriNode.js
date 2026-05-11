import { useEffect, useRef, useState } from "react";
import { getQoriResponse } from "./qoriKnowledge";
import { getPersonalEchoResponse } from "./qoriPersonalEchoes";
import { typeText, stopTyping, maybeAddSignalDegradation } from "./qoriEffects";
import {
  getStateVisuals,
  getSystemObservation,
  readQoriLiveState,
} from "./qoriState";

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

    if (params.get("open") === "1") {
      setOpen(true);
    }

    if (params.get("mode") === "landing") {
      setLandingMode(true);
      setCtx((prev) => ({
        ...prev,
        walletConnected: false,
        guardianState: "VISITOR",
        cubeBalance: "-",
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

    silentRef.current = setTimeout(() => {
      setSilent(true);
    }, 240000);
  }

  function transmit(text, speed = 32, onDone, tone = "system") {
    stopTyping(typingRef);
    resetSilentTimer();
    setDisplayTone(tone);

    typingRef.current = typeText(text, setDisplayText, speed, onDone);
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
        transmit(
          "VISITOR MODE ACTIVE.\n\nQ.O.R.I is operating as a public guide.\nWallet and cube state are read inside the dApp Guardian interface.\n\n_",
          32,
          undefined,
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
      undefined,
      "system"
    );

    setTimeout(() => {
      refreshLiveState({ speak: true });

      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }, 2600);

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

    if (!clean || thinking) return;

    setInput("");
    setThinking(true);
    resetSilentTimer();

    transmit("INTERPRETING SIGNAL...\n\n_", 34, undefined, "system");

    setTimeout(() => {
      const personalEcho = getPersonalEchoResponse(clean);

      let answer = personalEcho || getQoriResponse(clean, ctx);
      const tone = personalEcho ? "echo" : "system";

      if (!personalEcho) {
        answer = maybeAddSignalDegradation(answer);
      }

      transmit(
        answer + "\n\n_",
        30,
        () => {
          setThinking(false);

          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
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

          setTimeout(() => {
            inputRef.current?.focus();
          }, 450);
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
          boxShadow: hovered ? visuals.shadow : visuals.shadow,
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
                placeholder={thinking ? "Transmitting..." : "Ask Q.O.R.I..."}
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

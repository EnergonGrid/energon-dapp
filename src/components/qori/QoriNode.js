import { useEffect, useRef, useState } from "react";
import { getQoriResponse, getVisitorMenu } from "./qoriKnowledge";
import { getVisitorEchoResponse } from "./qoriVisitorEchoes";
import { getCoherentEchoResponse } from "./qoriCoherentEchoes";
import { getVocabularyResponse } from "./qoriVocabulary";
import { buildGuardianDialogueResponse } from "./qoriConversation";
import { typeText, stopTyping, maybeAddSignalDegradation } from "./qoriEffects";
import {
  getStateVisuals,
  getSystemObservation,
  getVisitorObservation,
  readQoriLiveState,
  formatProtocolEraDisplay,
} from "./qoriState";

const QORI_MEMORY_KEY = "energon_qori_guardian_memory_v2";

function guardianMemoryKey(walletAddress) {
  const address = String(walletAddress || "").trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return null;
  return `${QORI_MEMORY_KEY}:14:${address}`;
}

const AMBIENT_OBSERVATIONS = [
  "Guardian signal remains coherent.",
  "Live protocol state received.",
  "The Grid remains observable.",
  "Q.O.R.I continues passive observation.",
  "Protocol state remains available for interpretation.",
  "Q.O.R.I remains observational.",
  "Current Energon state recorded.",
  "Guardian coherence confirmed.",
];

const GUARDIAN_PROMPTS = [
  "How is today treating you, Guardian?",
  "What are you focused on today?",
  "Do you want a protocol reading?",
  "Do you want Q.O.R.I to interpret the current state?",
  "Do you want to review what changed since last observation?",
  "Is the Grid helping you focus today?",
  "What signal are you watching today?",
  "What part of the Grid needs your attention?",
  "Do you want a calm protocol check?",
  "Should Q.O.R.I remain in passive observation?",
];

function randomGuardianPrompt() {
  return GUARDIAN_PROMPTS[Math.floor(Math.random() * GUARDIAN_PROMPTS.length)];
}

function normalizeInput(v = "") {
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanNumberText(v = "") {
  return String(v || "").replace(/,/g, "").trim();
}

function formatHeight(v = "") {
  const n = Number(cleanNumberText(v));
  if (!Number.isFinite(n)) return v || "UNKNOWN";
  return n.toLocaleString();
}

function parseHeightNumber(v = "") {
  const n = Number(cleanNumberText(v));
  return Number.isFinite(n) ? n : null;
}

function parseBurnNumber(v = "") {
  const cleaned = String(v || "")
    .replace(/EON/gi, "")
    .replace(/remaining/gi, "")
    .replace(/,/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function daysBetween(a, b) {
  try {
    const start = Number(a || 0);
    const end = Number(b || 0);
    if (!start || !end || end <= start) return 0;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function readMemory(walletAddress) {
  if (typeof window === "undefined") return {};
  const key = guardianMemoryKey(walletAddress);
  if (!key) return {};

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const memory = JSON.parse(raw);
    return memory && typeof memory === "object" && !Array.isArray(memory)
      ? memory
      : {};
  } catch {
    return {};
  }
}

function writeMemory(memory = {}, walletAddress) {
  if (typeof window === "undefined") return;
  const key = guardianMemoryKey(walletAddress);
  if (!key) return;

  try {
    localStorage.setItem(key, JSON.stringify(memory));
  } catch {}
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
    "8": "guardian chronicle",
    "9": "closing thought",
  };

  return map[q] || q;
}

function guardianDialoguePrompt(ctx = {}) {
  return `Q.O.R.I ACTIVE

Guardian coherence confirmed.

State:
${ctx.guardianState || "UNKNOWN"}

Energon Height:
${formatHeight(ctx.energonHeight || "UNKNOWN")}

${randomGuardianPrompt()}

_`;
}

function randomAmbientObservation(ctx = {}) {
  const base =
    AMBIENT_OBSERVATIONS[
      Math.floor(Math.random() * AMBIENT_OBSERVATIONS.length)
    ];

  const includeQuestion = Math.random() < 0.35;

  return `SYSTEM OBSERVATION

${base}

State:
${ctx.guardianState || "UNKNOWN"}

Energon Height:
${formatHeight(ctx.energonHeight || "UNKNOWN")}

Q.O.R.I observes.
Q.O.R.I does not intervene.

${includeQuestion ? randomGuardianPrompt() + "\n" : ""}_`;
}

function rareArchiveFragment() {
  if (Math.random() > 0.025) return "";

  const fragments = [
    `ARCHIVE FRAGMENT

"...the signal never stopped..."

[record incomplete]

_`,

    `ARCHIVE FRAGMENT

"...coherence was never enforced..."

[data missing]

_`,

    `SYSTEM OBSERVATION

State transition recorded.

Current protocol state remains observable.

_`,

    `Q.O.R.I observes.

Nothing more is required.

_`,
  ];

  return fragments[Math.floor(Math.random() * fragments.length)];
}

function buildStateChangeMessages(prev, next) {
  if (!prev || !next) return [];

  const messages = [];

  if (
    prev.guardianState &&
    next.guardianState &&
    prev.guardianState !== next.guardianState
  ) {
    if (next.guardianState === "COHERENT") {
      messages.push(`SYSTEM OBSERVATION

Guardian coherence established.

One EnergonCube detected.

Guardian state updated.

Welcome, Guardian.

_`);
    }

    if (prev.guardianState === "COHERENT" && next.guardianState === "NO KEY") {
      messages.push(`SYSTEM OBSERVATION

Guardian signal lost.

No EnergonCube detected.

Observer returned to passive monitoring.

_`);
    }

    if (next.guardianState === "FRACTURED") {
      messages.push(`SYSTEM OBSERVATION

Guardian coherence broken.

Multiple EnergonCubes detected.

Protocol observation continues.

Coherent state requires:

One wallet.
One cube.

_`);
    }
  }

  if (
    prev.energonHeight &&
    next.energonHeight &&
    prev.energonHeight !== next.energonHeight &&
    next.energonHeight !== "UNKNOWN"
  ) {
    messages.push(`SYSTEM OBSERVATION

Energon Height advanced.

${formatHeight(prev.energonHeight)} → ${formatHeight(next.energonHeight)}

The Grid continues.

_`);
  }

  const prevBurn = parseBurnNumber(prev.burnState);
  const nextBurn = parseBurnNumber(next.burnState);

  if (prevBurn !== null && nextBurn !== null && nextBurn < prevBurn) {
    messages.push(`SYSTEM OBSERVATION

Burn pool reduced.

${prevBurn.toLocaleString()} EON

↓

${nextBurn.toLocaleString()} EON

Genesis burn continues.

_`);
  }

  if (
    prev.protocolEraSource === "CHAIN" &&
    next.protocolEraSource === "CHAIN" &&
    prev.protocolEra &&
    next.protocolEra &&
    prev.protocolEra !== next.protocolEra
  ) {
    messages.push(`SYSTEM OBSERVATION

Protocol Era updated.

${prev.protocolEra}

↓

${next.protocolEra}

The Grid advances.

_`);
  }

  if (
    prev.halvingState &&
    next.halvingState &&
    prev.halvingState !== next.halvingState
  ) {
    messages.push(`SYSTEM OBSERVATION

Halving cycle updated.

${prev.halvingState}

↓

${next.halvingState}

Rule remains unchanged.

_`);
  }

  const rare = rareArchiveFragment();
  if (messages.length && rare) messages.push(rare);

  return messages;
}

function updateGuardianMemory(ctx = {}) {
  const now = Date.now();
  const memory = readMemory(ctx.walletAddress);

  const firstVisit = memory.firstVisit || now;
  const lastVisit = memory.lastVisit || 0;
  const visitCount = Number(memory.visitCount || 0) + 1;
  const observationCount = Number(memory.observationCount || 0) + 1;

  const previousHeight = memory.lastHeight || "";
  const currentHeight = ctx.energonHeight || "";
  const previousEra =
    memory.lastEraSource === "CHAIN" ? memory.lastEra || "" : "";
  const previousEraSource = memory.lastEraSource || "UNKNOWN";

  const currentEra =
    ctx.protocolEraSource === "CHAIN" ? ctx.protocolEra || "" : "";
  const currentEraSource = ctx.protocolEraSource || "UNKNOWN";

  const wasEverCoherent = !!memory.firstCoherent;
  const isCoherent = ctx.guardianState === "COHERENT";

  const nextMemory = {
    ...memory,
    firstVisit,
    lastVisit: now,
    visitCount,
    observationCount,
    lastGuardianState: ctx.guardianState || "UNKNOWN",
    lastHeight: currentHeight || previousHeight,
    lastEra: currentEra || memory.lastEra || "",
    lastEraSource:
      currentEraSource === "CHAIN"
        ? "CHAIN"
        : memory.lastEraSource || "UNKNOWN",
    firstCoherent: wasEverCoherent
      ? memory.firstCoherent
      : isCoherent
      ? now
      : memory.firstCoherent || "",
    milestones: memory.milestones || {},
  };

  writeMemory(nextMemory, ctx.walletAddress);

  return {
    previousMemory: memory,
    nextMemory,
    previousHeight,
    currentHeight,
    previousEra,
    currentEra,
    daysAway: daysBetween(lastVisit, now),
    isFirstVisit: !memory.firstVisit,
    isFirstCoherent: isCoherent && !wasEverCoherent,
  };
}

function buildGuardianMemoryMessages(ctx = {}) {
  if (ctx.guardianState !== "COHERENT") return [];

  const result = updateGuardianMemory(ctx);
  const {
    previousMemory,
    nextMemory,
    previousHeight,
    currentHeight,
    previousEra,
    currentEra,
    previousEraSource,
    currentEraSource,
    daysAway,
    isFirstVisit,
    isFirstCoherent,
  } = result;

  const messages = [];
  const milestones = { ...(nextMemory.milestones || {}) };

  if (isFirstVisit) {
    messages.push(`SYSTEM OBSERVATION

First Q.O.R.I observation recorded.

Guardian memory initialized.

Local record only.

_`);
  }

  if (isFirstCoherent && !milestones.firstCoherent) {
    milestones.firstCoherent = true;

    messages.push(`SYSTEM OBSERVATION

First coherent signal recorded.

One EnergonCube detected.

Welcome to the Grid.

_`);
  }

  const prevH = parseHeightNumber(previousHeight);
  const curH = parseHeightNumber(currentHeight);

  if (
    prevH !== null &&
    curH !== null &&
    curH > prevH &&
    previousMemory.lastVisit
  ) {
    const diff = curH - prevH;

    messages.push(`PREVIOUS OBSERVATION

Energon Height

${prevH.toLocaleString()}

↓

CURRENT OBSERVATION

${curH.toLocaleString()}

${diff.toLocaleString()} protocol advance${diff === 1 ? "" : "s"} occurred
since your previous observation.

_`);
  }

  if (
    previousEraSource === "CHAIN" &&
    currentEraSource === "CHAIN" &&
    previousEra &&
    currentEra &&
    previousEra !== currentEra
  ) {
    messages.push(`SYSTEM OBSERVATION

Guardian returned after era transition.

Previous Era:
${previousEra}

Current Era:
${currentEra}

The Grid continued.

_`);
  }

  if (daysAway >= 1) {
    messages.push(`SYSTEM OBSERVATION

Guardian recognized.

Last observation:
${daysAway} day${daysAway === 1 ? "" : "s"} ago.

Current observation recorded.

_`);
  }

  writeMemory({
    ...nextMemory,
    milestones,
  }, ctx.walletAddress);

  return messages;
}

function buildReturnRecognition(ctx = {}) {
  if (ctx.guardianState !== "COHERENT") {
    return `PUBLIC TERMINAL

Connect a wallet holding exactly one EnergonCube
to establish coherent Guardian Q.O.R.I.

Until then, this interface provides public protocol guidance only.

_`;
  }

  const memory = readMemory(ctx.walletAddress);
  const count = Number(memory.observationCount || 0);
  const lastVisit = Number(memory.lastVisit || 0);
  const away = daysBetween(lastVisit, Date.now());

  if (count > 0 && away >= 1) {
    return `SYSTEM OBSERVATION

Guardian recognized.

Previous observation:
${away} day${away === 1 ? "" : "s"} ago.

Current protocol state received.

${randomGuardianPrompt()}

_`;
  }

  if (count > 0) {
    return `SYSTEM OBSERVATION

Guardian recognized.

Observation #${count.toLocaleString()}.

State transition recorded.

${randomGuardianPrompt()}

_`;
  }

  return guardianDialoguePrompt(ctx);
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
  // Landing mode must be resolved before any live reads.
  const [landingMode, setLandingMode] = useState(null);
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
    protocolEraSource: "UNKNOWN",
  });

  const typingRef = useRef(null);
  const liveRef = useRef(null);
  const silentRef = useRef(null);
  const inputRef = useRef(null);
  const messageBoxRef = useRef(null);
  const returnMenuRef = useRef(null);
  const ambientTimerRef = useRef(null);
  const screenRef = useRef("boot");
  const previousWalletConnectedRef = useRef(false);
  const previousStateRef = useRef(null);
  const latestCtxRef = useRef(ctx);
  const eventQueueRef = useRef([]);
  const eventPlayingRef = useRef(false);
  const sessionEpochRef = useRef(0);
  const sessionTimersRef = useRef(new Set());
  const openRef = useRef(open);
  const guardianMemoryRecordedRef = useRef(false);
  const [sessionRevision, setSessionRevision] = useState(0);

  useEffect(() => {
    openRef.current = open;

    if (!open) {
      guardianMemoryRecordedRef.current = false;
    }
  }, [open]);

  useEffect(() => () => {
    sessionEpochRef.current += 1;
    for (const timer of sessionTimersRef.current) clearTimeout(timer);
    sessionTimersRef.current.clear();
    stopTyping(typingRef);
  }, []);

  useEffect(() => {
    latestCtxRef.current = ctx;
  }, [ctx]);

  function isCoherentQori(liveCtx = latestCtxRef.current) {
    return (
      !landingMode &&
      !!liveCtx.walletConnected &&
      liveCtx.guardianState === "COHERENT"
    );
  }

  function isVisitorFlow(liveCtx = latestCtxRef.current) {
    return !isCoherentQori(liveCtx);
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

  function scheduleSessionTimeout(callback, delay) {
    const epoch = sessionEpochRef.current;
    const timer = setTimeout(() => {
      sessionTimersRef.current.delete(timer);
      if (epoch !== sessionEpochRef.current) return;
      callback();
    }, delay);
    sessionTimersRef.current.add(timer);
    return timer;
  }

  function walletIdentity(value) {
    return value?.walletConnected
      ? String(value.walletAddress || "").toLowerCase()
      : "";
  }

  function preserveLastKnownState(nextCtx, previousCtx) {
    if (!nextCtx || !previousCtx) return nextCtx;

    const nextIdentity = walletIdentity(nextCtx);
    const previousIdentity = walletIdentity(previousCtx);

    // Never carry Guardian-specific state across wallet identity changes.
    const sameConnectedWallet =
      !!nextIdentity &&
      !!previousIdentity &&
      nextIdentity === previousIdentity;

    const merged = { ...nextCtx };

    // Public protocol reads: preserve only when the new read clearly failed.
    if (
      merged.energonHeight === "UNKNOWN" &&
      previousCtx.energonHeight &&
      previousCtx.energonHeight !== "UNKNOWN"
    ) {
      merged.energonHeight = previousCtx.energonHeight;
    }

    if (
      merged.tickState === "UNKNOWN" &&
      previousCtx.tickState &&
      previousCtx.tickState !== "UNKNOWN"
    ) {
      merged.tickState = previousCtx.tickState;
    }

    if (
      merged.burnState === "UNKNOWN" &&
      previousCtx.burnState &&
      previousCtx.burnState !== "UNKNOWN"
    ) {
      merged.burnState = previousCtx.burnState;
    }

    if (
      !merged.nextHalvingDate &&
      !merged.halvingCountdown &&
      previousCtx.nextHalvingDate
    ) {
      merged.nextHalvingDate = previousCtx.nextHalvingDate;
      merged.halvingCountdown = previousCtx.halvingCountdown;
      merged.halvingState = previousCtx.halvingState;
    }

    // Guardian state may only survive a failed Cube read for the same wallet.
    if (sameConnectedWallet) {
      if (
        merged.cubeBalance === "-" &&
        previousCtx.cubeBalance &&
        previousCtx.cubeBalance !== "-"
      ) {
        merged.cubeBalance = previousCtx.cubeBalance;
      }

      if (
        merged.guardianState === "UNKNOWN" &&
        previousCtx.guardianState &&
        previousCtx.guardianState !== "UNKNOWN"
      ) {
        merged.guardianState = previousCtx.guardianState;
      }
    }

    return merged;
  }

  function resetConversation(nextCtx = null) {
    sessionEpochRef.current += 1;
    stopTyping(typingRef);
    for (const timer of sessionTimersRef.current) clearTimeout(timer);
    sessionTimersRef.current.clear();
    silentRef.current = null;
    returnMenuRef.current = null;
    ambientTimerRef.current = null;
    eventQueueRef.current = [];
    eventPlayingRef.current = false;
    previousStateRef.current = null;
    previousWalletConnectedRef.current = false;
    guardianMemoryRecordedRef.current = false;
    screenRef.current = "boot";

    const freshCtx = nextCtx || {
      walletConnected: false,
      walletAddress: "",
      guardianState: "UNKNOWN",
      cubeBalance: "-",
      energonHeight: "UNKNOWN",
      tickState: "UNKNOWN",
      burnState: "UNKNOWN",
      halvingState: "UNKNOWN",
      nextHalvingDate: "",
      halvingCountdown: "",
      protocolEra: "UNKNOWN",
      protocolEraSource: "UNKNOWN",
    };
    latestCtxRef.current = freshCtx;
    setCtx(freshCtx);
    setInput("");
    setDisplayText("");
    setDisplayTone("system");
    setThinking(false);
    setIsTyping(false);
    setSilent(false);
    setWalletPromptGlow(false);
    setSessionRevision(value => value + 1);
  }

  function resetSilentTimer() {
    setSilent(false);
    if (silentRef.current) clearTimeout(silentRef.current);
    silentRef.current = scheduleSessionTimeout(() => setSilent(true), 240000);
  }

  function clearReturnMenuTimer() {
    if (returnMenuRef.current) {
      clearTimeout(returnMenuRef.current);
      returnMenuRef.current = null;
    }
  }

  function clearAmbientTimer() {
    if (ambientTimerRef.current) {
      clearTimeout(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }
  }

  function userIsTypingOrHoldingText() {
    return !!inputRef.current?.value?.trim();
  }

  function transmit(text, speed = 32, onDone, tone = "system") {
    stopTyping(typingRef);
    resetSilentTimer();
    setDisplayTone(tone);
    setIsTyping(true);

    const epoch = sessionEpochRef.current;
    typingRef.current = typeText(text, value => {
      if (epoch === sessionEpochRef.current) setDisplayText(value);
    }, speed, () => {
      if (epoch !== sessionEpochRef.current) return;
      setIsTyping(false);
      if (typeof onDone === "function") onDone();
    });
  }

  function scheduleAmbientObservation(delay = 90000) {
    if (!isCoherentQori()) return;

    clearReturnMenuTimer();
    clearAmbientTimer();

    ambientTimerRef.current = scheduleSessionTimeout(() => {
      const liveCtx = latestCtxRef.current;

      if (!open) return;

      if (!isCoherentQori(liveCtx)) {
        showVisitorMenu();
        return;
      }

      if (thinking || isTyping || eventPlayingRef.current) {
        scheduleAmbientObservation(30000);
        return;
      }

      if (userIsTypingOrHoldingText()) {
        scheduleAmbientObservation(30000);
        return;
      }

      screenRef.current = "ambient";

      transmit(
        randomAmbientObservation(liveCtx),
        30,
        () => {
          setThinking(false);
          scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
          scheduleAmbientObservation(90000 + Math.floor(Math.random() * 45000));
        },
        "system"
      );
    }, delay);
  }

  function playNextQueuedEvent() {
    if (!open) return;
    if (eventPlayingRef.current) return;
    if (thinking || isTyping) return;
    if (userIsTypingOrHoldingText()) return;
    if (!eventQueueRef.current.length) return;

    const next = eventQueueRef.current.shift();
    if (!next) return;

    clearReturnMenuTimer();
    clearAmbientTimer();
    eventPlayingRef.current = true;
    screenRef.current = "answer";

    transmit(next, 30, () => {
      eventPlayingRef.current = false;

      scheduleSessionTimeout(() => {
        if (eventQueueRef.current.length) playNextQueuedEvent();
        else scheduleAmbientObservation(90000);
      }, 5000);
    });
  }

  function queueStateMessages(messages = []) {
    if (!messages.length) return;
    eventQueueRef.current.push(...messages);
    scheduleSessionTimeout(() => playNextQueuedEvent(), 250);
  }

  function showVisitorMenu() {
    const liveCtx = latestCtxRef.current;

    clearReturnMenuTimer();
    clearAmbientTimer();
    setThinking(false);

    if (isCoherentQori(liveCtx)) {
      screenRef.current = "answer";

      transmit(
        guardianDialoguePrompt(liveCtx),
        30,
        () => {
          scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
          scheduleAmbientObservation(90000);
        },
        "system"
      );

      return;
    }

    screenRef.current = "menu";

    transmit(
      getVisitorMenu() + "\n\n_",
      30,
      () => scheduleSessionTimeout(() => inputRef.current?.focus(), 50),
      "system"
    );
  }

  function scheduleReturnToVisitorMenu(delay = 10000) {
    if (isCoherentQori()) return;

    clearReturnMenuTimer();

    returnMenuRef.current = scheduleSessionTimeout(() => {
      if (screenRef.current === "menu") return;

      if (userIsTypingOrHoldingText()) {
        scheduleReturnToVisitorMenu(10000);
        return;
      }

      showVisitorMenu();
    }, delay);
  }

  function resetReturnMenuAfterTyping(nextValue = "") {
    clearReturnMenuTimer();
    clearAmbientTimer();

    returnMenuRef.current = scheduleSessionTimeout(() => {
      if (String(nextValue).trim() || userIsTypingOrHoldingText()) {
        if (isVisitorFlow()) scheduleReturnToVisitorMenu(10000);
        else scheduleAmbientObservation(90000);
        return;
      }

      if (isVisitorFlow()) showVisitorMenu();
      else scheduleAmbientObservation(60000);
    }, 90000);
  }

  function answerLive(text, tone = "system") {
    clearReturnMenuTimer();
    clearAmbientTimer();
    screenRef.current = "answer";

    transmit(
      text + "\n\n_",
      30,
      () => {
        setThinking(false);
        if (isCoherentQori()) scheduleAmbientObservation(90000);
        else scheduleReturnToVisitorMenu(10000);
        scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
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
        () => openLandingUrl("https://energon-site.vercel.app/wallet-setup.html"),
        "system"
      );
      return true;
    }

    if (q === "5" || q.includes("whitepaper")) {
      transmit(
        "Opening Energon Whitepaper...\n\n_",
        30,
        () =>
          openLandingUrl(
            "https://energon-site.vercel.app/docs/energon-whitepaper.pdf"
          ),
        "system"
      );
      return true;
    }

    if (q === "6" || q.includes("emp")) {
      transmit(
        "Opening Energon EMP...\n\n_",
        30,
        () => openLandingUrl("https://energon-site.vercel.app/docs/energon-emp.pdf"),
        "system"
      );
      return true;
    }

    if (q === "7" || q.includes("mint") || q.includes("dapp")) {
      transmit(
        `Opening Energon Mint Site...

The EnergonCube is the access key.

One wallet.
One cube.
One Guardian.

_`,
        30,
        () => openLandingUrl("https://energon-dapp.vercel.app/mint"),
        "system"
      );
      return true;
    }

    if (
      q === "8" ||
      q.includes("guardian chronicle") ||
      q.includes("first guardian") ||
      q.includes("chronicle")
    ) {
      transmit(
        "Opening Guardian Chronicle...\n\n_",
        30,
        () => openLandingUrl("https://energon-guardian-page.vercel.app"),
        "system"
      );
      return true;
    }

    const visitorEcho = getVisitorEchoResponse(cleanInput);
    let answer = visitorEcho || getQoriResponse(query, { mode: "visitor" });
    const tone = visitorEcho ? "echo" : "system";

    if (!visitorEcho) answer = maybeAddSignalDegradation(answer);

    transmit(
      answer,
      30,
      () => {
        setThinking(false);
        scheduleReturnToVisitorMenu(10000);
        scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
      },
      tone
    );

    return true;
  }

  function handleCoherentMessage(cleanInput) {
    const q = normalizeInput(cleanInput);
    const liveCtx = latestCtxRef.current;

    if (!isCoherentQori(liveCtx)) {
      return handleVisitorMessage(cleanInput);
    }

    if (
      q === "help" ||
      q === "menu" ||
      q === "options" ||
      q.includes("what can you answer") ||
      q.includes("what can you do")
    ) {
      answerLive(`Q.O.R.I INTERFACE

Guardian dialogue active.

Ask directly.

Examples:

How is the Grid?
What changed since last observation?
Give me a protocol reading.
What does my Guardian state mean?
What should I focus on?

Q.O.R.I interprets state.

The Dashboard displays state.

${randomGuardianPrompt()}`);
      return true;
    }

    if (q.includes("status")) {
      answerLive(getSystemObservation(liveCtx));
      return true;
    }

    const dialogueAnswer = buildGuardianDialogueResponse(cleanInput, liveCtx);

    if (dialogueAnswer) {
      transmit(
        dialogueAnswer,
        30,
        () => {
          setThinking(false);
          scheduleAmbientObservation(90000);
          scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
        },
        "system"
      );
      return true;
    }

    const coherentEcho = getCoherentEchoResponse(cleanInput);

    if (coherentEcho) {
      transmit(
        coherentEcho + `

${randomGuardianPrompt()}

_`,
        30,
        () => {
          setThinking(false);
          scheduleAmbientObservation(90000);
          scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
        },
        "echo"
      );
      return true;
    }

    const vocabulary = getVocabularyResponse(cleanInput);

    if (vocabulary) {
      transmit(
        vocabulary + `

${randomGuardianPrompt()}

_`,
        30,
        () => {
          setThinking(false);
          scheduleAmbientObservation(90000);
          scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
        },
        "system"
      );
      return true;
    }

    transmit(
      `Signal received.

Q.O.R.I does not have a clean interpretation for that yet.

Try asking:

Give me a protocol reading.
What changed since last observation?
What does my Guardian state mean?
How is the Grid?

${randomGuardianPrompt()}

_`,
      30,
      () => {
        setThinking(false);
        scheduleAmbientObservation(90000);
        scheduleSessionTimeout(() => inputRef.current?.focus(), 50);
      },
      "system"
    );

    return true;
  }

  async function refreshLiveState({ speak = false } = {}) {
    const epoch = sessionEpochRef.current;
    if (landingMode === null) return null;

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
        protocolEraSource: "GUIDE",
      };

      latestCtxRef.current = visitorCtx;
      setCtx(visitorCtx);

      if (speak) {
        transmit(
          getVisitorObservation() + "\n\n_",
          32,
          () => scheduleSessionTimeout(showVisitorMenu, 900),
          "system"
        );
      }

      return visitorCtx;
    }

    try {
      let nextCtx = await readQoriLiveState();
      if (epoch !== sessionEpochRef.current) return null;

      nextCtx = preserveLastKnownState(nextCtx, latestCtxRef.current);

      if (walletIdentity(nextCtx) !== walletIdentity(latestCtxRef.current)) {
        resetConversation(nextCtx);
        return nextCtx;
      }
      const prevCtx = previousStateRef.current;

      latestCtxRef.current = nextCtx;
      setCtx(nextCtx);

      if (openRef.current && !speak && prevCtx && nextCtx.guardianState === "COHERENT") {
        queueStateMessages(buildStateChangeMessages(prevCtx, nextCtx));
      }

      previousStateRef.current = nextCtx;

      if (speak) {
        if (isCoherentQori(nextCtx)) {
          transmit(
            guardianDialoguePrompt(nextCtx),
            32,
            () => {
              setThinking(false);
              screenRef.current = "answer";
              scheduleAmbientObservation(90000);
            },
            "system"
          );
          return nextCtx;
        }

        transmit(
          getVisitorObservation() + "\n\n_",
          32,
          () => {
            setThinking(false);
            screenRef.current = "answer";
            scheduleReturnToVisitorMenu(10000);
          },
          "system"
        );
      }

      return nextCtx;
    } catch {
      if (epoch !== sessionEpochRef.current) return null;
      if (speak) {
        transmit(
          "LIVE STATE READ FAILED.\nQ.O.R.I remains online.\n\n_",
          32,
          undefined,
          "system"
        );
      }

      return null;
    }
  }

  useEffect(() => {
    if (landingMode) return;

    const wasConnected = previousWalletConnectedRef.current;
    const isConnected = !!ctx.walletConnected;

    if (!wasConnected && isConnected) setWalletPromptGlow(true);
    if (!isConnected) setWalletPromptGlow(false);

    previousWalletConnectedRef.current = isConnected;
  }, [ctx.walletConnected, landingMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (params.get("open") === "1") setOpen(true);
    setLandingMode(params.get("mode") === "landing");
  }, []);

  useEffect(() => {
    if (landingMode !== false) return;

    const provider = window.ethereum;
    const refreshFromFocus = () => refreshLiveState({ speak: false });
    const resetFromWallet = () => {
      resetConversation();
      if (!openRef.current) refreshLiveState({ speak: false });
    };

    provider?.on?.("accountsChanged", resetFromWallet);
    provider?.on?.("chainChanged", resetFromWallet);
    provider?.on?.("disconnect", resetFromWallet);
    window.addEventListener("focus", refreshFromFocus);

    return () => {
      provider?.removeListener?.("accountsChanged", resetFromWallet);
      provider?.removeListener?.("chainChanged", resetFromWallet);
      provider?.removeListener?.("disconnect", resetFromWallet);
      window.removeEventListener("focus", refreshFromFocus);
    };
  }, [landingMode]);

  useEffect(() => {
    if (landingMode === null) return;

    refreshLiveState();

    if (!landingMode) {
      liveRef.current = setInterval(() => refreshLiveState(), 30000);
    }

    return () => {
      if (liveRef.current) clearInterval(liveRef.current);
      if (silentRef.current) clearTimeout(silentRef.current);
      clearReturnMenuTimer();
      clearAmbientTimer();
    };
  }, [landingMode]);

  useEffect(() => {
    if (!open || landingMode === null) {
      clearAmbientTimer();
      return;
    }

    let cancelled = false;
    const epoch = sessionEpochRef.current;

    async function bootQori() {
      resetSilentTimer();
      clearReturnMenuTimer();
      clearAmbientTimer();
      stopTyping(typingRef);

      let bootCtx = latestCtxRef.current;

      try {
        const liveCtx = landingMode
          ? await refreshLiveState()
          : await readQoriLiveState();
        if (cancelled || epoch !== sessionEpochRef.current) return;
        if (liveCtx) {
          const mergedCtx = preserveLastKnownState(
            liveCtx,
            latestCtxRef.current
          );

          if (
            walletIdentity(mergedCtx) !==
            walletIdentity(latestCtxRef.current)
          ) {
            resetConversation(mergedCtx);
            return;
          }

          bootCtx = mergedCtx;
          latestCtxRef.current = mergedCtx;
          setCtx(mergedCtx);
          previousStateRef.current = mergedCtx;
        }
      } catch {}

      if (cancelled || epoch !== sessionEpochRef.current) return;

      const coherent = isCoherentQori(bootCtx);

      let openingText;

      if (coherent) {
        openingText = buildReturnRecognition(bootCtx);

        if (!guardianMemoryRecordedRef.current) {
          guardianMemoryRecordedRef.current = true;

          const memoryMessages = buildGuardianMemoryMessages(bootCtx);

          if (memoryMessages.length) {
            openingText += `

${memoryMessages.join("\n\n")}`;
          }
        }
      } else {
        openingText = `PUBLIC TERMINAL

Connect a wallet holding exactly one EnergonCube
to establish coherent Guardian Q.O.R.I.

Until then, this interface provides public protocol guidance only.

_`;
      }

      transmit(
        openingText,
        35,
        () => {
          if (cancelled || epoch !== sessionEpochRef.current) return;

          if (coherent) {
            screenRef.current = "answer";
            scheduleAmbientObservation(90000);
          } else {
            scheduleSessionTimeout(showVisitorMenu, 900);
          }

          scheduleSessionTimeout(() => inputRef.current?.focus(), 250);
        },
        "system"
      );
    }

    bootQori();

    return () => {
      cancelled = true;
      stopTyping(typingRef);
    };
  }, [open, landingMode, sessionRevision]);

  useEffect(() => {
    if (!messageBoxRef.current) return;
    messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
  }, [displayText]);

  useEffect(() => {
    if (!open) return;
    if (!eventQueueRef.current.length) return;
    if (thinking || isTyping) return;

    const t = scheduleSessionTimeout(() => playNextQueuedEvent(), 800);

    return () => clearTimeout(t);
  }, [open, thinking, isTyping]);

  function sendMessage() {
    const clean = input.trim();

    if (!clean || thinking || isTyping) return;

    clearReturnMenuTimer();
    clearAmbientTimer();
    setInput("");
    setThinking(true);
    resetSilentTimer();

    transmit("INTERPRETING SIGNAL...\n\n_", 34, undefined, "system");

    scheduleSessionTimeout(() => {
      if (isVisitorFlow()) handleVisitorMessage(clean);
      else handleCoherentMessage(clean);
    }, 1000);
  }

  function openQoriNode() {
    setWalletPromptGlow(false);
    setOpen(true);
    scheduleSessionTimeout(() => inputRef.current?.focus(), 450);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const openFromProtocol = () => openQoriNode();
    window.addEventListener("energon:open-qori", openFromProtocol);

    return () => window.removeEventListener("energon:open-qori", openFromProtocol);
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
            boxShadow: isVisitorFlow()
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
        <div style={overlayStyle}>
          <div style={panelStyle(ctx)}>
            <button onClick={() => setOpen(false)} style={closeButtonStyle}>
              ×
            </button>

            <div style={titleStyle(ctx)}>Q.O.R.I</div>

            <div style={subTitleStyle}>
              {isVisitorFlow() ? "PUBLIC TERMINAL" : "GUARDIAN INTERFACE"}
            </div>

            <div style={{ ...stateStyle, color: activeTextColor }}>
              STATE:{" "}
              {ctx.walletConnected ? ctx.guardianState || "UNKNOWN" : "NO SIGNAL"} ·
              ERA: {formatProtocolEraDisplay(ctx)}
            </div>

            <div
              ref={messageBoxRef}
              style={messageBoxStyle(displayTone, activeTextColor, activeTextShadow)}
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

            <div style={beamStyle(displayTone, isVisitorFlow(), visuals)} />

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
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={
                  thinking || isTyping
                    ? "Q.O.R.I transmitting..."
                    : isVisitorFlow()
                    ? "Ask Q.O.R.I or connect wallet..."
                    : "Speak to Q.O.R.I..."
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
  };
}

function titleStyle(ctx) {
  return {
    fontSize: 34,
    color:
      ctx.guardianState === "FRACTURED"
        ? "#ff7070"
        : ctx.guardianState === "COHERENT"
        ? "#00ffc6"
        : "#1ec8ff",
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
    background:
      displayTone === "echo" ? "rgba(75,48,0,0.22)" : "rgba(0,20,40,0.35)",
    color: activeTextColor,
    lineHeight: 1.7,
    fontSize: 15,
    height: 230,
    maxHeight: 230,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    textShadow: activeTextShadow,
  };
}

function beamStyle(displayTone, visitorFlow, visuals) {
  const color =
    displayTone === "echo" ? "#ffcf6b" : visitorFlow ? "#1ec8ff" : visuals.color;

  return {
    marginTop: 12,
    height: 2,
    width: "100%",
    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
    boxShadow:
      displayTone === "echo"
        ? "0 0 12px rgba(255,207,107,0.75)"
        : visitorFlow
        ? "0 0 12px rgba(30,200,255,0.75)"
        : visuals.shadow,
    opacity: 1,
  };
}

const subTitleStyle = {
  marginTop: 8,
  marginBottom: 10,
  fontSize: 11,
  letterSpacing: 4,
  opacity: 0.85,
};

const stateStyle = {
  marginBottom: 14,
  fontSize: 11,
  letterSpacing: 3,
  opacity: 0.9,
};

const statusStyle = {
  marginTop: 22,
  fontSize: 13,
  letterSpacing: 3,
  fontWeight: 700,
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

const closeButtonStyle = {
  position: "absolute",
  top: 12,
  right: 14,
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: 34,
  cursor: "pointer",
  zIndex: 10002,
  lineHeight: 1,
  opacity: 0.9,
};
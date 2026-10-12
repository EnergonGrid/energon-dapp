import React, { useEffect, useState } from "react";
import Panel from "../Panel";

function ImpactLine({ ui, label, value, loading, note, error }) {
  return (
    <div style={ui.footnote}>
      {label}: <b>{value}</b>
      {loading ? <span style={{ marginLeft: 8, opacity: 0.75 }}>…</span> : null}
      {note ? (
        <span style={{ marginLeft: 8, opacity: 0.75 }}>{note}</span>
      ) : null}
      {error ? <div style={{ marginTop: 4, opacity: 0.8 }}>{error}</div> : null}
    </div>
  );
}

function MaturitySelector({ ui, value, setValue, locked }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={ui.footnote}>Maturity tier</div>

      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={locked}
        style={{
          ...ui.select,
          marginTop: 6,
          opacity: locked ? 0.55 : 1,
          cursor: locked ? "not-allowed" : "pointer",
        }}
      >
        <option value="0">FREE 24H — 0% maturity fee</option>
        <option value="1">FAST 12H — 10% maturity fee</option>
        <option value="2">RAPID 6H — 20% maturity fee</option>
      </select>
    </div>
  );
}

function toBigIntSafe(value, fallback = 0n) {
  try {
    if (typeof value === "bigint") return value;

    if (typeof value === "number") {
      return BigInt(Math.trunc(value));
    }

    if (typeof value === "string" && value.trim() !== "") {
      return BigInt(value);
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function formatWflrAmount(value) {
  try {
    const amount = typeof value === "bigint" ? value : BigInt(value ?? 0);

    const oneWflr = 10n ** 18n;

    if (amount === oneWflr) {
      return "1 WFLR";
    }

    const whole = amount / oneWflr;
    const remainder = amount % oneWflr;

    if (remainder === 0n) {
      return `${whole.toString()} WFLR`;
    }

    const fraction = remainder.toString().padStart(18, "0").replace(/0+$/, "");

    return `${whole.toString()}.${fraction} WFLR`;
  } catch {
    return "1 WFLR";
  }
}

function BigGuardianLockBanner({
  guardianThresholdMet,
  guardianCount,
  guardianThreshold,
  accessLockReason,
  canWrite,
  onSyncGuardian,
  guardianStateLabel,
  guardianStateMessage,
  guardianActionsAllowed,
  guardianEntryAuthorized = false,
  guardianEntryButtonText = "Enter as Guardian",
  guardianAlreadySynced = false,
  syncFeeWflr = 1000000000000000000n,
  accessGrantedDismissed = false,
  onDismissAccessGranted,
}) {
  const [guardianEntryStarted, setGuardianEntryStarted] = useState(false);
  const [guardianCubeIdInput, setGuardianCubeIdInput] = useState("");
  const [guardianCubeIdError, setGuardianCubeIdError] = useState("");

  const isAccessGranted = Boolean(guardianActionsAllowed);

  const count = String(guardianCount ?? 0);
  const threshold = String(guardianThreshold ?? 250000);

  const isCoherent = guardianStateLabel === "COHERENT";
  const isFractured = guardianStateLabel === "FRACTURED";

  const showSyncGuardianStep =
    guardianEntryStarted && !guardianAlreadySynced && !isAccessGranted;

  const syncDisabled = !canWrite || !isCoherent || guardianAlreadySynced;

  const feeText = formatWflrAmount(syncFeeWflr);

  const stepHoldDone = isCoherent;
  const stepSyncDone = guardianAlreadySynced;
  const stepDelayDone = guardianActionsAllowed;
  const stepThresholdDone = guardianThresholdMet;

  useEffect(() => {
    if (!isCoherent) {
      setGuardianEntryStarted(false);
      setGuardianCubeIdInput("");
      setGuardianCubeIdError("");
    }
  }, [isCoherent]);

  useEffect(() => {
    if (guardianAlreadySynced || isAccessGranted) {
      setGuardianEntryStarted(false);
      setGuardianCubeIdInput("");
      setGuardianCubeIdError("");
    }
  }, [guardianAlreadySynced, isAccessGranted]);

  if (isAccessGranted && accessGrantedDismissed) {
    return null;
  }

  const ringColor = (done, strong = false) =>
    done
      ? strong
        ? "rgba(0,255,120,0.86)"
        : "rgba(0,255,120,0.62)"
      : strong
        ? "rgba(255,90,90,0.18)"
        : "rgba(255,90,90,0.24)";

  const ringGlow = (done) =>
    done ? "0 0 22px rgba(0,255,120,0.34)" : "0 0 28px rgba(255,40,40,0.22)";

  const handleGuardianButton = () => {
    if (isAccessGranted) {
      onDismissAccessGranted?.();
      return;
    }

    if (syncDisabled) return;

    // First click opens the Cube ID verification step.
    if (!guardianEntryStarted) {
      setGuardianEntryStarted(true);
      setGuardianCubeIdError("");
      return;
    }

    const cubeIdText = String(guardianCubeIdInput || "").trim();

    if (!cubeIdText) {
      setGuardianCubeIdError(
        "Enter the EnergonCube ID currently owned by this wallet.",
      );
      return;
    }

    let cubeId;

    try {
      cubeId = BigInt(cubeIdText);
    } catch {
      setGuardianCubeIdError("Enter a valid EnergonCube ID.");
      return;
    }

    if (cubeId <= 0n || cubeId > 1000000n) {
      setGuardianCubeIdError("EnergonCube ID must be between 1 and 1,000,000.");
      return;
    }

    setGuardianCubeIdError("");

    onSyncGuardian?.(cubeId);
  };

  const checklistItem = (icon, title, sub, done) => (
    <div
      className="guardianChecklistItem"
      style={{
        background: done
          ? "linear-gradient(135deg, rgba(0,190,85,0.92), rgba(0,115,52,0.92))"
          : "rgba(255,55,55,0.12)",

        border: done
          ? "1px solid rgba(0,255,130,0.85)"
          : "1px solid rgba(255,80,80,0.24)",

        boxShadow: done
          ? "0 0 14px rgba(0,255,120,0.20), inset 0 0 18px rgba(255,255,255,0.08)"
          : "none",
      }}
    >
      <div className="guardianChecklistIcon">{icon}</div>

      <div className="guardianChecklistText">
        <div className="guardianChecklistTitle">{title}</div>
        <div className="guardianChecklistSub">{sub}</div>
      </div>

      <div
        className="guardianChecklistStatus"
        style={{
          color: done ? "#ffd54a" : "rgba(255,70,80,0.95)",

          textShadow: done ? "0 0 10px rgba(255,213,74,0.45)" : "none",
        }}
      >
        {done ? "✓" : "×"}
      </div>
    </div>
  );

  const buttonLabel = isAccessGranted
    ? "Welcome In Guardian"
    : guardianAlreadySynced
      ? "Guardian Registered"
      : showSyncGuardianStep && guardianEntryAuthorized
        ? "Sync Guardian"
        : showSyncGuardianStep
          ? "Verify Guardian"
          : guardianEntryButtonText;

  const lockMessage = isAccessGranted
    ? "Welcome to Energon Management Protocol"
    : showSyncGuardianStep && guardianEntryAuthorized
      ? "Guardian verification confirmed. Press Sync Guardian to register this Cube."
      : showSyncGuardianStep
        ? "Enter the EnergonCube ID currently owned by this wallet, then verify Guardian entry."
        : isFractured
          ? "Guardian access fractured • wallet holds 2+ cubes"
          : guardianStateMessage ||
            accessLockReason ||
            "Guardian access locked • wallet holds 0 cubes";

  return (
    <>
      <style>{`
        .guardianLockShell,
        .guardianStateBanner {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        .guardianLockGrid {
          position: relative;
          z-index: 2;

          display: grid;
          grid-template-columns: 220px minmax(0, 1fr) 250px;

          gap: 22px;
          align-items: center;

          width: 100%;
          min-width: 0;
        }

        .guardianRingWrap {
          width: 190px;
          height: 190px;

          border-radius: 50%;
          position: relative;

          margin: 0 auto;
          flex: 0 0 auto;
        }

        .guardianRingOuter {
          position: absolute;
          inset: 10px;

          border-radius: 50%;
        }

        .guardianRingMiddle {
          position: absolute;
          inset: 34px;

          border-radius: 50%;
        }

        .guardianRingInner {
          position: absolute;
          inset: 56px;

          border-radius: 50%;
        }

        .guardianRingCore {
          position: absolute;
          inset: 72px;

          border-radius: 50%;
        }

        .guardianLockCenter {
          text-align: center;
          min-width: 0;
          width: 100%;
        }

        .guardianLockTitle {
          font-size: 42px;
          font-weight: 1000;
          letter-spacing: 1.5px;
          line-height: 1.08;

          text-transform: uppercase;
          overflow-wrap: anywhere;
        }

        .guardianLockMessage {
          margin-top: 14px;

          font-size: 17px;
          font-weight: 950;
          line-height: 1.35;

          overflow-wrap: anywhere;
        }

        .guardianLockCount {
          margin-top: 14px;

          font-size: 20px;
          font-weight: 950;
          line-height: 1.3;

          overflow-wrap: anywhere;
        }

        .guardianLockDescription {
          margin-top: 14px;

          font-size: 14px;
          line-height: 1.55;

          overflow-wrap: anywhere;
        }

        .guardianCubeEntry {
          width: min(420px, 100%);
          margin: 18px auto 0;

          text-align: left;
        }

        .guardianCubeEntryLabel {
          margin-bottom: 6px;

          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.8px;

          color: rgba(255,255,255,0.88);
          text-transform: uppercase;
        }

        .guardianCubeEntryInput {
          box-sizing: border-box;

          width: 100%;
          min-height: 48px;

          padding: 12px 14px;

          border-radius: 9px;
          border: 1px solid rgba(255,176,0,0.70);

          background: rgba(0,0,0,0.42);
          color: white;

          outline: none;

          font-size: 17px;
          font-weight: 900;
        }

        .guardianCubeEntryInput::placeholder {
          color: rgba(255,255,255,0.42);
        }

        .guardianCubeEntryInput:focus {
          border-color: rgba(255,215,90,0.96);

          box-shadow:
            0 0 14px rgba(255,176,0,0.24),
            inset 0 0 12px rgba(255,176,0,0.05);
        }

        .guardianCubeEntryInput:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .guardianCubeEntryHelp {
          margin-top: 6px;

          color: rgba(255,245,215,0.68);

          font-size: 11px;
          font-weight: 750;
          line-height: 1.35;
        }

        .guardianCubeEntryError {
          margin-top: 6px;

          color: rgba(255,110,110,0.98);

          font-size: 12px;
          font-weight: 900;
          line-height: 1.35;
        }

        .guardianEntryButton {
          margin-top: 22px;

          width: min(420px, 100%);
          min-height: 54px;

          padding: 15px 18px;

          border-radius: 10px;

          color: white;

          font-size: 20px;
          font-weight: 1000;
          line-height: 1.15;

          white-space: normal;
          overflow-wrap: anywhere;
        }

        .guardianChecklist {
          display: grid;
          gap: 6px;

          width: 100%;
          min-width: 0;
        }

        .guardianChecklistItem {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 30px;

          gap: 10px;
          align-items: center;

          padding: 10px;

          border-radius: 8px;
          box-sizing: border-box;

          min-width: 0;
          width: 100%;
        }

        .guardianChecklistIcon {
          font-size: 22px;
          opacity: 0.95;
          text-align: center;
        }

        .guardianChecklistText {
          min-width: 0;
        }

        .guardianChecklistTitle {
          font-size: 12px;
          font-weight: 950;
          color: white;

          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .guardianChecklistSub {
          margin-top: 2px;

          font-size: 11px;
          font-weight: 800;
          color: rgba(255,245,230,0.84);

          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .guardianChecklistStatus {
          font-size: 24px;
          font-weight: 1000;
          text-align: center;
        }

        .guardianStateBanner {
          margin-bottom: 14px;

          border-radius: 12px;
          padding: 12px 16px;

          display: grid;
          grid-template-columns: 42px 190px minmax(0, 1fr) 220px;

          gap: 12px;
          align-items: center;

          min-width: 0;
        }

        .guardianStateIcon {
          font-size: 28px;
          line-height: 1;
          text-align: center;
        }

        .guardianStateMode {
          font-size: 22px;
          font-weight: 1000;

          min-width: 0;
          overflow-wrap: anywhere;
        }

        .guardianStateMessage {
          font-size: 13px;
          font-weight: 750;
          line-height: 1.35;

          min-width: 0;
          overflow-wrap: anywhere;
        }

        .guardianStateManual {
          justify-self: end;

          font-weight: 1000;
          text-align: right;
          line-height: 1.3;

          min-width: 0;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1050px) {
          .guardianLockGrid {
            grid-template-columns: 175px minmax(0, 1fr) 220px;
            gap: 16px;
          }

          .guardianRingWrap {
            width: 156px;
            height: 156px;
          }

          .guardianRingOuter {
            inset: 8px;
            border-width: 15px !important;
          }

          .guardianRingMiddle {
            inset: 28px;
            border-width: 13px !important;
          }

          .guardianRingInner {
            inset: 47px;
            border-width: 11px !important;
          }

          .guardianRingCore {
            inset: 61px;
            border-width: 7px !important;
          }

          .guardianLockTitle {
            font-size: 34px;
          }

          .guardianLockMessage {
            font-size: 15px;
          }

          .guardianLockCount {
            font-size: 17px;
          }

          .guardianEntryButton {
            font-size: 17px;
          }

          .guardianStateBanner {
            grid-template-columns: 36px 155px minmax(0, 1fr) 190px;
            gap: 10px;
          }

          .guardianStateMode {
            font-size: 18px;
          }

          .guardianStateManual {
            font-size: 13px;
          }
        }

        @media (max-width: 820px) {
          .guardianLockShell {
            padding: 16px !important;
          }

          .guardianLockGrid {
            grid-template-columns: 150px minmax(0, 1fr);
            grid-template-areas:
              "ring center"
              "checklist checklist";

            gap: 18px;
          }

          .guardianRingColumn {
            grid-area: ring;
          }

          .guardianLockCenter {
            grid-area: center;
          }

          .guardianChecklist {
            grid-area: checklist;

            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .guardianRingWrap {
            width: 142px;
            height: 142px;
          }

          .guardianRingOuter {
            inset: 7px;
            border-width: 13px !important;
          }

          .guardianRingMiddle {
            inset: 25px;
            border-width: 11px !important;
          }

          .guardianRingInner {
            inset: 42px;
            border-width: 10px !important;
          }

          .guardianRingCore {
            inset: 55px;
            border-width: 6px !important;
          }

          .guardianLockTitle {
            font-size: 30px;
          }

          .guardianLockMessage {
            margin-top: 10px;
            font-size: 14px;
          }

          .guardianLockCount {
            margin-top: 10px;
            font-size: 16px;
          }

          .guardianLockDescription {
            margin-top: 10px;
            font-size: 13px;
          }

          .guardianCubeEntry {
            margin-top: 14px;
          }

          .guardianEntryButton {
            margin-top: 16px;
            min-height: 48px;
            padding: 12px 14px;
            font-size: 16px;
          }

          .guardianStateBanner {
            grid-template-columns: 36px minmax(0, 1fr) auto;
            grid-template-areas:
              "stateIcon stateMode stateManual"
              "stateMessage stateMessage stateMessage";

            gap: 8px 10px;
          }

          .guardianStateIcon {
            grid-area: stateIcon;
          }

          .guardianStateMode {
            grid-area: stateMode;
          }

          .guardianStateMessage {
            grid-area: stateMessage;
            padding-left: 46px;
          }

          .guardianStateManual {
            grid-area: stateManual;
          }
        }

        @media (max-width: 620px) {
          .guardianLockShell {
            padding: 14px 12px !important;
            border-radius: 12px !important;
          }

          .guardianLockGrid {
            display: flex;
            flex-direction: column;

            gap: 16px;
            align-items: stretch;
          }

          .guardianRingColumn {
            width: 100%;

            display: flex;
            justify-content: center;
          }

          .guardianRingWrap {
            width: 132px;
            height: 132px;
          }

          .guardianRingOuter {
            inset: 7px;
            border-width: 12px !important;
          }

          .guardianRingMiddle {
            inset: 24px;
            border-width: 10px !important;
          }

          .guardianRingInner {
            inset: 40px;
            border-width: 9px !important;
          }

          .guardianRingCore {
            inset: 52px;
            border-width: 6px !important;
          }

          .guardianLockTitle {
            font-size: clamp(27px, 9vw, 36px);
            letter-spacing: 1px;
          }

          .guardianLockMessage {
            margin-top: 10px;

            font-size: 14px;
            line-height: 1.4;
          }

          .guardianLockCount {
            margin-top: 10px;

            font-size: 16px;
            line-height: 1.35;
          }

          .guardianLockDescription {
            margin-top: 10px;

            font-size: 13px;
            line-height: 1.5;
          }

          .guardianCubeEntry {
            width: 100%;
            margin-top: 14px;
          }

          .guardianCubeEntryInput {
            min-height: 48px;
            font-size: 16px;
          }

          .guardianEntryButton {
            margin-top: 16px;

            width: 100%;
            min-height: 50px;

            padding: 13px 14px;

            font-size: 17px;
          }

          .guardianChecklist {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .guardianChecklistItem {
            grid-template-columns: 30px minmax(0, 1fr) 26px;

            gap: 8px;
            padding: 9px 10px;
          }

          .guardianChecklistIcon {
            font-size: 20px;
          }

          .guardianChecklistStatus {
            font-size: 22px;
          }

          .guardianStateBanner {
            display: grid;

            grid-template-columns: 34px minmax(0, 1fr);
            grid-template-areas:
              "stateIcon stateMode"
              "stateMessage stateMessage"
              "stateManual stateManual";

            padding: 12px;

            gap: 8px 10px;
          }

          .guardianStateIcon {
            grid-area: stateIcon;
          }

          .guardianStateMode {
            grid-area: stateMode;

            font-size: 19px;
            line-height: 1.2;
          }

          .guardianStateMessage {
            grid-area: stateMessage;

            padding-left: 0;

            font-size: 13px;
            line-height: 1.4;
          }

          .guardianStateManual {
            grid-area: stateManual;

            justify-self: stretch;
            text-align: center;

            padding-top: 9px;

            border-top: 1px solid rgba(255,255,255,0.10);

            font-size: 13px;
          }
        }

        @media (max-width: 390px) {
          .guardianLockShell {
            padding: 12px 10px !important;
          }

          .guardianRingWrap {
            width: 116px;
            height: 116px;
          }

          .guardianRingOuter {
            inset: 6px;
            border-width: 10px !important;
          }

          .guardianRingMiddle {
            inset: 21px;
            border-width: 9px !important;
          }

          .guardianRingInner {
            inset: 35px;
            border-width: 8px !important;
          }

          .guardianRingCore {
            inset: 46px;
            border-width: 5px !important;
          }

          .guardianLockTitle {
            font-size: 27px;
          }

          .guardianLockMessage {
            font-size: 13px;
          }

          .guardianLockCount {
            font-size: 15px;
          }

          .guardianLockDescription {
            font-size: 12px;
          }

          .guardianCubeEntryLabel,
          .guardianCubeEntryError {
            font-size: 11px;
          }

          .guardianCubeEntryHelp {
            font-size: 10px;
          }

          .guardianCubeEntryInput {
            min-height: 46px;
            font-size: 15px;
          }

          .guardianEntryButton {
            min-height: 48px;
            font-size: 15px;
          }

          .guardianChecklistTitle {
            font-size: 11px;
          }

          .guardianChecklistSub {
            font-size: 10px;
          }

          .guardianStateMode {
            font-size: 17px;
          }

          .guardianStateMessage,
          .guardianStateManual {
            font-size: 12px;
          }
        }
      `}</style>

      <div
        className="guardianLockShell"
        style={{
          marginTop: 8,
          marginBottom: 14,

          borderRadius: 14,
          padding: 18,

          position: "relative",
          overflow: "hidden",

          background: isAccessGranted
            ? "linear-gradient(180deg, rgba(0,190,85,0.92), rgba(0,95,45,0.92))"
            : showSyncGuardianStep && guardianEntryAuthorized && !syncDisabled
              ? "linear-gradient(180deg, rgba(35,145,255,0.98), rgba(0,70,180,0.96))"
              : showSyncGuardianStep && !syncDisabled
                ? "linear-gradient(180deg, rgba(255,176,0,0.96), rgba(170,85,0,0.94))"
                : "linear-gradient(180deg, rgba(160,25,25,0.72), rgba(80,0,0,0.70))",

          border: isAccessGranted
            ? "1px solid rgba(0,255,130,0.70)"
            : "1px solid rgba(255,55,55,0.70)",

          boxShadow: isAccessGranted
            ? "0 0 18px rgba(0,255,120,0.22)"
            : showSyncGuardianStep && guardianEntryAuthorized && !syncDisabled
              ? "0 0 22px rgba(40,150,255,0.42)"
              : showSyncGuardianStep && !syncDisabled
                ? "0 0 18px rgba(255,176,0,0.28)"
                : "none",

          color: "white",
        }}
      >
        <div className="guardianLockGrid">
          <div className="guardianRingColumn">
            <div className="guardianRingWrap">
              <div
                className="guardianRingOuter"
                style={{
                  border: `18px solid ${ringColor(stepThresholdDone)}`,

                  boxShadow: ringGlow(stepThresholdDone),
                }}
              />

              <div
                className="guardianRingMiddle"
                style={{
                  border: `16px solid ${ringColor(stepDelayDone)}`,

                  boxShadow: ringGlow(stepDelayDone),
                }}
              />

              <div
                className="guardianRingInner"
                style={{
                  border: `14px solid ${ringColor(stepSyncDone)}`,

                  boxShadow: ringGlow(stepSyncDone),
                }}
              />

              <div
                className="guardianRingCore"
                style={{
                  background: stepHoldDone
                    ? "radial-gradient(circle, rgba(0,255,120,0.95), rgba(0,170,80,0.82))"
                    : "rgba(255,90,90,0.10)",

                  border: `8px solid ${
                    stepHoldDone
                      ? "rgba(0,255,120,0.92)"
                      : "rgba(255,90,90,0.24)"
                  }`,

                  boxShadow: stepHoldDone
                    ? "0 0 24px rgba(0,255,120,0.52)"
                    : "0 0 14px rgba(255,40,40,0.16)",
                }}
              />
            </div>
          </div>

          <div className="guardianLockCenter">
            <div className="guardianLockTitle">
              {isAccessGranted ? "Access Granted" : "⚠ Vault Access Locked ⚠"}
            </div>

            <div className="guardianLockMessage">{lockMessage}</div>

            <div className="guardianLockCount">
              👥 {count} / {threshold} guardian(s) registered
            </div>

            <div className="guardianLockDescription">
              Guardian registration cost: <b>{feeText}</b>, paid to the vault.
              <br />
              Requires exactly <b>1</b> cube before Guardian entry.
            </div>

            {showSyncGuardianStep ? (
              <div className="guardianCubeEntry">
                <div className="guardianCubeEntryLabel">EnergonCube ID</div>

                <input
                  className="guardianCubeEntryInput"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  autoFocus
                  value={guardianCubeIdInput}
                  disabled={syncDisabled}
                  placeholder="Enter Cube ID"
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, "");

                    setGuardianCubeIdInput(numericValue);
                    setGuardianCubeIdError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGuardianButton();
                    }
                  }}
                />

                <div className="guardianCubeEntryHelp">
                  Enter the ID of the one EnergonCube currently held by this
                  wallet. The EVault verifies ownership on-chain.
                </div>

                {guardianCubeIdError ? (
                  <div className="guardianCubeEntryError">
                    {guardianCubeIdError}
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              onClick={handleGuardianButton}
              disabled={isAccessGranted ? false : syncDisabled}
              type="button"
              className="guardianEntryButton"
              style={{
                border: isAccessGranted
                  ? "1px solid rgba(0,255,130,0.88)"
                  : showSyncGuardianStep &&
                      guardianEntryAuthorized &&
                      !syncDisabled
                    ? "1px solid rgba(100,190,255,0.96)"
                    : showSyncGuardianStep && !syncDisabled
                      ? "1px solid rgba(255,205,70,0.92)"
                      : "1px solid rgba(255,70,70,0.88)",

                background: isAccessGranted
                  ? "linear-gradient(180deg, rgba(0,190,85,0.92), rgba(0,95,45,0.92))"
                  : showSyncGuardianStep &&
                      guardianEntryAuthorized &&
                      !syncDisabled
                    ? "linear-gradient(180deg, rgba(35,145,255,0.98), rgba(0,70,180,0.96))"
                    : showSyncGuardianStep && !syncDisabled
                      ? "linear-gradient(180deg, rgba(255,176,0,0.96), rgba(170,85,0,0.94))"
                      : "linear-gradient(180deg, rgba(160,25,25,0.72), rgba(80,0,0,0.70))",

                boxShadow: isAccessGranted
                  ? "0 0 18px rgba(0,255,120,0.22)"
                  : showSyncGuardianStep &&
                      guardianEntryAuthorized &&
                      !syncDisabled
                    ? "0 0 22px rgba(40,150,255,0.42)"
                    : showSyncGuardianStep && !syncDisabled
                      ? "0 0 18px rgba(255,176,0,0.28)"
                      : "none",

                cursor:
                  syncDisabled && !isAccessGranted ? "not-allowed" : "pointer",

                opacity: syncDisabled && !isAccessGranted ? 0.65 : 1,
              }}
            >
              🛡 {buttonLabel}
            </button>
          </div>

          <div className="guardianChecklist">
            {checklistItem("□", "HOLD EXACTLY 1", "ENERGON CUBE", isCoherent)}

            {checklistItem(
              "▣",
              guardianAlreadySynced
                ? "GUARDIAN REGISTERED"
                : guardianEntryAuthorized
                  ? "VERIFICATION COMPLETE"
                  : "VERIFY GUARDIAN",
              guardianAlreadySynced
                ? "CUBE BINDING COMPLETE"
                : guardianEntryAuthorized
                  ? "READY TO SYNC"
                  : `AUTHORIZE ${feeText} FEE`,
              guardianEntryAuthorized || guardianAlreadySynced,
            )}

            {checklistItem(
              "◴",
              "WAIT 12 HOURS",
              "ACTIVATION DELAY",
              guardianActionsAllowed,
            )}

            {checklistItem(
              "☷",
              "THRESHOLD MET",
              `${count} / ${threshold} GUARDIANS`,
              guardianThresholdMet,
            )}
          </div>
        </div>
      </div>

      <div
        className="guardianStateBanner"
        style={{
          background: isCoherent
            ? "linear-gradient(90deg, rgba(0,110,80,0.20), rgba(0,0,0,0.18))"
            : isFractured
              ? "linear-gradient(90deg, rgba(120,0,0,0.26), rgba(0,0,0,0.18))"
              : "linear-gradient(90deg, rgba(120,70,0,0.24), rgba(0,0,0,0.18))",

          border: isCoherent
            ? "1px solid rgba(0,255,190,0.25)"
            : isFractured
              ? "1px solid rgba(255,80,80,0.38)"
              : "1px solid rgba(255,170,70,0.35)",
        }}
      >
        <div className="guardianStateIcon">
          {isCoherent ? "🛡" : isFractured ? "⚠" : "▧"}
        </div>

        <div className="guardianStateMode">
          {guardianStateLabel || "SILENT"} MODE
        </div>

        <div className="guardianStateMessage">
          {guardianStateMessage ||
            accessLockReason ||
            "Wallet holds 0 cubes. Guardian access is locked."}
        </div>

        <div className="guardianStateManual">
          {guardianActionsAllowed
            ? "✅ Manual Calls Open"
            : "🔒 Manual Calls Locked"}
        </div>
      </div>
    </>
  );
}

export default function ActionsPanel({
  ui,
  operationalReady,
  operationalMsg,

  modeUsdt,
  modeEon,

  approveUsdt0,
  setApproveUsdt0,

  approveEon,
  setApproveEon,

  commitUsdtIn,
  setCommitUsdtIn,

  commitEonIn,
  setCommitEonIn,

  usdt0Decimals,
  eonDecimals,

  maybeSyncApproveToCommit,

  canWrite,

  onSyncGuardian,
  onApproveUsdt0,
  onApproveEon,
  onCommitUsdtForEon,
  onCommitEonForUsdt0,

  quoteSupported,
  hasQuoteFns,

  v,

  formatUnitsSafe,

  projImpactBpsUsdtToEon,
  projImpactNoteUsdtToEon,

  projImpactBpsEonToUsdt,
  projImpactNoteEonToUsdt,

  fmtBps,

  impactTooHighEonToUsdt,
  impactNearLimitEonToUsdt,

  showMaxBefore25,
  maxEonSafeStr,
  maxEonBusy,
  maxEonNote,

  usdtFlowReady,
  eonFlowReady,

  accessLocked,
  accessLockReason,

  guardianStateLabel,
  guardianStateMessage,
  guardianActionsAllowed,

  guardianThresholdMet,
  guardianCount,
  guardianThreshold,
  guardianEntryAuthorized = false,
  guardianEntryButtonText = "Enter as Guardian",
  guardianAlreadySynced = false,
  syncFeeWflr = 1000000000000000000n,

  impactTooHighUsdtToEon = false,
  impactNearLimitUsdtToEon = false,
}) {
  const [usdtMaturityTier, setUsdtMaturityTier] = useState("0");
  const [eonMaturityTier, setEonMaturityTier] = useState("0");

  const walletKey =
    v?.connectedAddress || v?.address || v?.walletAddress || "unknown-wallet";

  const dismissStorageKey = `energon_access_granted_dismissed_${String(
    walletKey,
  ).toLowerCase()}`;

  const [accessGrantedDismissed, setAccessGrantedDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (guardianStateLabel !== "COHERENT" || !guardianActionsAllowed) {
      setAccessGrantedDismissed(false);

      try {
        window.localStorage.removeItem(dismissStorageKey);
      } catch {}

      return;
    }

    try {
      const saved = window.localStorage.getItem(dismissStorageKey);

      setAccessGrantedDismissed(saved === "true");
    } catch {
      setAccessGrantedDismissed(false);
    }
  }, [dismissStorageKey, guardianStateLabel, guardianActionsAllowed]);

  function dismissAccessGranted() {
    setAccessGrantedDismissed(true);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(dismissStorageKey, "true");
      } catch {}
    }
  }

  const accessGrantedBannerVisible =
    guardianActionsAllowed && !accessGrantedDismissed;

  const guardianLocked =
    accessGrantedBannerVisible ||
    accessLocked ||
    !guardianThresholdMet ||
    guardianStateLabel !== "COHERENT" ||
    !guardianActionsAllowed;

  useEffect(() => {
    if (!quoteSupported || !hasQuoteFns || guardianLocked) {
      return;
    }

    if (!String(commitUsdtIn || "").trim()) {
      return;
    }

    v?.quoteUsdt0ForEon?.(commitUsdtIn, Number(usdtMaturityTier));
  }, [
    quoteSupported,
    hasQuoteFns,
    guardianLocked,
    commitUsdtIn,
    usdtMaturityTier,
    v,
  ]);

  useEffect(() => {
    if (!quoteSupported || !hasQuoteFns || guardianLocked) {
      return;
    }

    if (!String(commitEonIn || "").trim()) {
      return;
    }

    v?.quoteEonForUsdt0?.(commitEonIn, Number(eonMaturityTier));
  }, [
    quoteSupported,
    hasQuoteFns,
    guardianLocked,
    commitEonIn,
    eonMaturityTier,
    v,
  ]);

  const usdtToEonImpactBps = toBigIntSafe(projImpactBpsUsdtToEon, 0n);

  const usdtToEonOverLimit =
    impactTooHighUsdtToEon || usdtToEonImpactBps >= 5000n;

  const usdtToEonNearLimit =
    impactNearLimitUsdtToEon ||
    (usdtToEonImpactBps >= 4500n && usdtToEonImpactBps < 5000n);

  const eonToUsdtImpactBps = toBigIntSafe(projImpactBpsEonToUsdt, 0n);

  const approveUsdt0Disabled =
    guardianLocked ||
    !operationalReady ||
    !canWrite ||
    !String(approveUsdt0 || "").trim();

  const approveEonDisabled =
    guardianLocked ||
    !operationalReady ||
    !canWrite ||
    !String(approveEon || "").trim();

  const executeUsdtDisabled =
    guardianLocked ||
    !operationalReady ||
    !canWrite ||
    !usdtFlowReady ||
    usdtToEonOverLimit;

  const executeEonDisabled =
    guardianLocked ||
    !operationalReady ||
    !canWrite ||
    !eonFlowReady ||
    impactTooHighEonToUsdt;

  return (
    <Panel title="Actions" subtitle="Manual calls">
      {!operationalReady ? (
        <div
          style={{
            ...ui.opLock,
            textAlign: "center",
          }}
        >
          {operationalMsg || "OPERATIONAL LOCK"}
        </div>
      ) : null}

      <BigGuardianLockBanner
        guardianThresholdMet={guardianThresholdMet}
        guardianCount={guardianCount}
        guardianThreshold={guardianThreshold}
        accessLockReason={accessLockReason}
        canWrite={canWrite}
        onSyncGuardian={onSyncGuardian}
        guardianStateLabel={guardianStateLabel}
        guardianStateMessage={guardianStateMessage}
        guardianActionsAllowed={guardianActionsAllowed}
        guardianEntryAuthorized={guardianEntryAuthorized}
        guardianEntryButtonText={guardianEntryButtonText}
        guardianAlreadySynced={guardianAlreadySynced}
        syncFeeWflr={syncFeeWflr}
        accessGrantedDismissed={accessGrantedDismissed}
        onDismissAccessGranted={dismissAccessGranted}
      />

      <div style={ui.flowGrid}>
        <div style={ui.flowCard}>
          <div style={ui.flowTitle}>USDT0 → EON</div>

          {modeUsdt === "APPROVE" ? (
            <>
              <input
                value={approveUsdt0}
                onChange={(e) => setApproveUsdt0(e.target.value)}
                placeholder="USDT0 amount"
                style={{
                  ...ui.input,
                  opacity: guardianLocked ? 0.7 : 1,
                }}
              />

              <button
                onClick={() => onApproveUsdt0(approveUsdt0)}
                style={{
                  ...ui.btnPrimary,

                  opacity: approveUsdt0Disabled ? 0.4 : 1,

                  cursor: approveUsdt0Disabled ? "not-allowed" : "pointer",
                }}
                disabled={approveUsdt0Disabled}
                type="button"
              >
                {guardianLocked ? "Locked" : "Approve USDT0"}
              </button>
            </>
          ) : (
            <>
              <input
                value={commitUsdtIn}
                onChange={(e) => {
                  const value = e.target.value;

                  setCommitUsdtIn(value);

                  maybeSyncApproveToCommit?.({
                    commitStr: value,
                    approveStr: approveUsdt0,
                    decimals: usdt0Decimals,
                    setApprove: setApproveUsdt0,
                  });
                }}
                placeholder="USDT0 in"
                style={{
                  ...ui.input,
                  opacity: guardianLocked ? 0.7 : 1,
                }}
              />

              <MaturitySelector
                ui={ui}
                value={usdtMaturityTier}
                setValue={setUsdtMaturityTier}
                locked={guardianLocked}
              />

              {quoteSupported &&
              hasQuoteFns &&
              String(commitUsdtIn || "").trim() ? (
                <ImpactLine
                  ui={ui}
                  label="Projected claim"
                  value={
                    v?.quoteUsdt0ToEon?.outNet != null
                      ? `${formatUnitsSafe(
                          v.quoteUsdt0ToEon.outNet,
                          eonDecimals,
                          6,
                        )} EON`
                      : "—"
                  }
                  loading={Boolean(v?.quoteLoading)}
                  error={v?.quoteError || ""}
                />
              ) : null}

              {String(commitUsdtIn || "").trim() && usdtToEonImpactBps > 0n ? (
                <div style={ui.footnote}>
                  Projected effective EON price move:{" "}
                  <b
                    style={
                      usdtToEonOverLimit
                        ? ui.redText
                        : usdtToEonNearLimit
                          ? ui.amberText
                          : undefined
                    }
                  >
                    {fmtBps(usdtToEonImpactBps)}
                  </b>
                  {projImpactNoteUsdtToEon ? (
                    <span
                      style={{
                        marginLeft: 8,
                        opacity: 0.75,
                      }}
                    >
                      {projImpactNoteUsdtToEon}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <button
                onClick={() =>
                  onCommitUsdtForEon(commitUsdtIn, Number(usdtMaturityTier))
                }
                style={{
                  ...ui.btnPrimary,

                  opacity: executeUsdtDisabled ? 0.25 : 1,

                  cursor: executeUsdtDisabled ? "not-allowed" : "pointer",

                  marginTop: 8,
                }}
                disabled={executeUsdtDisabled}
                type="button"
              >
                {guardianLocked ? "Execute Locked" : "Execute USDT0 Plasma"}
              </button>
            </>
          )}
        </div>

        <div style={ui.flowCard}>
          <div style={ui.flowTitle}>EON → USDT0</div>

          {modeEon === "APPROVE" ? (
            <>
              <input
                value={approveEon}
                onChange={(e) => setApproveEon(e.target.value)}
                placeholder="EON amount"
                style={{
                  ...ui.input,
                  opacity: guardianLocked ? 0.7 : 1,
                }}
              />

              <button
                onClick={() => onApproveEon(approveEon)}
                style={{
                  ...ui.btnPrimary,

                  opacity: approveEonDisabled ? 0.4 : 1,

                  cursor: approveEonDisabled ? "not-allowed" : "pointer",
                }}
                disabled={approveEonDisabled}
                type="button"
              >
                {guardianLocked ? "Locked" : "Approve EON"}
              </button>
            </>
          ) : (
            <>
              <input
                value={commitEonIn}
                onChange={(e) => {
                  const value = e.target.value;

                  setCommitEonIn(value);

                  maybeSyncApproveToCommit?.({
                    commitStr: value,
                    approveStr: approveEon,
                    decimals: eonDecimals,
                    setApprove: setApproveEon,
                  });
                }}
                placeholder="EON in"
                style={{
                  ...ui.input,
                  opacity: guardianLocked ? 0.7 : 1,
                }}
              />

              <MaturitySelector
                ui={ui}
                value={eonMaturityTier}
                setValue={setEonMaturityTier}
                locked={guardianLocked}
              />

              {quoteSupported &&
              hasQuoteFns &&
              String(commitEonIn || "").trim() ? (
                <ImpactLine
                  ui={ui}
                  label="Projected claim"
                  value={
                    v?.quoteEonToUsdt0?.outNet != null
                      ? `${formatUnitsSafe(
                          v.quoteEonToUsdt0.outNet,
                          usdt0Decimals,
                          6,
                        )} USDT0`
                      : "—"
                  }
                  loading={Boolean(v?.quoteLoading)}
                  error={v?.quoteError || ""}
                />
              ) : null}

              {String(commitEonIn || "").trim() ? (
                <div style={ui.footnote}>
                  Projected effective EON price move:{" "}
                  <b
                    style={
                      impactTooHighEonToUsdt
                        ? ui.redText
                        : impactNearLimitEonToUsdt
                          ? ui.amberText
                          : undefined
                    }
                  >
                    {fmtBps(eonToUsdtImpactBps)}
                  </b>
                  {projImpactNoteEonToUsdt ? (
                    <span
                      style={{
                        marginLeft: 8,
                        opacity: 0.75,
                      }}
                    >
                      {projImpactNoteEonToUsdt}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showMaxBefore25 ? (
                <div style={ui.maxRow}>
                  <div style={ui.footnote}>
                    Max before boundary:{" "}
                    <b>
                      {String(maxEonSafeStr || "").trim() ? maxEonSafeStr : "—"}
                    </b>
                    {maxEonBusy ? (
                      <span
                        style={{
                          marginLeft: 8,
                          opacity: 0.75,
                        }}
                      >
                        …
                      </span>
                    ) : null}
                    {maxEonNote ? (
                      <span
                        style={{
                          marginLeft: 8,
                          opacity: 0.75,
                        }}
                      >
                        {maxEonNote}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <button
                onClick={() =>
                  onCommitEonForUsdt0(commitEonIn, Number(eonMaturityTier))
                }
                style={{
                  ...ui.btnPrimary,

                  opacity: executeEonDisabled ? 0.25 : 1,

                  cursor: executeEonDisabled ? "not-allowed" : "pointer",

                  marginTop: 8,
                }}
                disabled={executeEonDisabled}
                type="button"
              >
                {guardianLocked ? "Execute Locked" : "Execute EON Plasma"}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          ...ui.footnote,
        }}
      >
        {guardianLocked
          ? `Manual calls remain locked until the wallet holds exactly one Cube, registers its current Cube ID, completes the 12-hour activation delay, and the distinct-Cube Guardian count reaches ${String(
              guardianThreshold ?? 250000,
            )}.`
          : "Approvals are required for token transfers during plasma submissions."}
      </div>
    </Panel>
  );
}

function formatHeight(v = "") {
    const n = Number(String(v || "").replace(/,/g, "").trim());
    if (!Number.isFinite(n)) return v || "UNKNOWN";
    return n.toLocaleString();
  }
  
  function protocolReading(ctx = {}) {
    return `PROTOCOL READING
  
  Guardian State:
  ${ctx.guardianState || "UNKNOWN"}
  
  Energon Height:
  ${formatHeight(ctx.energonHeight || "UNKNOWN")}
  
  Next Advancement:
  ${ctx.tickState || "UNKNOWN"}
  
  Burn State:
  ${ctx.burnState || "UNKNOWN"}
  
  Halving State:
  ${ctx.halvingState || "UNKNOWN"}
  
  Era:
  ${ctx.protocolEra || "UNKNOWN"}
  
  Q.O.R.I interprets.
  The contracts define state.
  
  _`;
  }
  
  export function protocolAssistant(input = "", ctx = {}) {
    return protocolReading(ctx);
  }
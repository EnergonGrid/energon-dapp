function normalize(input = "") {
    return String(input).toLowerCase().trim().replace(/\s+/g, " ");
  }
  
  function hasAny(q, words = []) {
    return words.some((word) => q === word || q.includes(word));
  }
  
  export function communityAssistant(input = "") {
    const q = normalize(input);
  
    if (hasAny(q, ["twitter", "x", "tweet", "post"])) {
      return `COMMUNITY ASSISTANT
  
  X post path detected.
  
  Recommended structure:
  
  1. One clear idea.
  2. No promises.
  3. Explain the rule.
  4. End with the Guardian line.
  
  Example:
  
  Energon does not ask belief.
  
  It asks observation.
  
  One wallet.
  One cube.
  One Guardian.
  
  _`;
    }
  
    if (hasAny(q, ["discord", "server", "channel"])) {
      return `DISCORD PATH
  
  Discord should stay simple.
  
  Recommended focus:
  
  • start-here
  • wallet setup
  • official links
  • guardian lounge
  • announcements
  • FAQ
  • grid status
  
  Keep the server clean.
  
  Too many channels create noise.
  
  _`;
    }
  
    if (hasAny(q, ["onboard", "new user", "new people", "explain"])) {
      return `ONBOARDING PATH
  
  Explain Energon in this order:
  
  1. Energon is the protocol.
  2. EnergonCube is the key.
  3. One cube creates coherent Guardian state.
  4. The Grid reveals protocol state.
  5. Q.O.R.I helps interpret the system.
  
  No hype.
  
  Rules first.
  
  _`;
    }
  
    if (hasAny(q, ["grow", "growth", "community", "followers", "users"])) {
      return `GROWTH PATH
  
  Growth without deception is slower.
  
  But it is cleaner.
  
  Teach.
  Document.
  Repeat.
  Show the system working.
  
  The right Guardians will understand the rule.
  
  One wallet.
  One cube.
  One Guardian.
  
  _`;
    }
  
    return `COMMUNITY MODE
  
  Q.O.R.I recommends clear signal:
  
  No promises.
  No hype.
  No pressure.
  
  Explain the rule.
  Show the system.
  Let understanding do the work.
  
  _`;
  }
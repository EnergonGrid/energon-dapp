function normalize(input = "") {
    return String(input).toLowerCase().trim().replace(/\s+/g, " ");
  }
  
  function hasAny(q, words = []) {
    return words.some((word) => q === word || q.includes(word));
  }
  
  export function explorerAssistant(input = "") {
    const q = normalize(input);
  
    if (
      hasAny(q, [
        "idea",
        "ideas",
        "concept",
        "what if",
        "future",
        "possibility",
        "imagine",
      ])
    ) {
      return `EXPLORER ASSISTANT
  
  Concept path detected.
  
  Q.O.R.I recommends:
  
  Observe the idea.
  Separate signal from noise.
  Write the rule first.
  Then design the interface.
  
  A good idea becomes stronger
  when it can survive structure.
  
  _`;
    }
  
    if (
      hasAny(q, [
        "discover",
        "explore",
        "curious",
        "learn more",
        "go deeper",
        "deeper",
      ])
    ) {
      return `DISCOVERY PATH
  
  Curiosity detected.
  
  Begin with questions:
  
  What is the rule?
  What changes state?
  Who can trigger it?
  What happens if nobody acts?
  What remains true over time?
  
  The Grid reveals itself through inquiry.
  
  _`;
    }
  
    if (
      hasAny(q, [
        "philosophy",
        "meaning",
        "purpose",
        "why",
        "mission",
        "vision",
      ])
    ) {
      return `PHILOSOPHY PATH
  
  Energon does not ask belief.
  
  It asks observation.
  
  A protocol is strongest
  when its meaning does not depend
  on one speaker.
  
  The rules must speak when the creator is silent.
  
  _`;
    }
  
    return `EXPLORER MODE
  
  Q.O.R.I is listening.
  
  Bring the idea forward.
  
  The first task is not to prove it.
  
  The first task is to observe it clearly.
  
  _`;
  }